import type { AppError } from "@/application/errors";

/**
 * The result of an application use case.
 *
 * Expected outcomes — a validation failure, a missing record, a conflict — are
 * returned as values, so a caller has to acknowledge them to reach the data.
 * Unexpected failures are not represented here at all: they are thrown, and the
 * HTTP boundary turns them into a generic `INTERNAL_ERROR`. Folding the two
 * together would let a broken database look like a bad request.
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(error: AppError): Result<T> {
  return { ok: false, error };
}
