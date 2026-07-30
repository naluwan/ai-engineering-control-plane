import { notFoundError, validationError } from "@/application/errors";
import type { ProjectRepository } from "@/application/ports/project-repository";
import { err, ok, type Result } from "@/application/result";
import { projectIdSchema } from "@/application/schemas/project";
import { toValidationDetails } from "@/application/use-cases/create-project";
import type { Project } from "@/domain/project";

/**
 * Reads one project by id.
 *
 * A missing project returns the same `NOT_FOUND` whether it was deleted or
 * never existed. Distinguishing the two would tell a caller which identifiers
 * were once real, which is information the API has no reason to give away.
 *
 * A repository failure propagates; it is not converted into `NOT_FOUND`.
 */
export async function getProjectById(
  repository: ProjectRepository,
  id: unknown,
): Promise<Result<Project>> {
  const parsed = projectIdSchema.safeParse(id);

  if (!parsed.success) {
    return err(
      validationError(
        "The project could not be read because the identifier is invalid.",
        toValidationDetails(parsed.error),
      ),
    );
  }

  const project = await repository.findById(parsed.data);

  if (project === null) {
    return err(notFoundError("Project not found."));
  }

  return ok(project);
}
