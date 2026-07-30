/**
 * The application-level error taxonomy.
 *
 * Every code here describes an *expected* outcome that a client can act on.
 * There is no code for "the database is down" — that is an unexpected failure,
 * which propagates as a thrown error and is converted at the HTTP boundary
 * into `INTERNAL_ERROR` with no internal detail attached.
 */
export const APP_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** One field-level problem, safe to return to a client. */
export type AppErrorDetail = {
  /** Dotted path to the offending field, e.g. `name` or `items.0.id`. */
  path: string;
  message: string;
};

/**
 * An error a client may see.
 *
 * `message` is written for a client and never interpolates a database URL, a
 * driver message, or a stack trace.
 */
export type AppError = {
  code: AppErrorCode;
  message: string;
  details?: AppErrorDetail[];
};

export function validationError(
  message: string,
  details?: AppErrorDetail[],
): AppError {
  return details === undefined
    ? { code: "VALIDATION_ERROR", message }
    : { code: "VALIDATION_ERROR", message, details };
}

export function notFoundError(message: string): AppError {
  return { code: "NOT_FOUND", message };
}

export function conflictError(
  message: string,
  details?: AppErrorDetail[],
): AppError {
  return details === undefined
    ? { code: "CONFLICT", message }
    : { code: "CONFLICT", message, details };
}

export function internalError(
  message = "An unexpected error occurred.",
): AppError {
  return { code: "INTERNAL_ERROR", message };
}
