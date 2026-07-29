import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { Logger } from "@/application/ports/logger";
import {
  handleCreateProject,
  handleListProjects,
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
 * Route integration tests.
 *
 * These drive the real HTTP boundary against the real TEST database through
 * the same `PrismaProjectRepository` production uses. Prisma is not mocked —
 * mocking it would prove nothing about the schema, the mapping, or the error
 * paths that matter here.
 */

const prisma = getTestPrismaClient();
const repository = new PrismaProjectRepository(prisma);

const CORRELATION_ID = "corr-integration";
const SECRET_URL = "postgresql://acp:s3cr3t_pw@db.internal:5432/acp_dev";

let logLines: string[];

function deps(overrides: Partial<ProjectHandlerDependencies> = {}): ProjectHandlerDependencies {
  const logger: Logger = createStructuredLogger({
    write: (line) => logLines.push(line),
  });

  return {
    repository,
    logger,
    correlationId: CORRELATION_ID,
    ...overrides,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the single request-outcome log line.
 *
 * The assertions below read fields off the parsed object rather than doing a
 * substring match: `expect(line).toContain("201")` would also pass if 201
 * appeared inside an unrelated identifier.
 */
function parseOutcomeLog(): Record<string, unknown> {
  expect(logLines.length).toBeGreaterThan(0);

  const parsed: unknown = JSON.parse(logLines[logLines.length - 1] ?? "");

  expect(isRecord(parsed)).toBe(true);

  return isRecord(parsed) ? parsed : {};
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/projects${query}`);
}

beforeEach(async () => {
  logLines = [];
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await disconnectTestPrismaClient();
});

describe("POST /api/projects", () => {
  it("returns 201 for a valid body", async () => {
    const response = await handleCreateProject(
      postRequest({ name: "Slice" }),
      deps(),
    );

    expect(response.status).toBe(201);
  });

  it("persists the project to the real test database", async () => {
    await handleCreateProject(postRequest({ name: "Persisted" }), deps());

    const stored = await prisma.project.findMany();

    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe("Persisted");
  });

  it("returns the created project under a data key", async () => {
    const response = await handleCreateProject(
      postRequest({
        name: "Slice",
        description: "A description.",
        repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
      }),
      deps(),
    );
    const body = (await response.json()) as {
      data: Record<string, unknown>;
    };

    expect(Object.keys(body)).toEqual(["data"]);
    expect(body.data).toMatchObject({
      name: "Slice",
      description: "A description.",
      repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
      stackSummary: null,
    });
    expect(body.data.id).toEqual(expect.any(String));
  });

  it("renders timestamps as ISO 8601 strings", async () => {
    const response = await handleCreateProject(
      postRequest({ name: "Slice" }),
      deps(),
    );
    const body = (await response.json()) as {
      data: { createdAt: string; updatedAt: string };
    };

    expect(body.data.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(new Date(body.data.updatedAt).toISOString()).toBe(
      body.data.updatedAt,
    );
  });

  it("sets a Location header pointing at the new project", async () => {
    const response = await handleCreateProject(
      postRequest({ name: "Slice" }),
      deps(),
    );
    const body = (await response.clone().json()) as { data: { id: string } };

    expect(response.headers.get("location")).toBe(
      `/api/projects/${body.data.id}`,
    );
  });

  it("sets the x-correlation-id header", async () => {
    const response = await handleCreateProject(
      postRequest({ name: "Slice" }),
      deps(),
    );

    expect(response.headers.get("x-correlation-id")).toBe(CORRELATION_ID);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await handleCreateProject(postRequest({ name: "" }), deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists the offending field in the details", async () => {
    const response = await handleCreateProject(
      postRequest({ name: "Slice", repositoryUrl: "not-a-url" }),
      deps(),
    );
    const body = (await response.json()) as {
      error: { details?: { path: string }[] };
    };

    expect(
      body.error.details?.some((detail) => detail.path === "repositoryUrl"),
    ).toBe(true);
  });

  it("returns 400 for malformed JSON rather than 500", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ this is not json",
    });

    const response = await handleCreateProject(request, deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("persists nothing when validation fails", async () => {
    await handleCreateProject(postRequest({ name: "" }), deps());

    expect(await prisma.project.count()).toBe(0);
  });

  describe("when the repository fails unexpectedly", () => {
    const failing = {
      ...repository,
      create: () => {
        throw new Error(
          `PrismaClientKnownRequestError: connect ECONNREFUSED ${SECRET_URL}\n    at Object.<anonymous> (/app/src/db.ts:10:15)`,
        );
      },
    } as unknown as typeof repository;

    it("returns 500 with a generic INTERNAL_ERROR", async () => {
      const response = await handleCreateProject(
        postRequest({ name: "Slice" }),
        deps({ repository: failing }),
      );
      const body = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("leaks no Prisma detail, stack trace or credential to the client", async () => {
      const response = await handleCreateProject(
        postRequest({ name: "Slice" }),
        deps({ repository: failing }),
      );
      const text = await response.text();

      expect(text).not.toMatch(/prisma/i);
      expect(text).not.toContain("s3cr3t_pw");
      expect(text).not.toContain("postgresql://");
      expect(text).not.toMatch(/ECONNREFUSED/);
      expect(text).not.toMatch(/at Object\.<anonymous>/);
    });

    it("leaks no credential into the log either", async () => {
      await handleCreateProject(
        postRequest({ name: "Slice" }),
        deps({ repository: failing }),
      );

      const text = logLines.join("\n");

      expect(text).not.toContain("s3cr3t_pw");
      // A database URL is replaced whole, so the marker is the URL-specific one.
      expect(text).toMatch(/\[REDACTED(?:_DATABASE_URL)?\]/);
    });

    it("still records the correlation id so the log can be found", async () => {
      await handleCreateProject(
        postRequest({ name: "Slice" }),
        deps({ repository: failing }),
      );

      expect(logLines.join("\n")).toContain(CORRELATION_ID);
    });
  });
});

describe("POST /api/projects — request log metadata", () => {
  it("records method, path, statusCode and correlationId on success", async () => {
    await handleCreateProject(postRequest({ name: "Slice" }), deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.create",
      method: "POST",
      path: "/api/projects",
      statusCode: 201,
      correlationId: CORRELATION_ID,
    });
  });

  it("records statusCode 400 on a validation failure", async () => {
    await handleCreateProject(postRequest({ name: "" }), deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.create",
      method: "POST",
      path: "/api/projects",
      statusCode: 400,
    });
  });

  it("records statusCode 400 for an unknown field", async () => {
    await handleCreateProject(
      postRequest({ name: "Slice", stackSummary: "Next.js" }),
      deps(),
    );

    expect(parseOutcomeLog()).toMatchObject({ statusCode: 400 });
  });

  it("records statusCode 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ this is not json",
    });

    await handleCreateProject(request, deps());

    expect(parseOutcomeLog()).toMatchObject({
      method: "POST",
      path: "/api/projects",
      statusCode: 400,
    });
  });

  it("records statusCode 500 on an unexpected failure, with no credential", async () => {
    const failing = {
      ...repository,
      create: () => {
        throw new Error(`connect failed: ${SECRET_URL}`);
      },
    } as unknown as typeof repository;

    await handleCreateProject(
      postRequest({ name: "Slice" }),
      deps({ repository: failing }),
    );

    const parsed = parseOutcomeLog();

    expect(parsed).toMatchObject({
      event: "projects.create",
      method: "POST",
      path: "/api/projects",
      statusCode: 500,
      correlationId: CORRELATION_ID,
    });
    expect(JSON.stringify(parsed)).not.toContain("s3cr3t_pw");
  });

  it("emits exactly one outcome log per request", async () => {
    await handleCreateProject(postRequest({ name: "Slice" }), deps());

    expect(logLines).toHaveLength(1);
  });
});

describe("GET /api/projects — request log metadata", () => {
  it("records method, path, statusCode and correlationId on success", async () => {
    await handleListProjects(getRequest(), deps());

    expect(parseOutcomeLog()).toMatchObject({
      event: "projects.list",
      method: "GET",
      path: "/api/projects",
      statusCode: 200,
      correlationId: CORRELATION_ID,
    });
  });

  it("records statusCode 400 for an invalid page", async () => {
    await handleListProjects(getRequest("?page=0"), deps());

    expect(parseOutcomeLog()).toMatchObject({
      method: "GET",
      path: "/api/projects",
      statusCode: 400,
    });
  });

  it("records statusCode 400 for an invalid pageSize", async () => {
    await handleListProjects(getRequest("?pageSize=101"), deps());

    expect(parseOutcomeLog()).toMatchObject({ statusCode: 400 });
  });

  it("logs the pathname only, never the query string", async () => {
    await handleListProjects(getRequest("?page=1&token=leaked-token"), deps());

    const parsed = parseOutcomeLog();

    expect(parsed.path).toBe("/api/projects");
    expect(JSON.stringify(parsed)).not.toContain("leaked-token");
  });

  it("records statusCode 500 on an unexpected failure, with no credential", async () => {
    const failing = {
      ...repository,
      list: () => {
        throw new Error(`connect failed: ${SECRET_URL}`);
      },
    } as unknown as typeof repository;

    await handleListProjects(getRequest(), deps({ repository: failing }));

    const parsed = parseOutcomeLog();

    expect(parsed).toMatchObject({
      method: "GET",
      path: "/api/projects",
      statusCode: 500,
    });
    expect(JSON.stringify(parsed)).not.toContain("s3cr3t_pw");
  });
});

describe("GET /api/projects", () => {
  it("returns 200 and an empty page when nothing exists", async () => {
    const response = await handleListProjects(getRequest(), deps());
    const body = (await response.json()) as {
      data: unknown[];
      pagination: Record<string, number>;
    };

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("returns the persisted projects", async () => {
    await repository.create({ name: "One" });
    await repository.create({ name: "Two" });

    const response = await handleListProjects(getRequest(), deps());
    const body = (await response.json()) as { data: { name: string }[] };

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("paginates, and reports a total larger than the page", async () => {
    for (let index = 0; index < 5; index += 1) {
      await repository.create({ name: `Project ${index + 1}` });
    }

    const response = await handleListProjects(
      getRequest("?page=2&pageSize=2"),
      deps(),
    );
    const body = (await response.json()) as {
      data: unknown[];
      pagination: Record<string, number>;
    };

    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it("returns 400 for an invalid page", async () => {
    const response = await handleListProjects(getRequest("?page=0"), deps());
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for an invalid pageSize", async () => {
    expect(
      (await handleListProjects(getRequest("?pageSize=0"), deps())).status,
    ).toBe(400);
    expect(
      (await handleListProjects(getRequest("?pageSize=101"), deps())).status,
    ).toBe(400);
  });

  it("sets the x-correlation-id header", async () => {
    const response = await handleListProjects(getRequest(), deps());

    expect(response.headers.get("x-correlation-id")).toBe(CORRELATION_ID);
  });
});
