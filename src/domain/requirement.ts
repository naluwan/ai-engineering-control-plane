import { z } from "zod";

/**
 * A requirement is the unstructured request a human submits against a project.
 *
 * The status values match the transitions TASK-008 will implement
 * (`SUBMITTED` → `PLANNING` → `PLANNED` / `PLANNING_FAILED`). The state
 * machine itself belongs to TASK-008 and is deliberately not implemented here;
 * this file only establishes the persisted vocabulary.
 */

const RAW_TEXT_MIN_LENGTH = 10;
const RAW_TEXT_MAX_LENGTH = 10_000;

export const REQUIREMENT_SOURCE_TYPES = ["MANUAL", "GITHUB_ISSUE"] as const;

export const REQUIREMENT_STATUSES = [
  "SUBMITTED",
  "PLANNING",
  "PLANNED",
  "PLANNING_FAILED",
] as const;

export const requirementSourceTypeSchema = z.enum(REQUIREMENT_SOURCE_TYPES);

export type RequirementSourceType = z.infer<typeof requirementSourceTypeSchema>;

export const requirementStatusSchema = z.enum(REQUIREMENT_STATUSES);

export type RequirementStatus = z.infer<typeof requirementStatusSchema>;

const requirementRawText = z
  .string()
  .trim()
  .min(RAW_TEXT_MIN_LENGTH, {
    error: `rawText must be at least ${RAW_TEXT_MIN_LENGTH} characters`,
  })
  .max(RAW_TEXT_MAX_LENGTH, {
    error: `rawText must be at most ${RAW_TEXT_MAX_LENGTH} characters`,
  });

/** A requirement as it exists once persisted. */
export const requirementSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1, { error: "projectId is required" }),
  sourceType: requirementSourceTypeSchema,
  rawText: z.string().trim().min(1, { error: "rawText is required" }),
  status: requirementStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Requirement = z.infer<typeof requirementSchema>;

export const createRequirementInputSchema = z.object({
  projectId: z.string().trim().min(1, { error: "projectId is required" }),
  rawText: requirementRawText,
  sourceType: requirementSourceTypeSchema.default("MANUAL"),
  status: requirementStatusSchema.default("SUBMITTED"),
});

export type CreateRequirementInput = z.infer<
  typeof createRequirementInputSchema
>;

export const updateRequirementInputSchema = z
  .object({
    rawText: requirementRawText,
    sourceType: requirementSourceTypeSchema,
    status: requirementStatusSchema,
  })
  .partial();

export type UpdateRequirementInput = z.infer<
  typeof updateRequirementInputSchema
>;
