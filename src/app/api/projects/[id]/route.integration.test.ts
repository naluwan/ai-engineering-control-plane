import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "@/application/ports/logger";
import type { ProjectRepository } from "@/application/ports/project-repository";
import {
  handleGetProjectById,
  type ProjectHandlerDependencies,
} from "@/infrastructure/http/project-handlers";
import { createStructuredLogger } from "@/infrastructure/logging/logger";
import { PrismaProjectRepository } from "@/infrastructure/persistence/prisma-project-repository";
import {
  disconnectTestPrismaClient,
  getTestPrismaClient,
  resetTestDatabase,
} from "@/test/database";

/**
 * The bootstrap-failure suite at the bottom invokes the route export itself,
 * with the composition root's dependency factory mocked, to prove that a
 * dependency-initialisation failure is caught by the same guard as everything
 * else.
 */
const { compositionMock } = vi.hoisted(() => ({
  compositionMock: { createProjectDependencies: vi.fn() },
}));

vi.mock("@/composition/projects", () => compositionMock);

const prisma = getTestPrismaClient();
const repository = new PrismaProjectRepository(prisma);

const CORRELATION_ID = "corr-integration-id";
const UNKNOWN_ID = "clv0000000000000000000000";
const SECRET_URL = "postgresql://acp:s3cr3t_pw@db.internal:5432/acp_dev";

let logLines: string[];

function testLogger(): Logger {
  return createStructuredLogger({ write: (line) => logLines.push(line) });
}

function deps(
  overrides: Partial<ProjectHandlerDependencies> = {},
): ProjectHandlerDependencies {
  return {
    createRepository: () => repository,
    logger: testLogger(),
    correlationId: CORRELATION_ID,
    ...overrides,
  };
}

