import { validationError } from "@/application/errors";
import type { ProjectRepository } from "@/application/ports/project-repository";
import { err, ok, type Result } from "@/application/result";
import { listProjectsQuerySchema } from "@/application/schemas/project";
import { toValidationDetails } from "@/application/use-cases/create-project";
import type { Project } from "@/domain/project";

export type ListProjectsResult = {
  projects: Project[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/**
 * Lists projects, one page at a time.
 *
 * The total comes from `repository.count()` rather than from the length of the
 * returned page — the page is a window, and its length says nothing about how
 * many rows exist behind it.
 *
 * A page beyond the end is not an error: it returns an empty array with the
 * real total, which is what lets a client recover by navigating back.
 */
export async function listProjects(
  repository: ProjectRepository,
  query: unknown,
): Promise<Result<ListProjectsResult>> {
  const parsed = listProjectsQuerySchema.safeParse(query);

  if (!parsed.success) {
    return err(
      validationError(
        "The project list could not be read because the query is invalid.",
        toValidationDetails(parsed.error),
      ),
    );
  }

  const { page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;

  const projects = await repository.list({ skip, take: pageSize });
  const total = await repository.count();

  return ok({
    projects,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
