import { z } from "zod";

import type { Project } from "@/domain/project";

/**
 * Schemas for the project HTTP boundary.
 *
 * These are the API's contract, deliberately narrower than the domain's. The
 * domain accepts `stackSummary`; this API does not, because nothing sends it
 * yet — accepting a field with no producer invites it to drift.
 *
 * Every type is inferred with `z.infer`; nothing here is hand-written twice.
 */

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 100;

// --- Request -------------------------------------------------------------

/**
 * Strict: an unknown field is a rejection, not something to drop quietly. A
 * client that misspells `description` should be told, not left wondering why
 * its value vanished. This is also what keeps `id`, `createdAt` and
 * `stackSummary` from being accepted from the outside.
 */
export const createProjectRequestSchema = z
  .strictObject({
    name: z
      .string({ error: "name is required" })
      .trim()
      .min(1, { error: "name is required" })
      .max(NAME_MAX_LENGTH, {
        error: `name must be at most ${NAME_MAX_LENGTH} characters`,
      }),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX_LENGTH, {
        error: `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
      })
      .optional(),
    repositoryUrl: z
      .string()
      .trim()
      .refine((value) => URL.canParse(value), {
        error: "repositoryUrl must be a valid URL",
      })
      .optional(),
  })
  .describe("Create project request body");

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

/**
 * Query parameters arrive as strings, so the numeric fields are coerced before
 * the range rules run. `z.coerce.number()` alone would accept `1.5`; the
 * explicit `int()` is what rejects it.
 */
export const listProjectsQuerySchema = z.strictObject({
  page: z.coerce
    .number({ error: "page must be a number" })
    .int({ error: "page must be an integer" })
    .min(1, { error: "page must be at least 1" })
    .default(PAGE_DEFAULT),
  pageSize: z.coerce
    .number({ error: "pageSize must be a number" })
    .int({ error: "pageSize must be an integer" })
    .min(PAGE_SIZE_MIN, {
      error: `pageSize must be at least ${PAGE_SIZE_MIN}`,
    })
    .max(PAGE_SIZE_MAX, {
      error: `pageSize must be at most ${PAGE_SIZE_MAX}`,
    })
    .default(PAGE_SIZE_DEFAULT),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const projectIdSchema = z
  .string({ error: "id is required" })
  .trim()
  .min(1, { error: "id is required" });

// --- Response ------------------------------------------------------------

/**
 * The wire shape of a project.
 *
 * Timestamps are ISO 8601 strings. A `Date` is not JSON: it only becomes a
 * string when something serialises it, so treating a `Date`-carrying object as
 * a validated response type would be asserting something untrue about it.
 */
export const projectResponseSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  stackSummary: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const paginationResponseSchema = z.strictObject({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationResponse = z.infer<typeof paginationResponseSchema>;

/** Domain project → API response. The single place `Date` becomes a string. */
export function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    repositoryUrl: project.repositoryUrl,
    stackSummary: project.stackSummary,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
