import type {
  PrismaClient,
  Requirement as PrismaRequirement,
} from "@prisma/client";

import type {
  ListRequirementsOptions,
  RequirementRepository,
} from "@/application/ports/requirement-repository";
import type {
  CreateRequirementInput,
  Requirement,
  UpdateRequirementInput,
} from "@/domain/requirement";
import {
  requirementSourceTypeSchema,
  requirementStatusSchema,
} from "@/domain/requirement";

import { isRecordNotFoundError } from "@/infrastructure/persistence/prisma-client";

/**
 * Prisma implementation of the application-owned `RequirementRepository`.
 *
 * The two enum columns are parsed through the domain schemas rather than cast.
 * A cast would compile even if the database and the domain drifted apart; the
 * parse fails loudly, which is the point.
 */

function toDomain(record: PrismaRequirement): Requirement {
  return {
    id: record.id,
    projectId: record.projectId,
    sourceType: requirementSourceTypeSchema.parse(record.sourceType),
    rawText: record.rawText,
    status: requirementStatusSchema.parse(record.status),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaRequirementRepository implements RequirementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateRequirementInput): Promise<Requirement> {
    const record = await this.prisma.requirement.create({
      data: {
        projectId: input.projectId,
        rawText: input.rawText,
        sourceType: input.sourceType,
        status: input.status,
      },
    });

    return toDomain(record);
  }

  async findById(id: string): Promise<Requirement | null> {
    const record = await this.prisma.requirement.findUnique({ where: { id } });

    return record === null ? null : toDomain(record);
  }

  async listByProjectId(
    projectId: string,
    options: ListRequirementsOptions = {},
  ): Promise<Requirement[]> {
    const records = await this.prisma.requirement.findMany({
      where: { projectId },
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
    });

    return records.map(toDomain);
  }

  async update(
    id: string,
    input: UpdateRequirementInput,
  ): Promise<Requirement | null> {
    try {
      const record = await this.prisma.requirement.update({
        where: { id },
        data: {
          rawText: input.rawText,
          sourceType: input.sourceType,
          status: input.status,
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
      await this.prisma.requirement.delete({ where: { id } });

      return true;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }
}
