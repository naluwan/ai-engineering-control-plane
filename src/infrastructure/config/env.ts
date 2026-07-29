import { z } from "zod";

/**
 * Environment validation for the application and for integration tests.
 *
 * Every message produced here is written by hand and never interpolates the
 * value being validated. A connection string carries a password, so echoing an
 * invalid value back — into an error, a log, or a test snapshot — would leak a
 * credential at exactly the moment something is going wrong.
 */

const POSTGRES_PROTOCOLS = ["postgresql:", "postgres:"] as const;

export type EnvParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: string[] };

export class EnvironmentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

/**
 * A PostgreSQL connection string. Validated for shape and protocol only — the
 * value itself never reaches an error message.
 */
function postgresUrl(variableName: string): z.ZodType<string> {
  return z
    .string({ error: `${variableName} is required` })
    .trim()
    .min(1, { error: `${variableName} is required and must not be empty` })
    .refine(isParsableUrl, {
      error: `${variableName} must be a valid URL`,
    })
    .refine(hasPostgresProtocol, {
      error: `${variableName} must use the postgresql:// or postgres:// protocol`,
    });
}

function isParsableUrl(value: string): boolean {
  return URL.canParse(value);
}

function hasPostgresProtocol(value: string): boolean {
  if (!URL.canParse(value)) {
    // The URL rule above already reported this; do not report it twice.
    return true;
  }

  const protocol = new URL(value).protocol;

  return POSTGRES_PROTOCOLS.some((allowed) => allowed === protocol);
}

function toIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

// --- Application environment ---------------------------------------------

const appEnvSchema = z.object({
  DATABASE_URL: postgresUrl("DATABASE_URL"),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function parseAppEnv(
  source: Record<string, string | undefined>,
): EnvParseResult<AppEnv> {
  const result = appEnvSchema.safeParse(source);

  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, issues: toIssues(result.error) };
}

export function loadAppEnv(
  source: Record<string, string | undefined> = process.env,
): AppEnv {
  const result = parseAppEnv(source);

  if (!result.ok) {
    throw new EnvironmentValidationError(result.issues);
  }

  return result.value;
}

// --- Integration-test environment ----------------------------------------

const testEnvSchema = z
  .object({
    DATABASE_URL: postgresUrl("DATABASE_URL"),
    TEST_DATABASE_URL: postgresUrl("TEST_DATABASE_URL"),
  })
  .refine(
    (env) => env.TEST_DATABASE_URL.trim() !== env.DATABASE_URL.trim(),
    {
      error:
        "TEST_DATABASE_URL must not be the same as DATABASE_URL — the integration suite deletes rows from it",
      path: ["TEST_DATABASE_URL"],
    },
  );

export type TestEnv = z.infer<typeof testEnvSchema>;

export function parseTestEnv(
  source: Record<string, string | undefined>,
): EnvParseResult<TestEnv> {
  const result = testEnvSchema.safeParse(source);

  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, issues: toIssues(result.error) };
}

export function loadTestEnv(
  source: Record<string, string | undefined> = process.env,
): TestEnv {
  const result = parseTestEnv(source);

  if (!result.ok) {
    throw new EnvironmentValidationError(result.issues);
  }

  return result.value;
}
