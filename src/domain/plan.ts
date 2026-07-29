import { z } from "zod";

import { jsonValueSchema, type JsonValue } from "@/domain/json";

/**
 * A plan is the Planner Agent's structured output for one requirement.
 *
 * `content` is validated **only** as a JSON-serialisable boundary here. The
 * `PlanSchema` that gives it meaning — summary, goals, risks, acceptance
 * criteria — is TASK-007's contract and must not be implemented early. Storing
 * the schema version alongside the content is what keeps an old row readable
 * once that contract exists.
 */

const planSchemaVersion = z
  .string()
  .trim()
  .min(1, { error: "schemaVersion is required" });

/** A plan as it exists once persisted. */
export const planSchema = z.object({
  id: z.string().min(1),
  requirementId: z.string().min(1, { error: "requirementId is required" }),
  schemaVersion: planSchemaVersion,
  content: jsonValueSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Plan = z.infer<typeof planSchema>;

export const createPlanInputSchema = z.object({
  requirementId: z.string().trim().min(1, { error: "requirementId is required" }),
  schemaVersion: planSchemaVersion,
  content: jsonValueSchema,
});

export type CreatePlanInput = z.infer<typeof createPlanInputSchema>;

export const updatePlanInputSchema = z
  .object({
    schemaVersion: planSchemaVersion,
    content: jsonValueSchema,
  })
  .partial();

export type UpdatePlanInput = z.infer<typeof updatePlanInputSchema>;

export type { JsonValue };
