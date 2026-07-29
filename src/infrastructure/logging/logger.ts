import type {
  LogContext,
  Logger,
  LogLevel,
} from "@/application/ports/logger";

/**
 * Structured JSON logger.
 *
 * The pipeline is deliberate:
 *
 *   raw structured value
 *     → recursive structural sanitization (redact by key, sanitize strings)
 *     → single JSON.stringify
 *     → output
 *
 * An earlier version stringified first and then ran a quoted-value regex over
 * the JSON text. That is unsound in both directions: a secret containing `"`
 * ends the regex's value early — leaking the tail and producing text that no
 * longer parses as JSON — and nothing forces the regex to respect JSON's
 * escaping rules. Redaction now happens on the value, before serialisation, so
 * a secret can never survive by containing a quote, a backslash, or an escape
 * sequence, and the output is always valid JSON.
 *
 * No logging library is added.
 */

const REDACTED = "[REDACTED]";
const REDACTED_DATABASE_URL = "[REDACTED_DATABASE_URL]";
const CIRCULAR = "[Circular]";
const UNSERIALISABLE = "[Unserialisable]";

/**
 * Keys whose value is replaced wholesale, never partially.
 *
 * Compared after normalisation, so `apiKey`, `api_key`, `API-KEY` and
 * `apikey` are one entry.
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  "password",
  "passwd",
  "pwd",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "clientsecret",
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "databaseurl",
  "database",
  "testdatabaseurl",
  "connectionstring",
]);

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[_\-\s]/g, "");
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normaliseKey(key));
}

/** A value whose prototype makes it safe to walk as a record. */
function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

// --- Free-form string sanitisation ---------------------------------------

/** A whole PostgreSQL connection string, credentials and all. */
const POSTGRES_URL = /postgres(?:ql)?:\/\/\S+/gi;

/**
 * Where an unquoted credential is allowed to end.
 *
 * **Whitespace is deliberately absent.** A credential may contain spaces —
 * `Bearer AAA BBB CCC`, a passphrase, a base64 blob with padding — so treating
 * the first space as a terminator redacts one token and leaves the rest in the
 * log. That is precisely the partial leak this pattern exists to prevent.
 *
 * Only structural delimiters end a value: newline, semicolon, comma, pipe.
 * Everything else — dot, slash, plus, equals, quote, backslash, punctuation,
 * space — is treated as part of the credential. When no delimiter is present,
 * redaction runs to the end of the string: over-redacting a little context is
 * an acceptable price for never leaving a suffix behind.
 */
const UNQUOTED_VALUE = "[^\\n;,|]*";

/** `Bearer <token>` — handled before the generic rule so the keyword survives. */
const BEARER_TOKEN = new RegExp(`\\b(bearer)\\s+${UNQUOTED_VALUE}`, "gi");

/**
 * A sensitive query parameter inside any URL.
 *
 * Here `&` *is* a real delimiter, because a query string defines one. This
 * runs before the assignment rule, and the assignment rule then skips keys
 * preceded by `?` or `&` so the two cannot fight over the same text.
 */
