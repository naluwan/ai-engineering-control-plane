import type { z } from "zod";

import { validationError, type AppErrorDetail } from "@/application/errors";
import type { ProjectRepository } from "@/application/ports/project-repository";
import { err, ok, type Result } from "@/application/result";
import { createProjectRequestSchema } from "@/application/schemas/project";
import type { Project } from "@/domain/project";

/**
 * Converts Zod issues into client-safe field errors.
 *
 * Only the path and the message cross the boundary — never the rejected value,
 * which is user input and could be anything.
 */
export function toValidationDetails(error: z.ZodError): AppErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Creates a project.
 *
 * Validation failure is an expected outcome and comes back as a `Result`. A
 * repository failure is *not* handled here: it propagates so the HTTP boundary
 * can log it and return a generic `INTERNAL_ERROR`. Catching it here would
 * turn "the database is unreachable" into "your request was invalid", which is
 * both wrong and unactionable.
 */
export async function createProject(
  repository: ProjectRepository,
  input: unknown,
): Promise<Result<Project>> {
  const parsed = createProjectRequestSchema.safeParse(input);

  if (!parsed.success) {
    return err(
      validationError(
        "The project could not be created because the request is invalid.",
        toValidationDetails(parsed.error),
      ),
    );
  }

  const project = await repository.create({
    name: parsed.data.name,
    description: parsed.data.description,
    repositoryUrl: parsed.data.repositoryUrl,
  });

  return ok(project);
}
