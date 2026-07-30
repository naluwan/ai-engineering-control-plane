import { describe, expect, it } from "vitest";

import {
  createProjectRequestSchema,
  listProjectsQuerySchema,
  projectIdSchema,
  toProjectResponse,
} from "@/application/schemas/project";

describe("createProjectRequestSchema", () => {
  it("accepts a name alone", () => {
    const result = createProjectRequestSchema.safeParse({ name: "Slice" });

    expect(result.success).toBe(true);
  });

  it("accepts every supported field", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      description: "A description.",
      repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
    });

    expect(result.success).toBe(true);
  });

  it("trims the name before validating it", () => {
    const result = createProjectRequestSchema.safeParse({ name: "  Slice  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Slice");
    }
  });

  it("rejects a missing name", () => {
    expect(createProjectRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(createProjectRequestSchema.safeParse({ name: "" }).success).toBe(
      false,
    );
  });

  it("rejects a whitespace-only name", () => {
    expect(createProjectRequestSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a name of exactly 100 characters", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "x".repeat(100),
    });

    expect(result.success).toBe(true);
  });

  it("rejects a name longer than 100 characters", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "x".repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it("accepts a description of exactly 1000 characters", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      description: "x".repeat(1000),
    });

    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 1000 characters", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      description: "x".repeat(1001),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid repositoryUrl", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      repositoryUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown field rather than silently dropping it", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      stackSummary: "Next.js",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a caller-supplied id", () => {
    const result = createProjectRequestSchema.safeParse({
      id: "clv0000000000000000000000",
      name: "Slice",
    });

    expect(result.success).toBe(false);
  });

  it("rejects caller-supplied timestamps", () => {
    const result = createProjectRequestSchema.safeParse({
      name: "Slice",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(createProjectRequestSchema.safeParse("Slice").success).toBe(false);
    expect(createProjectRequestSchema.safeParse(null).success).toBe(false);
    expect(createProjectRequestSchema.safeParse([]).success).toBe(false);
  });
});

describe("listProjectsQuerySchema", () => {
  it("defaults page to 1 and pageSize to 20 when neither is supplied", () => {
    const result = listProjectsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("coerces numeric strings, since query params arrive as strings", () => {
    const result = listProjectsQuerySchema.safeParse({
      page: "3",
      pageSize: "50",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejects page below 1", () => {
    expect(listProjectsQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listProjectsQuerySchema.safeParse({ page: "-1" }).success).toBe(
      false,
    );
  });

  it("rejects a non-integer page", () => {
    expect(listProjectsQuerySchema.safeParse({ page: "1.5" }).success).toBe(
      false,
    );
  });

  it("rejects a non-numeric page", () => {
    expect(listProjectsQuerySchema.safeParse({ page: "abc" }).success).toBe(
      false,
    );
  });

  it("accepts pageSize at both boundaries", () => {
    expect(listProjectsQuerySchema.safeParse({ pageSize: "1" }).success).toBe(
      true,
    );
    expect(listProjectsQuerySchema.safeParse({ pageSize: "100" }).success).toBe(
      true,
    );
  });

  it("rejects pageSize outside 1 to 100", () => {
    expect(listProjectsQuerySchema.safeParse({ pageSize: "0" }).success).toBe(
      false,
    );
    expect(listProjectsQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
  });
});

describe("projectIdSchema", () => {
  it("accepts a non-empty id", () => {
    expect(projectIdSchema.safeParse("clv0000000000000000000000").success).toBe(
      true,
    );
  });

  it("rejects an empty id", () => {
    expect(projectIdSchema.safeParse("").success).toBe(false);
    expect(projectIdSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a non-string id", () => {
    expect(projectIdSchema.safeParse(123).success).toBe(false);
  });
});

describe("toProjectResponse", () => {
  const project = {
    id: "clv0000000000000000000000",
    name: "Slice",
    description: "A description.",
    repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
    stackSummary: "Next.js",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T03:04:05.000Z"),
  };

  it("renders timestamps as ISO 8601 strings, not Date objects", () => {
    const response = toProjectResponse(project);

    expect(response.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(response.updatedAt).toBe("2026-01-02T03:04:05.000Z");
    expect(typeof response.createdAt).toBe("string");
  });

  it("carries every exposed field", () => {
    const response = toProjectResponse(project);

    expect(response).toEqual({
      id: project.id,
      name: project.name,
      description: project.description,
      repositoryUrl: project.repositoryUrl,
      stackSummary: project.stackSummary,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    });
  });

  it("preserves nulls for absent optional fields", () => {
    const response = toProjectResponse({
      ...project,
      description: null,
      repositoryUrl: null,
      stackSummary: null,
    });

    expect(response.description).toBeNull();
    expect(response.repositoryUrl).toBeNull();
    expect(response.stackSummary).toBeNull();
  });

  it("produces a value that survives JSON serialisation unchanged", () => {
    const response = toProjectResponse(project);

    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });
});
