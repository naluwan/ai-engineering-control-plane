import type { PrismaClient, Project as PrismaProject } from "@prisma/client";

import type {
  ListProjectsOptions,
  ProjectRepository,
} from "@/application/ports/project-repository";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/domain/project";

import { isRecordNotFoundError } from "@/infrastructure/persistence/prisma-client";

/**
 * Prisma implementation of the application-owned `ProjectRepository`.
 *
 * Prisma types appear in this file and nowhere outside it. The mapper below is
 * the boundary: everything above it speaks the domain's language.
 */

function toDomain(record: PrismaProject): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    repositoryUrl: record.repositoryUrl,
    stackSummary: record.stackSummary,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const record = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        stackSummary: input.stackSummary ?? null,
      },
    });

    return toDomain(record);
  }

  async findById(id: string): Promise<Project | null> {
    const record = await this.prisma.project.findUnique({ where: { id } });

    return record === null ? null : toDomain(record);
  }

  async list(options: ListProjectsOptions = {}): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
    });

    return records.map(toDomain);
  }

  async count(): Promise<number> {
    return this.prisma.project.count();
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    try {
      const record = await this.prisma.project.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          repositoryUrl: input.repositoryUrl,
          stackSummary: input.stackSummary,
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
      await this.prisma.project.delete({ where: { id } });

      return true;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }
}
