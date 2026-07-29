import { describe, expect, it } from "vitest";

import {
  createPlanInputSchema,
  planSchema,
  updatePlanInputSchema,
} from "@/domain/plan";

const validPlan = {
  id: "clv0000000000000000000002",
  requirementId: "clv0000000000000000000001",
  schemaVersion: "1.0.0",
  content: { summary: "Restated requirement", goals: ["ship the slice"] },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("planSchema", () => {
  it("accepts a complete plan", () => {
    expect(planSchema.safeParse(validPlan).success).toBe(true);
  });

  it("rejects an empty requirementId", () => {
    expect(
      planSchema.safeParse({ ...validPlan, requirementId: "" }).success,
    ).toBe(false);
  });

  it("rejects an empty schemaVersion", () => {
    expect(planSchema.safeParse({ ...validPlan, schemaVersion: "" }).success).toBe(
      false,
    );
  });

  it("accepts any JSON-serialisable content, since PlanSchema arrives in TASK-007", () => {
    expect(planSchema.safeParse({ ...validPlan, content: [] }).success).toBe(
      true,
    );
    expect(planSchema.safeParse({ ...validPlan, content: null }).success).toBe(
      true,
    );
    expect(
      planSchema.safeParse({ ...validPlan, content: "anything" }).success,
    ).toBe(true);
  });

  it("rejects content that JSON cannot represent", () => {
    expect(
      planSchema.safeParse({ ...validPlan, content: undefined }).success,
    ).toBe(false);
    expect(
      planSchema.safeParse({ ...validPlan, content: () => "nope" }).success,
    ).toBe(false);
  });

  it("rejects circular content", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(
      planSchema.safeParse({ ...validPlan, content: circular }).success,
    ).toBe(false);
  });
});

describe("createPlanInputSchema", () => {
  it("accepts requirementId, schemaVersion and content", () => {
    const result = createPlanInputSchema.safeParse({
      requirementId: "clv0000000000000000000001",
      schemaVersion: "1.0.0",
      content: { summary: "ok" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing schemaVersion", () => {
    const result = createPlanInputSchema.safeParse({
      requirementId: "clv0000000000000000000001",
      content: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-JSON content", () => {
    const result = createPlanInputSchema.safeParse({
      requirementId: "clv0000000000000000000001",
      schemaVersion: "1.0.0",
      content: { fn: () => "nope" },
    });

    expect(result.success).toBe(false);
  });

  it("does not accept caller-supplied identifiers", () => {
    const result = createPlanInputSchema.safeParse({
      id: "clv0000000000000000000002",
      requirementId: "clv0000000000000000000001",
      schemaVersion: "1.0.0",
      content: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});

describe("updatePlanInputSchema", () => {
  it("accepts a content-only update", () => {
    expect(
      updatePlanInputSchema.safeParse({ content: { summary: "revised" } })
        .success,
    ).toBe(true);
  });

  it("accepts an empty update", () => {
    expect(updatePlanInputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects non-JSON content", () => {
    expect(
      updatePlanInputSchema.safeParse({ content: Symbol("nope") }).success,
    ).toBe(false);
  });
});
