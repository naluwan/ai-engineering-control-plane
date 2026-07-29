import { internalError, validationError } from "@/application/errors";
import type { Logger } from "@/application/ports/logger";
import type { ProjectRepository } from "@/application/ports/project-repository";
import {
  toProjectResponse,
  type PaginationResponse,
  type ProjectResponse,
} from "@/application/schemas/project";
import { createProject } from "@/application/use-cases/create-project";
import { getProjectById } from "@/application/use-cases/get-project-by-id";
import { listProjects } from "@/application/use-cases/list-projects";
import {
  errorResponse,
  successResponse,
} from "@/infrastructure/http/error-response";

/**
 * HTTP boundary for the projects API.
 *
 * The handlers live here rather than inside `route.ts` because they take their
 * dependencies as an argument, which is what lets an integration test drive
 * them against the test database. A Next.js route module's exports are
 * constrained to the HTTP verbs, so it cannot also expose an injectable form.
 *
 * Every request outcome — success, validation failure, malformed body, not
 * found, unexpected failure — emits exactly one structured log carrying
 * `event`, `correlationId`, `method`, `path` and `statusCode`. A log that only
 * describes the successful path is the one you cannot use during an incident.
 *
 * This is also the only layer that converts an unexpected throw into a
 * response: the error is logged (the logger redacts it) and answered with a
 * generic `INTERNAL_ERROR`.
 */

export type ProjectHandlerDependencies = {
  repository: ProjectRepository;
  logger: Logger;
  correlationId: string;
};

type SuccessBody<T> = { data: T };
type ListBody = { data: ProjectResponse[]; pagination: PaginationResponse };

/** The request facts every log line for this outcome must carry. */
type RequestScope = {
  event: string;
  method: string;
  path: string;
};

function scopeFromRequest(request: Request, event: string): RequestScope {
  return {
    event,
    method: request.method,
    // Pathname only: a query string can carry a token, and the body never
    // belongs in a log at all.
    path: new URL(request.url).pathname,
  };
}

/**
 * Logs one completed request and returns its response.
 *
 * Status is read from the response rather than passed separately, so the
 * logged status cannot drift from the one actually sent.
 */
function complete(
  deps: ProjectHandlerDependencies,
  scope: RequestScope,
  message: string,
  response: Response,
  extra: Record<string, unknown> = {},
): Response {
  const level = response.status >= 500 ? "error" : "info";

  deps.logger[level](message, {
    ...scope,
    correlationId: deps.correlationId,
    statusCode: response.status,
    ...extra,
  });

  return response;
}

/** Runs a handler, converting any unexpected throw into a logged, safe 500. */
async function guard(
  deps: ProjectHandlerDependencies,
  scope: RequestScope,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    // The logger redacts the error's message and stack; only the correlation
    // id links the client's response to this line.
    return complete(
      deps,
      scope,
      "Unhandled failure while serving a request",
      errorResponse(internalError(), deps.correlationId),
      { error },
    );
  }
}

/** Reads a JSON body, treating malformed JSON as a client error, not a crash. */
async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

export async function handleCreateProject(
  request: Request,
  deps: ProjectHandlerDependencies,
): Promise<Response> {
  const scope = scopeFromRequest(request, "projects.create");

  return guard(deps, scope, async () => {
    const body = await readJsonBody(request);

    if (!body.ok) {
      return complete(
        deps,
        scope,
        "Rejected a request with a malformed JSON body",
        errorResponse(
          validationError("The request body is not valid JSON."),
          deps.correlationId,
        ),
        { code: "VALIDATION_ERROR" },
      );
    }

    const result = await createProject(deps.repository, body.value);

    if (!result.ok) {
      return complete(
        deps,
        scope,
        "Rejected an invalid create-project request",
        errorResponse(result.error, deps.correlationId),
        { code: result.error.code },
      );
    }

    const project = toProjectResponse(result.data);
    const responseBody: SuccessBody<ProjectResponse> = { data: project };

    return complete(
      deps,
      scope,
      "Created a project",
      successResponse(responseBody, deps.correlationId, {
        status: 201,
        headers: { location: `/api/projects/${project.id}` },
      }),
      { projectId: project.id },
    );
  });
}

export async function handleListProjects(
  request: Request,
  deps: ProjectHandlerDependencies,
): Promise<Response> {
  const scope = scopeFromRequest(request, "projects.list");

  return guard(deps, scope, async () => {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());

    const result = await listProjects(deps.repository, query);

    if (!result.ok) {
      return complete(
        deps,
        scope,
        "Rejected an invalid list-projects query",
        errorResponse(result.error, deps.correlationId),
        { code: result.error.code },
      );
    }

    const responseBody: ListBody = {
      data: result.data.projects.map(toProjectResponse),
      pagination: {
        page: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total,
        totalPages: result.data.totalPages,
      },
    };

    return complete(
      deps,
      scope,
      "Listed projects",
      successResponse(responseBody, deps.correlationId),
      {
        page: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total,
      },
    );
  });
}

/**
 * Builds the request path for the by-id route.
 *
 * The route module passes only the identifier, so the path is reconstructed
 * from it. A non-string or empty id — the shapes that produce a 400 — falls
 * back to the route template rather than interpolating whatever arrived.
 */
function pathForProjectId(id: unknown): string {
  return typeof id === "string" && id.trim().length > 0
    ? `/api/projects/${id}`
    : "/api/projects/[id]";
}

export async function handleGetProjectById(
  id: unknown,
  deps: ProjectHandlerDependencies,
): Promise<Response> {
  const scope: RequestScope = {
    event: "projects.get",
    method: "GET",
    path: pathForProjectId(id),
  };

  return guard(deps, scope, async () => {
    const result = await getProjectById(deps.repository, id);

    if (!result.ok) {
      return complete(
        deps,
        scope,
        "Could not read a project",
        errorResponse(result.error, deps.correlationId),
        { code: result.error.code },
      );
    }

    const responseBody: SuccessBody<ProjectResponse> = {
      data: toProjectResponse(result.data),
    };

    return complete(
      deps,
      scope,
      "Read a project",
      successResponse(responseBody, deps.correlationId),
      { projectId: result.data.id },
    );
  });
}
