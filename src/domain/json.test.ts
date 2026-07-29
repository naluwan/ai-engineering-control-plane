import { describe, expect, it } from "vitest";

import { jsonValueSchema } from "@/domain/json";

describe("jsonValueSchema", () => {
  it.each([
    ["null", null],
    ["a string", "plan"],
    ["a number", 42],
    ["a boolean", true],
    ["an empty object", {}],
    ["an empty array", []],
    ["a nested object", { a: { b: [1, "two", false, null] } }],
    ["an array of objects", [{ a: 1 }, { b: 2 }]],
  ])("accepts %s", (_label, value) => {
    expect(jsonValueSchema.safeParse(value).success).toBe(true);
  });

  it("rejects undefined", () => {
    expect(jsonValueSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects a function", () => {
    expect(jsonValueSchema.safeParse(() => "nope").success).toBe(false);
  });

  it("rejects a symbol", () => {
    expect(jsonValueSchema.safeParse(Symbol("nope")).success).toBe(false);
  });

  it("rejects a bigint", () => {
    // BigInt(10) rather than a 10n literal: the compile target is ES2017.
    expect(jsonValueSchema.safeParse(BigInt(10)).success).toBe(false);
  });

  it("rejects NaN and Infinity, which JSON cannot represent", () => {
    expect(jsonValueSchema.safeParse(Number.NaN).success).toBe(false);
    expect(jsonValueSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(
      false,
    );
  });

  it("rejects a nested undefined value", () => {
    expect(jsonValueSchema.safeParse({ a: { b: undefined } }).success).toBe(
      false,
    );
  });

  it("rejects a nested function", () => {
    expect(
      jsonValueSchema.safeParse({ a: [1, () => "nope"] }).success,
    ).toBe(false);
  });

  it("rejects a directly circular object without overflowing the stack", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(jsonValueSchema.safeParse(circular).success).toBe(false);
  });

  it("rejects an indirectly circular object", () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = { a };
    a.b = b;

    expect(jsonValueSchema.safeParse(a).success).toBe(false);
  });

  it("rejects a circular array", () => {
    const items: unknown[] = [];
    items.push(items);

    expect(jsonValueSchema.safeParse(items).success).toBe(false);
  });

  it("accepts a shared, non-circular reference appearing twice", () => {
    const shared = { value: 1 };

    expect(jsonValueSchema.safeParse({ a: shared, b: shared }).success).toBe(
      true,
    );
  });

  it("accepts an object created with a null prototype", () => {
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.value = 1;

    expect(jsonValueSchema.safeParse(nullPrototype).success).toBe(true);
  });

  it("accepts a nested object created with a null prototype", () => {
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.value = 1;

    expect(jsonValueSchema.safeParse({ nested: nullPrototype }).success).toBe(
      true,
    );
  });
});

/**
 * A value being `typeof "object"` does not make it JSON.
 *
 * These four are the case the original implementation got wrong: it walked
 * `Object.values()` without checking the prototype, and a `Date` has no
 * enumerable own properties — so `every()` over an empty array returned true
 * and the value was accepted. A `safeParse` success that cannot be trusted is
 * worse than no validation at all.
 */
describe("jsonValueSchema — non-plain objects", () => {
  it("rejects a Date instance", () => {
    expect(jsonValueSchema.safeParse(new Date()).success).toBe(false);
  });

  it("rejects a Map instance", () => {
    expect(jsonValueSchema.safeParse(new Map()).success).toBe(false);
  });

  it("rejects a Map that holds JSON-shaped entries", () => {
    const map = new Map<string, number>([["a", 1]]);

    expect(jsonValueSchema.safeParse(map).success).toBe(false);
  });

  it("rejects a Set instance", () => {
    expect(jsonValueSchema.safeParse(new Set()).success).toBe(false);
  });

  it("rejects a Set that holds JSON-shaped members", () => {
    const set = new Set<number>([1, 2, 3]);

    expect(jsonValueSchema.safeParse(set).success).toBe(false);
  });

  it("rejects a class instance even when every field it owns is JSON", () => {
    class PlanDraft {
      constructor(
        public readonly summary: string,
        public readonly goals: string[],
      ) {}
    }

    const instance = new PlanDraft("Restated requirement", ["ship the slice"]);

    // Its own enumerable fields are string and string[] — the value only fails
    // because its prototype is not Object.prototype.
    expect(Object.values(instance)).toEqual([
      "Restated requirement",
      ["ship the slice"],
    ]);
    expect(jsonValueSchema.safeParse(instance).success).toBe(false);
  });

  it("rejects a non-plain object nested inside a plain one", () => {
    expect(
      jsonValueSchema.safeParse({ createdAt: new Date() }).success,
    ).toBe(false);
  });

  it("rejects a non-plain object nested inside an array", () => {
    expect(jsonValueSchema.safeParse([1, new Map()]).success).toBe(false);
  });

  it("rejects a RegExp instance", () => {
    expect(jsonValueSchema.safeParse(/pattern/).success).toBe(false);
  });

  it("rejects an Error instance", () => {
    expect(jsonValueSchema.safeParse(new Error("nope")).success).toBe(false);
  });
});