/** A repository whose named method throws, standing in for an outage. */
function failingRepository(
  method: keyof ProjectRepository,
  message: string,
): ProjectRepository {
  return {
    ...repository,
    [method]: () => {
      throw new Error(message);
    },
  } as unknown as ProjectRepository;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses the single request-outcome log line and asserts on its fields. */
function parseOutcomeLog(): Record<string, unknown> {
  expect(logLines.length).toBeGreaterThan(0);

  const parsed: unknown = JSON.parse(logLines[logLines.length - 1] ?? "");

  expect(isRecord(parsed)).toBe(true);

  return isRecord(parsed) ? parsed : {};
}

beforeEach(async () => {
  logLines = [];
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await disconnectTestPrismaClient();
});

describe("GET /api/projects/[id]", () => {
  it("returns 200 for an existing project", async () => {
    const created = await repository.create({ name: "Findable" });

    const response = await handleGetProjectById(() => created.id, deps());
    const body = (await response.json()) as {
      data: { id: string; name: string; createdAt: string };
    };

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(created.id);
    expect(body.data.name).toBe("Findable");
    expect(body.data.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("wraps the project under a data key", async () => {
    const created = await repository.create({ name: "Findable" });

    const response = await handleGetProjectById(() => created.id, deps());
    const body = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(body)).toEqual(["data"]);
  });

  it("returns 404 for an unknown project", async () => {
    const response = await handleGetProjectById(() => UNKNOWN_ID, deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns the same 404 for a deleted project as for one that never existed", async () => {
    const created = await repository.create({ name: "Doomed" });
    await repository.delete(created.id);

    const deleted = await handleGetProjectById(() => created.id, deps());
    const neverExisted = await handleGetProjectById(() => UNKNOWN_ID, deps());

    expect(deleted.status).toBe(neverExisted.status);
    expect(await deleted.json()).toEqual(await neverExisted.json());
  });

  it("returns 400 for an empty id", async () => {
    const response = await handleGetProjectById(() => "   ", deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("uses the same error shape as every other endpoint", async () => {
    const response = await handleGetProjectById(() => UNKNOWN_ID, deps());
    const body = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual(["correlationId", "error"]);
    expect(body.correlationId).toBe(CORRELATION_ID);
  });

  it("sets the x-correlation-id header", async () => {
    const response = await handleGetProjectById(() => UNKNOWN_ID, deps());

    expect(response.headers.get("x-correlation-id")).toBe(CORRELATION_ID);
  });

  describe("when the repository fails unexpectedly", () => {
    const failing = failingRepository("findById", `PrismaClientInitializationError: cannot reach ${SECRET_URL}\n    at read (/app/src/db.ts:22:9)`);

    it("returns 500 with a generic INTERNAL_ERROR, not 404", async () => {
      const response = await handleGetProjectById(() => UNKNOWN_ID,
        deps({ createRepository: () => failing }),
      );
      const body = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("leaks no Prisma detail, stack trace or credential to the client", async () => {
      const response = await handleGetProjectById(() => UNKNOWN_ID,
        deps({ createRepository: () => failing }),
      );
      const text = await response.text();

      expect(text).not.toMatch(/prisma/i);
      expect(text).not.toContain("s3cr3t_pw");
      expect(text).not.toContain("postgresql://");
      expect(text).not.toMatch(/at read \(/);
    });

    it("leaks no credential into the log either", async () => {
      await handleGetProjectById(() => UNKNOWN_ID, deps({ createRepository: () => failing }));

      expect(logLines.join("\n")).not.toContain("s3cr3t_pw");
    });
  });
});

describe("GET /api/projects/[id] — request log metadata", () => {
  it("records method, the actual project path, statusCode and correlationId on success", async () => {
    const created = await repository.create({ name: "Findable" });

    await handleGetProjectById(() => created.id, deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.get",
      method: "GET",
      path: `/api/projects/${created.id}`,
      statusCode: 200,
      correlationId: CORRELATION_ID,
    });
  });

  it("records statusCode 404 for an unknown project", async () => {
    await handleGetProjectById(() => UNKNOWN_ID, deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.get",
      method: "GET",
      path: `/api/projects/${UNKNOWN_ID}`,
      statusCode: 404,
    });
  });

  it("records statusCode 400 for an invalid id, falling back to the route template", async () => {
    await handleGetProjectById(() => "   ", deps());

    expect(parseOutcomeLog()).toMatchObject({
      method: "GET",
      path: "/api/projects/[id]",
      statusCode: 400,
    });
  });

  it("records statusCode 500 on an unexpected failure, with no credential", async () => {
    const failing = failingRepository("findById", `cannot reach ${SECRET_URL}`);

    await handleGetProjectById(() => UNKNOWN_ID, deps({ createRepository: () => failing }));

    const parsed = parseOutcomeLog();

    expect(parsed).toMatchObject({
      event: "projects.get",
      method: "GET",
      statusCode: 500,
      correlationId: CORRELATION_ID,
    });
    expect(JSON.stringify(parsed)).not.toContain("s3cr3t_pw");
  });

  it("emits exactly one outcome log per request", async () => {
    await handleGetProjectById(() => UNKNOWN_ID, deps());

    expect(logLines).toHaveLength(1);
  });
});

/**
 * ROUTE-C01 — dependency initialisation and dynamic-param resolution must both
 * be inside the guard. This invokes the real route export.
 */
describe("route export — dependency bootstrap failure", () => {
  const BOOTSTRAP_ERROR = `EnvironmentValidationError: DATABASE_URL rejected — ${SECRET_URL}\n    at loadAppEnv (/app/src/env.ts:12:11)`;

  let repositoryFactory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repositoryFactory = vi.fn(() => {
      throw new Error(BOOTSTRAP_ERROR);
    });

    compositionMock.createProjectDependencies.mockReset();
    compositionMock.createProjectDependencies.mockImplementation(() => ({
      logger: testLogger(),
      createRepository: repositoryFactory,
    }));
  });

  it("returns a guarded 500 when the repository factory throws", async () => {
    const { GET } = await import("@/app/api/projects/[id]/route");

    const response = await GET(
      new Request(`http://localhost/api/projects/${UNKNOWN_ID}`),
      { params: Promise.resolve({ id: UNKNOWN_ID }) },
    );

    expect(response.status).toBe(500);

    const header = response.headers.get("x-correlation-id");
    const body = (await response.json()) as {
      error: { code: string; message: string };
      correlationId: string;
    };

    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred.");
    expect(body.correlationId).toBe(header);

    expect(logLines).toHaveLength(1);

    const parsed: unknown = JSON.parse(logLines[0] ?? "");

    expect(isRecord(parsed)).toBe(true);
    expect(parsed).toMatchObject({
      level: "error",
      event: "projects.get",
      method: "GET",
      statusCode: 500,
      correlationId: header,
    });

    expect(JSON.stringify(body)).not.toContain("s3cr3t_pw");
    expect(logLines[0]).not.toContain("s3cr3t_pw");
  });

  it("returns a guarded 500 when resolving the dynamic params throws", async () => {
    compositionMock.createProjectDependencies.mockImplementation(() => ({
      logger: testLogger(),
      createRepository: () => repository,
    }));

    const { GET } = await import("@/app/api/projects/[id]/route");

    const response = await GET(
      new Request(`http://localhost/api/projects/${UNKNOWN_ID}`),
      {
        params: Promise.reject(
          new Error(`params resolution failed — ${SECRET_URL}`),
        ),
      },
    );

    expect(response.status).toBe(500);

    const body = (await response.json()) as { error: { code: string } };

    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(logLines).toHaveLength(1);
    expect(JSON.parse(logLines[0] ?? "")).toMatchObject({
      event: "projects.get",
      method: "GET",
      statusCode: 500,
    });
    expect(logLines[0]).not.toContain("s3cr3t_pw");
  });

  it("does not continue into the repository query after a bootstrap failure", async () => {
    const { GET } = await import("@/app/api/projects/[id]/route");

    await GET(new Request(`http://localhost/api/projects/${UNKNOWN_ID}`), {
      params: Promise.resolve({ id: UNKNOWN_ID }),
    });

    expect(repositoryFactory).toHaveBeenCalledTimes(1);
  });
});
