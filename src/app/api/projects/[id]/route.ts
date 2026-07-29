import { createProjectDependencies } from "@/composition/projects";
import { handleGetProjectById } from "@/infrastructure/http/project-handlers";

/**
 * `/api/projects/[id]`
 *
 * Pinned to the Node runtime for the same reason as the collection route.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const { id } = await context.params;

  return handleGetProjectById(id, {
    ...createProjectDependencies(correlationId),
    correlationId,
  });
}
