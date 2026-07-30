import { describe, expect, it } from "vitest";

import {
  conflictError,
  internalError,
  notFoundError,
  validationError,
} from "@/application/errors";
import {
  errorResponse,
  statusForErrorCode,
} from "@/infrastructure/http/error-response";

const CORRELATION_ID = "corr-123";

describe("statusForErrorCode", () => {
  it.each([
    ["VALIDATION_ERROR", 400],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["INTERNAL_ERROR", 500],
  ] as const)("maps %s to %i", (code, status) => {
    expect(statusForErrorCode(code)).toBe(status);
  });
});

describe("errorResponse", () => {
  it("returns the mapped status for each code", async () => {
    expect(errorResponse(validationError("bad"), CORRELATION_ID).status).toBe(
      400,
    );
    expect(errorResponse(notFoundError("gone"), CORRELATION_ID).status).toBe(
      404,
    );
    expect(errorResponse(conflictError("dup"), CORRELATION_ID).status).toBe(409);
    expect(errorResponse(internalError(), CORRELATION_ID).status).toBe(500);
  });

  it("uses a consistent body shape", async () => {
    const response = errorResponse(notFoundError("Project not found."), CORRELATION_ID);
    const body: unknown = await response.json();

    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Project not found." },
      correlationId: CORRELATION_ID,
    });
  });

  it("includes details when the error carries them", async () => {
    const response = errorResponse(
      validationError("invalid", [{ path: "name", message: "name is required" }]),
      CORRELATION_ID,
    );
    const body: unknown = await response.json();

    expect(body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "invalid",
        details: [{ path: "name", message: "name is required" }],
      },
      correlationId: CORRELATION_ID,
    });
  });

  it("omits details when the error carries none", async () => {
    const response = errorResponse(notFoundError("gone"), CORRELATION_ID);
    const body = (await response.json()) as { error: Record<string, unknown> };

    expect(body.error).not.toHaveProperty("details");
  });

  it("keeps the same top-level keys for every code", async () => {
    const codes = [
      validationError("a"),
      notFoundError("b"),
      conflictError("c"),
      internalError(),
    ];

    for (const error of codes) {
      const body = (await errorResponse(error, CORRELATION_ID).json()) as Record<
        string,
        unknown
      >;

      expect(Object.keys(body).sort()).toEqual(["correlationId", "error"]);
    }
  });

  it("sets the x-correlation-id header", () => {
    const response = errorResponse(internalError(), CORRELATION_ID);

    expect(response.headers.get("x-correlation-id")).toBe(CORRELATION_ID);
  });

  it("returns no internal detail for INTERNAL_ERROR", async () => {
    const response = errorResponse(internalError(), CORRELATION_ID);
    const text = await response.text();

    expect(text).not.toMatch(/prisma/i);
    expect(text).not.toMatch(/postgres/i);
    expect(text).not.toMatch(/at .*\(.*:\d+:\d+\)/);
    expect(text).not.toMatch(/stack/i);
  });
});
