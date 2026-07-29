import { describe, expect, it } from "vitest";

import {
  createStructuredLogger,
  sanitiseString,
} from "@/infrastructure/logging/logger";

/**
 * Security regression tests for the logger.
 *
 * Every fixture credential carries a distinctive sentinel so a *partial* leak
 * fails as loudly as a whole one: the assertions check the prefix and the
 * suffix separately, which is exactly what an earlier
 * stringify-then-regex implementation got wrong on a value containing a quote.
 *
 * All credentials here are obvious fakes.
 */

const SENTINEL_HEAD = "AAAHEAD";
const SENTINEL_TAIL = "ZZZTAIL";

function capture(): { lines: string[]; write: (line: string) => void } {
  const lines: string[] = [];

  return { lines, write: (line: string) => lines.push(line) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/** Parses a captured line, failing the test if it is not valid JSON. */
function parseLine(line: string | undefined): Record<string, unknown> {
  expect(line).toBeTypeOf("string");

  const parsed: unknown = JSON.parse(line ?? "");

  expect(isRecord(parsed)).toBe(true);

  return isRecord(parsed) ? parsed : {};
}

/**
 * The core assertion: the line parses, leaks neither end of the secret, and
 * shows that something was removed.
 */
function expectSafe(line: string | undefined, secretParts: string[]): void {
  const parsed = parseLine(line);
  const text = JSON.stringify(parsed);

  for (const part of secretParts) {
    expect(text).not.toContain(part);
  }

  expect(text).toMatch(/\[REDACTED(?:_DATABASE_URL)?\]|\[Unserialisable\]/);
}

describe("sanitiseString", () => {
  it("replaces a whole postgresql:// URL", () => {
    const output = sanitiseString(
      `connect failed: postgresql://user:${SENTINEL_HEAD}pw${SENTINEL_TAIL}@db.invalid:5432/acp`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
    expect(output).toContain("[REDACTED_DATABASE_URL]");
  });

  it("replaces a whole postgres:// URL", () => {
    const output = sanitiseString(
      `postgres://user:${SENTINEL_HEAD}${SENTINEL_TAIL}@db.invalid/acp`,
    );

    expect(output).not.toContain(SENTINEL_TAIL);
    expect(output).toContain("[REDACTED_DATABASE_URL]");
  });

  it("replaces a percent-encoded PostgreSQL credential", () => {
    const output = sanitiseString(
      `postgresql://user:${SENTINEL_HEAD}%40ss%22word${SENTINEL_TAIL}@db.invalid/acp`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
    expect(output).not.toContain("%40ss%22word");
  });

  it("redacts a token in a URL query string", () => {
    const output = sanitiseString(
      `callback https://example.invalid/cb?access_token=${SENTINEL_HEAD}tok${SENTINEL_TAIL}&state=1`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
    expect(output).toContain("[REDACTED]");
    // Non-sensitive parameters survive, so the log stays useful.
    expect(output).toContain("state=1");
  });

  it("redacts a percent-encoded token in a URL query string", () => {
    const output = sanitiseString(
      `https://example.invalid/cb?api_key=${SENTINEL_HEAD}%22%2F%3A${SENTINEL_TAIL}`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
  });

  it("redacts a Bearer token", () => {
    const output = sanitiseString(
      `Authorization: Bearer ${SENTINEL_HEAD}.jwt.${SENTINEL_TAIL}`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
  });

  it.each([
    ["password", `password=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["passwd", `passwd: ${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["pwd", `pwd=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["token", `token: ${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["api_key", `api_key=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["secret", `secret=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["cookie", `cookie=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
    ["database_url", `database_url=${SENTINEL_HEAD}${SENTINEL_TAIL}`],
  ])("redacts a %s assignment", (_label, input) => {
    const output = sanitiseString(input);

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
  });

  it("redacts a quoted value containing an escaped quote", () => {
    const output = sanitiseString(
      `password="${SENTINEL_HEAD}\\"inner\\"${SENTINEL_TAIL}"`,
    );

    expect(output).not.toContain(SENTINEL_HEAD);
    expect(output).not.toContain(SENTINEL_TAIL);
  });

  it("is case-insensitive", () => {
    expect(sanitiseString(`PASSWORD=${SENTINEL_TAIL}`)).not.toContain(
      SENTINEL_TAIL,
    );
    expect(sanitiseString(`AUTHORIZATION: Bearer ${SENTINEL_TAIL}`)).not.toContain(
      SENTINEL_TAIL,
    );
  });

  it("leaves ordinary text alone", () => {
    expect(sanitiseString("project created")).toBe("project created");
  });
});

describe("createStructuredLogger — output contract", () => {
  it("writes one line per entry, and it is valid JSON", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("project created");

    expect(sink.lines).toHaveLength(1);
    expect(parseLine(sink.lines[0])).toMatchObject({
      level: "info",
      message: "project created",
    });
  });

  it("includes a timestamp", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("hello");

    expect(parseLine(sink.lines[0])).toHaveProperty("timestamp");
  });

  it.each(["error", "warn", "info", "debug"] as const)(
    "supports the %s level",
    (level) => {
      const sink = capture();

      createStructuredLogger({ write: sink.write })[level]("message");

      expect(parseLine(sink.lines[0])).toMatchObject({ level });
    },
  );

  it("includes a correlation id bound at construction", () => {
    const sink = capture();

    createStructuredLogger({
      write: sink.write,
      correlationId: "corr-bound",
    }).info("handled");

    expect(parseLine(sink.lines[0])).toMatchObject({
      correlationId: "corr-bound",
    });
  });

  it("includes a correlation id supplied as context", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("handled", {
      correlationId: "corr-123",
    });

    expect(parseLine(sink.lines[0])).toMatchObject({
      correlationId: "corr-123",
    });
  });

  it("keeps non-sensitive structured fields intact", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("handled", {
      event: "projects.create",
      method: "POST",
      path: "/api/projects",
      statusCode: 201,
    });

    expect(parseLine(sink.lines[0])).toMatchObject({
      event: "projects.create",
      method: "POST",
      path: "/api/projects",
      statusCode: 201,
    });
  });
});

describe("createStructuredLogger — credential redaction", () => {
  it("redacts a sensitive key whose value contains an escaped quote", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      password: `${SENTINEL_HEAD}"${SENTINEL_TAIL}`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a sensitive key whose value contains a backslash", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      password: `${SENTINEL_HEAD}\\${SENTINEL_TAIL}`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a nested sensitive key", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      cause: { inner: { password: `${SENTINEL_HEAD}${SENTINEL_TAIL}` } },
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a sensitive key inside an array", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      values: [
        { token: `${SENTINEL_HEAD}${SENTINEL_TAIL}` },
        `postgres://u:${SENTINEL_HEAD}pw${SENTINEL_TAIL}@db.invalid/acp`,
      ],
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it.each([
    ["password", "password"],
    ["passwd", "passwd"],
    ["pwd", "pwd"],
    ["token", "token"],
    ["accessToken", "accessToken"],
    ["refreshToken", "refreshToken"],
    ["apiKey", "apiKey"],
    ["api_key", "api_key"],
    ["secret", "secret"],
    ["clientSecret", "clientSecret"],
    ["authorization", "authorization"],
    ["proxyAuthorization", "proxyAuthorization"],
    ["cookie", "cookie"],
    ["setCookie", "setCookie"],
    ["databaseUrl", "databaseUrl"],
    ["database_url", "database_url"],
    ["testDatabaseUrl", "testDatabaseUrl"],
    ["test_database_url", "test_database_url"],
  ])("redacts the %s key entirely", (_label, key) => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      [key]: `${SENTINEL_HEAD}value${SENTINEL_TAIL}`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("matches sensitive keys case-insensitively", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("failure", {
      PASSWORD: `${SENTINEL_HEAD}${SENTINEL_TAIL}`,
      "API-KEY": `${SENTINEL_HEAD}${SENTINEL_TAIL}`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a PostgreSQL URL appearing as an ordinary value", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("connect failed", {
      detail: `postgresql://acp:${SENTINEL_HEAD}pw${SENTINEL_TAIL}@db.invalid:5432/acp`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a query token appearing as an ordinary value", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error("callback failed", {
      url: `https://example.invalid/cb?token=${SENTINEL_HEAD}${SENTINEL_TAIL}`,
    });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a credential in the log message itself", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error(
      `connect failed: postgresql://acp:${SENTINEL_HEAD}${SENTINEL_TAIL}@db.invalid/acp`,
    );

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a credential in an Error message", () => {
    const sink = capture();
    const error = new Error(
      `connect failed: postgresql://acp:${SENTINEL_HEAD}${SENTINEL_TAIL}@db.invalid/acp`,
    );

    createStructuredLogger({ write: sink.write }).error("failure", { error });

    expectSafe(sink.lines[0], [SENTINEL_HEAD, SENTINEL_TAIL]);
  });

  it("redacts a credential in an Error stack while keeping the error name", () => {
    const sink = capture();
    const error = new Error("boom");
    error.stack = `Error: boom\n    at connect (postgresql://acp:${SENTINEL_HEAD}${SENTINEL_TAIL}@db.invalid/acp)`;

    createStructuredLogger({ write: sink.write }).error("failure", { error });

    const parsed = parseLine(sink.lines[0]);

    expect(JSON.stringify(parsed)).not.toContain(SENTINEL_HEAD);
    expect(JSON.stringify(parsed)).not.toContain(SENTINEL_TAIL);
    expect(JSON.stringify(parsed)).toContain("Error");
  });
});

/**
 * Free-form credential boundary.
 *
 * Whitespace is not a safe terminator: a credential may contain spaces, so
 * stopping at the first one leaves the rest of it in the log. These fixtures
 * carry three sentinels — head, middle and tail — so a redaction that stops
 * early fails on the middle or the tail rather than passing on the head alone.
 */
const SENTINEL_MID = "MMMMIDDLE";

function expectFullyRedacted(text: string): void {
  expect(text).not.toContain(SENTINEL_HEAD);
  expect(text).not.toContain(SENTINEL_MID);
  expect(text).not.toContain(SENTINEL_TAIL);
  expect(text).toMatch(/\[REDACTED(?:_DATABASE_URL)?\]/);
}

describe("free-form credential boundary — sanitiseString", () => {
  it("redacts a Bearer token containing spaces", () => {
    const output = sanitiseString(
      `Authorization: Bearer ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    expectFullyRedacted(output);
  });

  it("redacts an unquoted password assignment containing spaces", () => {
    const output = sanitiseString(
      `password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    expectFullyRedacted(output);
  });

  it("redacts a colon-separated token assignment containing spaces", () => {
    const output = sanitiseString(
      `token: ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    expectFullyRedacted(output);
  });

  it("redacts an assignment with spaces around the separator", () => {
    const output = sanitiseString(
      `password = ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    expectFullyRedacted(output);
  });

  it("matches Bearer case-insensitively", () => {
    expectFullyRedacted(
      sanitiseString(
        `authorization: bearer ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
      ),
    );
    expectFullyRedacted(
      sanitiseString(
        `AUTHORIZATION: BEARER ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
      ),
    );
  });

  it.each([
    "password",
    "passwd",
    "pwd",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "client_secret",
    "authorization",
    "cookie",
  ])("redacts a spaced %s value to the end", (key) => {
    expectFullyRedacted(
      sanitiseString(
        `${key}=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
      ),
    );
  });

  it("does not let punctuation inside the value preserve a fragment", () => {
    expectFullyRedacted(
      sanitiseString(
        `token=${SENTINEL_HEAD}.a/b+c=d "e" \\f ${SENTINEL_MID} ${SENTINEL_TAIL}`,
      ),
    );
  });

  it("stops at a semicolon, so trailing safe text survives", () => {
    const output = sanitiseString(
      `password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}; next=safe`,
    );

    expectFullyRedacted(output);
    expect(output).toContain("next=safe");
  });

  it("stops at a newline, so a following log line survives", () => {
    const output = sanitiseString(
      `password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}\nnext=safe`,
    );

    expectFullyRedacted(output);
    expect(output).toContain("next=safe");
  });

  it("stops at a comma and at a pipe", () => {
    const comma = sanitiseString(
      `token=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}, next=safe`,
    );
    const pipe = sanitiseString(
      `token=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}| next=safe`,
    );

    expectFullyRedacted(comma);
    expectFullyRedacted(pipe);
    expect(comma).toContain("next=safe");
    expect(pipe).toContain("next=safe");
  });

  it("still redacts a quoted value containing spaces, keeping trailing safe text", () => {
    const output = sanitiseString(
      `password="${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}"; next=safe`,
    );

    expectFullyRedacted(output);
    expect(output).toContain("next=safe");
  });

  it("still redacts a single-quoted value containing spaces", () => {
    expectFullyRedacted(
      sanitiseString(
        `password='${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}'`,
      ),
    );
  });

  it("still redacts a quoted value containing an escaped quote and a backslash", () => {
    expectFullyRedacted(
      sanitiseString(
        `password="${SENTINEL_HEAD}\\"x\\\\${SENTINEL_MID} ${SENTINEL_TAIL}"`,
      ),
    );
  });
});

describe("free-form credential boundary — logger output", () => {
  it("redacts a spaced Bearer token in an Error message, keeping the name", () => {
    const sink = capture();
    const error = new Error(
      `request rejected — Authorization: Bearer ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    createStructuredLogger({ write: sink.write }).error("failure", { error });

    const parsed = parseLine(sink.lines[0]);

    expectFullyRedacted(JSON.stringify(parsed));
    expect(JSON.stringify(parsed)).toContain("Error");
  });

  it("redacts a spaced password assignment in an Error message", () => {
    const sink = capture();
    const error = new Error(
      `connect failed with password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    createStructuredLogger({ write: sink.write }).error("failure", { error });

    expectFullyRedacted(JSON.stringify(parseLine(sink.lines[0])));
  });

  it("redacts a spaced credential in an Error stack", () => {
    const sink = capture();
    const error = new Error("boom");
    error.stack = `Error: boom\n    at send (headers: Authorization: Bearer ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL})`;

    createStructuredLogger({ write: sink.write }).error("failure", { error });

    expectFullyRedacted(JSON.stringify(parseLine(sink.lines[0])));
  });

  it("redacts a spaced credential in the message itself", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).error(
      `password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    );

    expectFullyRedacted(JSON.stringify(parseLine(sink.lines[0])));
  });

  it("emits valid JSON for every spaced-credential case", () => {
    const sink = capture();
    const logger = createStructuredLogger({ write: sink.write });

    logger.error(`a Bearer ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`);
    logger.error("b", {
      detail: `password=${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
    });
    logger.error("c", {
      nested: {
        detail: `token: ${SENTINEL_HEAD} ${SENTINEL_MID} ${SENTINEL_TAIL}`,
      },
    });

    expect(sink.lines).toHaveLength(3);
    for (const line of sink.lines) {
      expectFullyRedacted(JSON.stringify(parseLine(line)));
    }
  });
});

describe("createStructuredLogger — always serialisable", () => {
  it("does not throw on a circular context, and still emits valid JSON", () => {
    const sink = capture();
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;

    expect(() =>
      createStructuredLogger({ write: sink.write }).error("failure", {
        circular,
      }),
    ).not.toThrow();

    expect(JSON.stringify(parseLine(sink.lines[0]))).toContain("[Circular]");
  });

  it("does not throw on a bigint, which JSON.stringify rejects", () => {
    const sink = capture();

    expect(() =>
      createStructuredLogger({ write: sink.write }).info("counts", {
        total: BigInt(10),
      }),
    ).not.toThrow();

    expect(parseLine(sink.lines[0])).toMatchObject({ total: "10" });
  });

  it("renders a Date as an ISO string", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("at", {
      when: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(parseLine(sink.lines[0])).toMatchObject({
      when: "2026-01-01T00:00:00.000Z",
    });
  });

  it("does not attempt to render a Map or a Set", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("collections", {
      map: new Map([["a", 1]]),
      set: new Set([1]),
    });

    expect(parseLine(sink.lines[0])).toMatchObject({
      map: "[Unserialisable]",
      set: "[Unserialisable]",
    });
  });

  it("renders a non-finite number readably", () => {
    const sink = capture();

    createStructuredLogger({ write: sink.write }).info("numbers", {
      ratio: Number.NaN,
    });

    expect(parseLine(sink.lines[0])).toMatchObject({ ratio: "NaN" });
  });

  it("emits valid JSON for every redaction case", () => {
    const sink = capture();
    const logger = createStructuredLogger({ write: sink.write });

    logger.error("a", { password: `${SENTINEL_HEAD}"${SENTINEL_TAIL}` });
    logger.error("b", { password: `${SENTINEL_HEAD}\\${SENTINEL_TAIL}` });
    logger.error("c", {
      url: `postgresql://u:${SENTINEL_HEAD}${SENTINEL_TAIL}@db.invalid/acp`,
    });
    logger.error("d", { nested: { cookie: SENTINEL_TAIL } });

    expect(sink.lines).toHaveLength(4);
    for (const line of sink.lines) {
      expectSafe(line, [SENTINEL_HEAD, SENTINEL_TAIL]);
    }
  });
});
