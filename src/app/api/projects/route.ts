import { createProjectDependencies } from "@/composition/projects";
import {
  handleCreateProject,
  handleListProjects,
} from "@/infrastructure/http/project-handlers";

/**
 * `/api/projects`
 *
 * Prisma requires Node APIs, so this route is pinned to the Node runtime
 * rather than being eligible for the Edge runtime.
 *
 * This module imports no persistence: the concrete repository is built by the
 * composition root's factory, which the handler invokes **inside** its guard.
 * Nothing that can fail — environment validation, Prisma client construction —
 * runs out here, where a throw would bypass the `INTERNAL_ERROR` contract, the
 * correlation id and the structured log.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const correlationId = crypto.randomUUID();

  return handleCreateProject(request, {
    ...createProjectDependencies(correlationId),
    correlationId,
  });
}

export async function GET(request: Request): Promise<Response> {
  const correlationId = crypto.randomUUID();

  return handleListProjects(request, {
    ...createProjectDependencies(correlationId),
    correlationId,
  });
}
