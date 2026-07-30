import { createProjectDependencies } from "@/composition/projects";
import { handleGetProjectById } from "@/infrastructure/http/project-handlers";

/**
 * `/api/projects/[id]`
 *
 * Pinned to the Node runtime for the same reason as the collection route.
 *
 * `context.params` is passed as a thunk rather than awaited here: resolving it
 * can reject, and that failure has to be caught by the handler's guard so it
 * produces the same `INTERNAL_ERROR` response, correlation id and structured
 * log as every other failure.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const correlationId = crypto.randomUUID();

  return handleGetProjectById(async () => (await context.params).id, {
    ...createProjectDependencies(correlationId),
    correlationId,
  });
}
