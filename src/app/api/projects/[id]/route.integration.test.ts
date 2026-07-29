import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { Logger } from "@/application/ports/logger";
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

const prisma = getTestPrismaClient();
const repository = new PrismaProjectRepository(prisma);

const CORRELATION_ID = "corr-integration-id";
const UNKNOWN_ID = "clv0000000000000000000000";
const SECRET_URL = "postgresql://acp:s3cr3t_pw@db.internal:5432/acp_dev";

let logLines: string[];

function deps(
  overrides: Partial<ProjectHandlerDependencies> = {},
): ProjectHandlerDependencies {
  const logger: Logger = createStructuredLogger({
    write: (line) => logLines.push(line),
  });

  return { repository, logger, correlationId: CORRELATION_ID, ...overrides };
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

    const response = await handleGetProjectById(created.id, deps());
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

    const response = await handleGetProjectById(created.id, deps());
    const body = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(body)).toEqual(["data"]);
  });

  it("returns 404 for an unknown project", async () => {
    const response = await handleGetProjectById(UNKNOWN_ID, deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns the same 404 for a deleted project as for one that never existed", async () => {
    const created = await repository.create({ name: "Doomed" });
    await repository.delete(created.id);

    const deleted = await handleGetProjectById(created.id, deps());
    const neverExisted = await handleGetProjectById(UNKNOWN_ID, deps());

    expect(deleted.status).toBe(neverExisted.status);
    expect(await deleted.json()).toEqual(await neverExisted.json());
  });

  it("returns 400 for an empty id", async () => {
    const response = await handleGetProjectById("   ", deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("uses the same error shape as every other endpoint", async () => {
    const response = await handleGetProjectById(UNKNOWN_ID, deps());
    const body = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual(["correlationId", "error"]);
    expect(body.correlationId).toBe(CORRELATION_ID);
  });

  it("sets the x-correlation-id header", async () => {
    const response = await handleGetProjectById(UNKNOWN_ID, deps());

    expect(response.headers.get("x-correlation-id")).toBe(CORRELATION_ID);
  });

  describe("when the repository fails unexpectedly", () => {
    const failing = {
      ...repository,
      findById: () => {
        throw new Error(
          `PrismaClientInitializationError: cannot reach ${SECRET_URL}\n    at read (/app/src/db.ts:22:9)`,
        );
      },
    } as unknown as typeof repository;

    it("returns 500 with a generic INTERNAL_ERROR, not 404", async () => {
      const response = await handleGetProjectById(
        UNKNOWN_ID,
        deps({ repository: failing }),
      );
      const body = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("leaks no Prisma detail, stack trace or credential to the client", async () => {
      const response = await handleGetProjectById(
        UNKNOWN_ID,
        deps({ repository: failing }),
      );
      const text = await response.text();

      expect(text).not.toMatch(/prisma/i);
      expect(text).not.toContain("s3cr3t_pw");
      expect(text).not.toContain("postgresql://");
      expect(text).not.toMatch(/at read \(/);
    });

    it("leaks no credential into the log either", async () => {
      await handleGetProjectById(UNKNOWN_ID, deps({ repository: failing }));

      expect(logLines.join("\n")).not.toContain("s3cr3t_pw");
    });
  });
});

describe("GET /api/projects/[id] — request log metadata", () => {
  it("records method, the actual project path, statusCode and correlationId on success", async () => {
    const created = await repository.create({ name: "Findable" });

    await handleGetProjectById(created.id, deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.get",
      method: "GET",
      path: `/api/projects/${created.id}`,
      statusCode: 200,
      correlationId: CORRELATION_ID,
    });
  });

  it("records statusCode 404 for an unknown project", async () => {
    await handleGetProjectById(UNKNOWN_ID, deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.get",
      method: "GET",
      path: `/api/projects/${UNKNOWN_ID}`,
      statusCode: 404,
    });
  });

  it("records statusCode 400 for an invalid id, falling back to the route template", async () => {
    await handleGetProjectById("   ", deps());

    expect(parseOutcomeLog()).toMatchObject({
      method: "GET",
      path: "/api/projects/[id]",
      statusCode: 400,
    });
  });

  it("records statusCode 500 on an unexpected failure, with no credential", async () => {
    const failing = {
      ...repository,
      findById: () => {
        throw new Error(`cannot reach ${SECRET_URL}`);
      },
    } as unknown as typeof repository;

    await handleGetProjectById(UNKNOWN_ID, deps({ repository: failing }));

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
    await handleGetProjectById(UNKNOWN_ID, deps());

    expect(logLines).toHaveLength(1);
  });
});
