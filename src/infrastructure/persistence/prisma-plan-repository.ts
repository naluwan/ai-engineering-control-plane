import { Prisma } from "@prisma/client";
import type { PrismaClient, Plan as PrismaPlan } from "@prisma/client";

import type {
  ListPlansOptions,
  PlanRepository,
} from "@/application/ports/plan-repository";
import type { CreatePlanInput, Plan, UpdatePlanInput } from "@/domain/plan";
import { jsonValueSchema, type JsonValue } from "@/domain/json";

import { isRecordNotFoundError } from "@/infrastructure/persistence/prisma-client";

/**
 * Prisma implementation of the application-owned `PlanRepository`.
 *
 * The JSON column is where a Prisma type would most easily escape, so the
 * conversion runs in both directions explicitly:
 *
 * - Reading, `Prisma.JsonValue` is parsed through the domain's own
 *   `jsonValueSchema`. That is a validated conversion, not a cast: if the
 *   stored value is not something JSON can represent, it fails here rather
 *   than surfacing as a confusing type error somewhere upstream.
 * - Writing, a domain `null` becomes `Prisma.JsonNull`, because a Prisma JSON
 *   column distinguishes the JSON value `null` from SQL `NULL`, and this
 *   column is not nullable.
 */

function toDomain(record: PrismaPlan): Plan {
  return {
    id: record.id,
    requirementId: record.requirementId,
    schemaVersion: record.schemaVersion,
    content: jsonValueSchema.parse(record.content),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPrismaJson(
  content: JsonValue,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return content === null ? Prisma.JsonNull : content;
}

export class PrismaPlanRepository implements PlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePlanInput): Promise<Plan> {
    const record = await this.prisma.plan.create({
      data: {
        requirementId: input.requirementId,
        schemaVersion: input.schemaVersion,
        content: toPrismaJson(input.content),
      },
    });

    return toDomain(record);
  }

  async findById(id: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { id } });

    return record === null ? null : toDomain(record);
  }

  async findByRequirementId(requirementId: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({
      where: { requirementId },
    });

    return record === null ? null : toDomain(record);
  }

  async list(options: ListPlansOptions = {}): Promise<Plan[]> {
    const records = await this.prisma.plan.findMany({
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
    });

    return records.map(toDomain);
  }

  async update(id: string, input: UpdatePlanInput): Promise<Plan | null> {
    try {
      const record = await this.prisma.plan.update({
        where: { id },
        data: {
          schemaVersion: input.schemaVersion,
          content:
            input.content === undefined ? undefined : toPrismaJson(input.content),
        },
      });

      return toDomain(record);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.plan.delete({ where: { id } });

      return true;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }
}
