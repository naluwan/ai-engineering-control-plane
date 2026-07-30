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
 * Two levels of laziness, for two different reasons:
 *
 * 1. **Import time** does nothing at all — no Prisma client, no environment
 *    read, no query — so `next build`, which imports route modules to collect
 *    page data, stays independent of a live database.
 *
 * 2. **`createRepository` is returned unexecuted.** Building the repository
 *    reads and validates `DATABASE_URL` and constructs a Prisma client, either
 *    of which can throw. If that ran here, the throw would happen before the
 *    handler's guard and escape it: no `INTERNAL_ERROR` body, no correlation
 *    id, no structured log. The factory is therefore invoked inside the
 *    guarded boundary instead.
 *
 * The logger is built eagerly and deliberately: it reads no environment and
 * touches no database, so it cannot fail — and the guard needs a logger to
 * report a bootstrap failure with.
 *
 * There is no validation, business rule, error mapping, HTTP logic or query
 * here. It only builds objects and hands them over.
 */
export type ProjectDependencies = {
  /** Unexecuted. Invoked only inside the guarded route boundary. */
  createRepository: () => ProjectRepository;
  logger: Logger;
};

export function createProjectDependencies(
  correlationId: string,
): ProjectDependencies {
  return {
    createRepository: () => new PrismaProjectRepository(getPrismaClient()),
    logger: createConsoleLogger(correlationId),
  };
}
