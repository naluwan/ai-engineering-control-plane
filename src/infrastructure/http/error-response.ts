import type { AppError, AppErrorCode } from "@/application/errors";

/**
 * The HTTP representation of an application error.
 *
 * One shape for every failure, so a client can parse errors without knowing
 * which one it got. Nothing from the server's internals — no driver message,
 * no stack, no SQL — appears in a body produced here.
 */

export const CORRELATION_ID_HEADER = "x-correlation-id";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export function statusForErrorCode(code: AppErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function errorResponse(
  error: AppError,
  correlationId: string,
): Response {
  const body = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
    correlationId,
  };

  return Response.json(body, {
    status: statusForErrorCode(error.code),
    headers: { [CORRELATION_ID_HEADER]: correlationId },
  });
}

export function successResponse(
  body: unknown,
  correlationId: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: {
      ...init.headers,
      [CORRELATION_ID_HEADER]: correlationId,
    },
  });
}
