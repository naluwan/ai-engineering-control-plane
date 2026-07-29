import { z } from "zod";

/**
 * A domain-owned JSON value.
 *
 * This exists so that persisted JSON columns never force a Prisma type — such
 * as `Prisma.JsonValue` — into a domain or application signature. The domain
 * describes what JSON *is*; it does not borrow the database client's opinion
 * of it.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/**
 * Whether a non-array object is a *plain* object — one JSON can represent.
 *
 * Only two prototypes qualify: `Object.prototype` (an object literal) and
 * `null` (`Object.create(null)`). Anything else — `Date`, `Map`, `Set`,
 * `RegExp`, `Error`, a class instance — carries behaviour that JSON does not,
 * and is rejected.
 *
 * The prototype is the check because enumerable properties are not. A `Date`
 * has none at all, so walking `Object.values()` on one yields `[]` and an
 * "every child is valid" test passes vacuously. A class instance is the
 * opposite trap: its own fields may be perfectly JSON-shaped while the
 * instance still is not JSON.
 *
 * `constructor.name` is not used — it is spoofable and absent on a
 * null-prototype object. `instanceof Object` is not used — it is true for
 * `Date` and false for `Object.create(null)`, i.e. wrong in both directions.
 */
function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/**
 * Walks a value to decide whether JSON can represent it.
 *
 * `JSON.stringify` is not usable here: it silently drops `undefined` and
 * function-valued properties rather than reporting them, throws on a cycle
 * instead of returning a validation failure, and happily converts a `Date`
 * into a string. All three would hide a real problem, so the check is
 * explicit.
 *
 * `seen` tracks the current recursion path only — an entry is removed on the
 * way back up — so a value referenced twice in a tree is accepted while a
 * genuine cycle is rejected. A global visited set would misreport a shared
 * reference as circular.
 */
function isJsonValue(value: unknown, seen: Set<object>): boolean {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (valueType === "string" || valueType === "boolean") {
    return true;
  }

  if (valueType === "number") {
    // NaN, Infinity and -Infinity have no JSON representation.
    return Number.isFinite(value);
  }

  if (valueType !== "object") {
    // undefined, function, symbol, bigint
    return false;
  }

  const objectValue = value as object;
  const isArray = Array.isArray(objectValue);

  if (!isArray && !isPlainObject(objectValue)) {
    return false;
  }

  if (seen.has(objectValue)) {
    return false;
  }

  seen.add(objectValue);

  const children = isArray
    ? objectValue
    : Object.values(objectValue as Record<string, unknown>);

  const allChildrenAreJson = children.every((child) => isJsonValue(child, seen));

  seen.delete(objectValue);

  return allChildrenAreJson;
}

export const jsonValueSchema: z.ZodType<JsonValue> = z.custom<JsonValue>(
  (value) => isJsonValue(value, new Set()),
  {
    error:
      "must be JSON-serialisable: only strings, finite numbers, booleans, null, arrays and plain objects, with no circular reference",
  },
);
