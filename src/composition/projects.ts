import type { Logger } from "@/application/ports/logger";
import type { ProjectRepository } from "@/application/ports/project-repository";
import { createConsoleLogger } from "@/infrastructure/logging/logger";
import { getPrismaClient } from "@/infrastructure/persistence/prisma-client";
import { PrismaProjectRepository } from "@/infrastructure/persistence/prisma-project-repository";

/**
 * Composition root for the projects API.
 *
 * The single place that knows which concrete adapters exist. Route handlers
 * depend on this; nothing in `src/application/**` or `src/domain/**` may.
 *
 * Everything is **lazy**. Importing this module must not construct a Prisma
 * client, read `DATABASE_URL`, or touch the database — otherwise `next build`,
 * which imports route modules to collect page data, would need a live
 * database. The wiring happens when a request actually calls
 * `createProjectDependencies()`.
 *
 * There is no validation, business rule, error mapping, HTTP logic or query
 * here. It only builds objects and hands them over.
 */
export type ProjectDependencies = {
  repository: ProjectRepository;
  logger: Logger;
};

export function createProjectDependencies(
  correlationId: string,
): ProjectDependencies {
  return {
    repository: new PrismaProjectRepository(getPrismaClient()),
    logger: createConsoleLogger(correlationId),
  };
}
