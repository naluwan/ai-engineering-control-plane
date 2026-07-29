import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  loadAppEnv,
  loadTestEnv,
  parseAppEnv,
  parseTestEnv,
} from "@/infrastructure/config/env";

const APP_URL = "postgresql://app_user:app_secret_pw@localhost:5432/acp_dev";
const TEST_URL = "postgresql://app_user:app_secret_pw@localhost:5432/acp_test";

describe("parseAppEnv", () => {
  it("accepts a valid postgresql:// URL", () => {
    const result = parseAppEnv({ DATABASE_URL: APP_URL });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.DATABASE_URL).toBe(APP_URL);
    }
  });

  it("accepts the postgres:// protocol alias", () => {
    const url = "postgres://app_user:app_secret_pw@localhost:5432/acp_dev";

    expect(parseAppEnv({ DATABASE_URL: url }).ok).toBe(true);
  });

  it("fails when DATABASE_URL is missing", () => {
    const result = parseAppEnv({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/DATABASE_URL/);
      expect(result.issues.join(" ")).toMatch(/required|missing/i);
    }
  });

  it("fails when DATABASE_URL is an empty string", () => {
    expect(parseAppEnv({ DATABASE_URL: "   " }).ok).toBe(false);
  });

  it("fails when DATABASE_URL is malformed", () => {
    const result = parseAppEnv({ DATABASE_URL: "not-a-url" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/DATABASE_URL/);
    }
  });

  it("fails when DATABASE_URL uses a non-PostgreSQL protocol", () => {
    const result = parseAppEnv({
      DATABASE_URL: "mysql://app_user:app_secret_pw@localhost:3306/acp_dev",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/postgres/i);
    }
  });

  it("never leaks the password or the connection string in its issues", () => {
    const results = [
      parseAppEnv({ DATABASE_URL: "mysql://u:app_secret_pw@localhost:3306/db" }),
      parseAppEnv({ DATABASE_URL: "app_secret_pw" }),
    ];

    for (const result of results) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const text = result.issues.join(" ");
        expect(text).not.toContain("app_secret_pw");
        expect(text).not.toContain("mysql://");
      }
    }
  });
});

describe("loadAppEnv", () => {
  it("returns the validated environment when it is valid", () => {
    expect(loadAppEnv({ DATABASE_URL: APP_URL }).DATABASE_URL).toBe(APP_URL);
  });

  it("throws EnvironmentValidationError when DATABASE_URL is absent", () => {
    expect(() => loadAppEnv({})).toThrow(EnvironmentValidationError);
  });

  it("throws an error whose message contains no credential", () => {
    try {
      loadAppEnv({ DATABASE_URL: "mysql://u:app_secret_pw@localhost:3306/db" });
      throw new Error("expected loadAppEnv to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      const message = (error as Error).message;
      expect(message).not.toContain("app_secret_pw");
      expect(message).not.toContain("mysql://");
    }
  });
});

describe("parseTestEnv", () => {
  it("accepts a valid pair of distinct PostgreSQL URLs", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: TEST_URL,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.TEST_DATABASE_URL).toBe(TEST_URL);
    }
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(parseTestEnv({ TEST_DATABASE_URL: TEST_URL }).ok).toBe(false);
  });

  it("fails when TEST_DATABASE_URL is missing", () => {
    const result = parseTestEnv({ DATABASE_URL: APP_URL });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/TEST_DATABASE_URL/);
    }
  });

  it("fails when TEST_DATABASE_URL is malformed", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: "not-a-url",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/TEST_DATABASE_URL/);
    }
  });

  it("fails when TEST_DATABASE_URL uses a non-PostgreSQL protocol", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: "mysql://u:app_secret_pw@localhost:3306/acp_test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/postgres/i);
    }
  });

  it("fails when TEST_DATABASE_URL equals DATABASE_URL", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: APP_URL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toMatch(/must not be the same|must differ/i);
    }
  });

  it("compares the two URLs after trimming surrounding whitespace", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: `  ${APP_URL}  `,
    });

    expect(result.ok).toBe(false);
  });

  it("never leaks a credential when the two URLs are equal", () => {
    const result = parseTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: APP_URL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.issues.join(" ");
      expect(text).not.toContain("app_secret_pw");
      expect(text).not.toContain(APP_URL);
    }
  });
});

describe("loadTestEnv", () => {
  it("returns the validated test environment when it is valid", () => {
    const env = loadTestEnv({
      DATABASE_URL: APP_URL,
      TEST_DATABASE_URL: TEST_URL,
    });

    expect(env.TEST_DATABASE_URL).toBe(TEST_URL);
  });

  it("throws EnvironmentValidationError when the two URLs are equal", () => {
    expect(() =>
      loadTestEnv({ DATABASE_URL: APP_URL, TEST_DATABASE_URL: APP_URL }),
    ).toThrow(EnvironmentValidationError);
  });

  it("throws an error whose message contains no credential", () => {
    try {
      loadTestEnv({ DATABASE_URL: APP_URL, TEST_DATABASE_URL: APP_URL });
      throw new Error("expected loadTestEnv to throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("app_secret_pw");
    }
  });
});