const SENSITIVE_QUERY_PARAM =
  /([?&](?:password|passwd|pwd|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|client[_-]?secret|authorization|cookie|session)=)[^&\s"'<>]*/gi;

/**
 * A `key: value` or `key=value` assignment in prose.
 *
 * Quoted alternatives are tried first and consume escape sequences (`\\.`), so
 * a value containing `\"` is matched to its real end; anything after the
 * closing quote is left alone. An unquoted value falls through to
 * `UNQUOTED_VALUE` and is redacted to a structural delimiter or to the end.
 *
 * The lookbehind keeps this rule off URL query parameters, which the rule
 * above has already handled.
 */
const SENSITIVE_ASSIGNMENT = new RegExp(
  "(?<![?&])\\b(password|passwd|pwd|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|client[_-]?secret|authorization|proxy[_-]?authorization|cookie|set[_-]?cookie|database[_-]?url|test[_-]?database[_-]?url)\\b" +
    "(\\s*[:=]\\s*)" +
    `(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|${UNQUOTED_VALUE})`,
  "gi",
);

/**
 * Sanitises a free-form string — an error message, a stack frame, a URL.
 *
 * Percent-encoding needs no special case: every rule replaces the *whole*
 * value it matches, so an encoded credential is removed along with everything
 * else between the delimiters.
 */
export function sanitiseString(input: string): string {
  return input
    .replace(POSTGRES_URL, REDACTED_DATABASE_URL)
    .replace(BEARER_TOKEN, `$1 ${REDACTED}`)
    .replace(SENSITIVE_QUERY_PARAM, `$1${REDACTED}`)
    .replace(SENSITIVE_ASSIGNMENT, `$1$2${REDACTED}`);
}

/** Retained for readability at call sites; strings are sanitised, not redacted. */
export const redact = sanitiseString;

// --- Structural sanitisation ---------------------------------------------

/**
 * Walks a value, redacting sensitive keys and sanitising every string, and
 * returns something `JSON.stringify` can always render.
 *
 * A sensitive key's value is replaced entirely — no prefix, no suffix, no
 * length hint — and is never handed to the serialiser.
 */
function sanitiseValue(value: unknown, seen: Set<object>): unknown {
  if (value === null) {
    return null;
  }

  const valueType = typeof value;

  if (valueType === "string") {
    return sanitiseString(value as string);
  }

  if (valueType === "boolean") {
    return value;
  }

  if (valueType === "number") {
    // NaN and Infinity serialise to null; render them readably instead.
    return Number.isFinite(value) ? value : String(value);
  }

  if (valueType === "bigint") {
    // JSON.stringify throws on a bigint.
    return String(value);
  }

  if (valueType === "undefined") {
    return undefined;
  }

  if (valueType === "function" || valueType === "symbol") {
    return UNSERIALISABLE;
  }

  const objectValue = value as object;

  if (seen.has(objectValue)) {
    return CIRCULAR;
  }

  if (objectValue instanceof Error) {
    seen.add(objectValue);
    const rendered = {
      name: objectValue.name,
      message: sanitiseString(objectValue.message),
      stack:
        objectValue.stack === undefined
          ? undefined
          : sanitiseString(objectValue.stack),
    };
    seen.delete(objectValue);

    return rendered;
  }

  if (objectValue instanceof Date) {
    return objectValue.toISOString();
  }

  seen.add(objectValue);

  let rendered: unknown;

  if (Array.isArray(objectValue)) {
    rendered = objectValue.map((item) => sanitiseValue(item, seen));
  } else if (isPlainRecord(objectValue)) {
    rendered = Object.fromEntries(
      Object.entries(objectValue).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? REDACTED : sanitiseValue(item, seen),
      ]),
    );
  } else {
    // Map, Set, a class instance — no reliable JSON rendering, and its
    // internals are not worth guessing at.
    rendered = UNSERIALISABLE;
  }

  seen.delete(objectValue);

  return rendered;
}

/** Sanitises a context object into something always safe to serialise. */
function sanitiseContext(context: LogContext): Record<string, unknown> {
  const seen = new Set<object>();

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitiseValue(value, seen),
    ]),
  );
}

// --- Logger --------------------------------------------------------------

type LogSink = {
  write: (line: string) => void;
  correlationId?: string;
  now?: () => Date;
};

export function createStructuredLogger(sink: LogSink): Logger {
  const now = sink.now ?? (() => new Date());

  function emit(level: LogLevel, message: string, context?: LogContext): void {
    const entry = {
      timestamp: now().toISOString(),
      level,
      message: sanitiseString(message),
      ...(sink.correlationId === undefined
        ? {}
        : { correlationId: sink.correlationId }),
      ...(context === undefined ? {} : sanitiseContext(context)),
    };

    // Everything above is already sanitised, so this is the only serialisation
    // step and its output is always valid JSON.
    sink.write(JSON.stringify(entry));
  }

  return {
    error: (message, context) => emit("error", message, context),
    warn: (message, context) => emit("warn", message, context),
    info: (message, context) => emit("info", message, context),
    debug: (message, context) => emit("debug", message, context),
  };
}

/** The logger used in production, writing one JSON line to stdout. */
export function createConsoleLogger(correlationId?: string): Logger {
  return createStructuredLogger({
    write: (line) => process.stdout.write(`${line}\n`),
    correlationId,
  });
}
