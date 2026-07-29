import { z } from "zod";

/**
 * A project connects a repository to the requirements, plans and agent runs
 * derived from it.
 *
 * Types are inferred from these schemas with `z.infer`. There is deliberately
 * no hand-written interface alongside them — a duplicated type drifts.
 */

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const STACK_SUMMARY_MAX_LENGTH = 500;

const projectName = z
  .string()
  .trim()
  .min(1, { error: "name is required" })
  .max(NAME_MAX_LENGTH, {
    error: `name must be at most ${NAME_MAX_LENGTH} characters`,
  });

const projectDescription = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, {
    error: `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
  });

const projectRepositoryUrl = z
  .string()
  .trim()
  .refine((value) => URL.canParse(value), {
    error: "repositoryUrl must be a valid URL",
  });

const projectStackSummary = z
  .string()
  .trim()
  .max(STACK_SUMMARY_MAX_LENGTH, {
    error: `stackSummary must be at most ${STACK_SUMMARY_MAX_LENGTH} characters`,
  });

/** A project as it exists once persisted. */
export const projectSchema = z.object({
  id: z.string().min(1),
  name: projectName,
  description: projectDescription.nullable(),
  repositoryUrl: projectRepositoryUrl.nullable(),
  stackSummary: projectStackSummary.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * What a caller supplies to create a project. Identifiers and timestamps are
 * owned by the persistence layer and are stripped here rather than trusted.
 */
export const createProjectInputSchema = z.object({
  name: projectName,
  description: projectDescription.nullish(),
  repositoryUrl: projectRepositoryUrl.nullish(),
  stackSummary: projectStackSummary.nullish(),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = createProjectInputSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
