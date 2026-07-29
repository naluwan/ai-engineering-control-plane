import { describe, expect, it } from "vitest";

import {
  createProjectInputSchema,
  projectSchema,
  updateProjectInputSchema,
} from "@/domain/project";

const validProject = {
  id: "clv0000000000000000000000",
  name: "AI Engineering Control Plane",
  description: "An auditable control plane.",
  repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
  stackSummary: "Next.js, TypeScript, PostgreSQL",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("projectSchema", () => {
  it("accepts a complete project", () => {
    expect(projectSchema.safeParse(validProject).success).toBe(true);
  });

  it("accepts null for every optional field", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      description: null,
      repositoryUrl: null,
      stackSummary: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty id", () => {
    expect(projectSchema.safeParse({ ...validProject, id: "" }).success).toBe(
      false,
    );
  });

  it("rejects an empty name", () => {
    expect(projectSchema.safeParse({ ...validProject, name: "" }).success).toBe(
      false,
    );
  });

  it("rejects timestamps that are not Date instances", () => {
    const result = projectSchema.safeParse({
      ...validProject,
      createdAt: "2026-01-01",
    });

    expect(result.success).toBe(false);
  });
});

describe("createProjectInputSchema", () => {
  it("accepts a name alone", () => {
    expect(createProjectInputSchema.safeParse({ name: "Slice" }).success).toBe(
      true,
    );
  });

  it("trims the name before validating it", () => {
    const result = createProjectInputSchema.safeParse({ name: "  Slice  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Slice");
    }
  });

  it("rejects a whitespace-only name", () => {
    expect(createProjectInputSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a name longer than 100 characters", () => {
    const result = createProjectInputSchema.safeParse({
      name: "x".repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it("rejects a repositoryUrl that is not a URL", () => {
    const result = createProjectInputSchema.safeParse({
      name: "Slice",
      repositoryUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("does not accept caller-supplied identifiers or timestamps", () => {
    const result = createProjectInputSchema.safeParse({
      id: "clv0000000000000000000000",
      name: "Slice",
      createdAt: new Date(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
    }
  });
});

describe("updateProjectInputSchema", () => {
  it("accepts a partial update", () => {
    expect(
      updateProjectInputSchema.safeParse({ description: "Updated." }).success,
    ).toBe(true);
  });

  it("accepts an empty update", () => {
    expect(updateProjectInputSchema.safeParse({}).success).toBe(true);
  });

  it("still rejects an invalid name when one is supplied", () => {
    expect(updateProjectInputSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
