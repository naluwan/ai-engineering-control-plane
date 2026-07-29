import { describe, expect, it } from "vitest";

import {
  createRequirementInputSchema,
  requirementSchema,
  requirementSourceTypeSchema,
  requirementStatusSchema,
  updateRequirementInputSchema,
} from "@/domain/requirement";

const validRequirement = {
  id: "clv0000000000000000000001",
  projectId: "clv0000000000000000000000",
  sourceType: "MANUAL" as const,
  rawText: "Allow a user to submit a requirement against a project.",
  status: "SUBMITTED" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("requirementSourceTypeSchema", () => {
  it.each(["MANUAL", "GITHUB_ISSUE"])("accepts %s", (value) => {
    expect(requirementSourceTypeSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown source type", () => {
    expect(requirementSourceTypeSchema.safeParse("EMAIL").success).toBe(false);
  });
});

describe("requirementStatusSchema", () => {
  it.each(["SUBMITTED", "PLANNING", "PLANNED", "PLANNING_FAILED"])(
    "accepts %s",
    (value) => {
      expect(requirementStatusSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects an unknown status", () => {
    expect(requirementStatusSchema.safeParse("DONE").success).toBe(false);
  });
});

describe("requirementSchema", () => {
  it("accepts a complete requirement", () => {
    expect(requirementSchema.safeParse(validRequirement).success).toBe(true);
  });

  it("rejects an empty projectId", () => {
    expect(
      requirementSchema.safeParse({ ...validRequirement, projectId: "" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty rawText", () => {
    expect(
      requirementSchema.safeParse({ ...validRequirement, rawText: "" }).success,
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(
      requirementSchema.safeParse({ ...validRequirement, status: "DONE" })
        .success,
    ).toBe(false);
  });
});

describe("createRequirementInputSchema", () => {
  it("accepts a projectId and rawText, defaulting the rest", () => {
    const result = createRequirementInputSchema.safeParse({
      projectId: "clv0000000000000000000000",
      rawText: "Submit a requirement and see the resulting plan.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceType).toBe("MANUAL");
      expect(result.data.status).toBe("SUBMITTED");
    }
  });

  it("trims rawText before validating it", () => {
    const result = createRequirementInputSchema.safeParse({
      projectId: "clv0000000000000000000000",
      rawText: `  ${"a".repeat(20)}  `,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rawText).toBe("a".repeat(20));
    }
  });

  it("rejects a whitespace-only rawText", () => {
    const result = createRequirementInputSchema.safeParse({
      projectId: "clv0000000000000000000000",
      rawText: "        ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing projectId", () => {
    expect(
      createRequirementInputSchema.safeParse({ rawText: "a".repeat(20) })
        .success,
    ).toBe(false);
  });
});

describe("updateRequirementInputSchema", () => {
  it("accepts a status-only update", () => {
    expect(
      updateRequirementInputSchema.safeParse({ status: "PLANNING" }).success,
    ).toBe(true);
  });

  it("accepts an empty update", () => {
    expect(updateRequirementInputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(
      updateRequirementInputSchema.safeParse({ status: "DONE" }).success,
    ).toBe(false);
  });
});
