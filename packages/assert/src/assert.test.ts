import { describe, expect, test } from "bun:test";
import {
  assert,
  assertEquals,
  assertInstance,
  assertString,
  assertType,
} from "./assert";

describe("assert", () => {
  test("passes with a defined value", () => {
    expect(assert(1)).toBe(1);
  });

  test("passes with a falsey value", () => {
    expect(assert(false)).toBe(false);
  });

  test("raises with null", () => {
    expect(() => assert(null)).toThrow("Expected value, but got none");
  });

  test("raises with undefined", () => {
    expect(() => assert(undefined)).toThrow("Expected value, but got none");
  });

  test("raises with a custom message", () => {
    expect(() => assert(undefined, "Custom message")).toThrow("Custom message");
  });
});

describe("assertString", () => {
  test("passes with a string", () => {
    expect(assertString("hello")).toBe("hello");
  });

  test("passes with an empty string", () => {
    expect(assertString("")).toBe("");
  });

  test("raises with a non-string", () => {
    expect(() => assertString(1)).toThrow(
      "Expected a string, but got another type",
    );
  });

  test("raises with a custom message", () => {
    expect(() => assertString(1, "Custom message")).toThrow("Custom message");
  });
});

describe("assertType", () => {
  test("passes with a string", () => {
    expect(assertType("hello", "string")).toBe("hello");
  });

  test("fails with a non-string", () => {
    expect(() => assertType(1, "string")).toThrow(
      "Expected a string, but got another type",
    );
  });

  test("passes with a number", () => {
    expect(assertType(1, "number")).toBe(1);
  });

  test("fails with a non-number", () => {
    expect(() => assertType("hello", "number")).toThrow(
      "Expected a number, but got another type",
    );
  });

  test("passes with a bigint", () => {
    expect(assertType(BigInt(1), "bigint")).toBe(BigInt(1));
  });

  test("fails with a non-bigint", () => {
    expect(() => assertType(1, "bigint")).toThrow(
      "Expected a bigint, but got another type",
    );
  });

  test("passes with a boolean", () => {
    expect(assertType(true, "boolean")).toBe(true);
  });

  test("fails with a non-boolean", () => {
    expect(() => assertType("hello", "boolean")).toThrow(
      "Expected a boolean, but got another type",
    );
  });

  test("passes with a symbol", () => {
    const symbol = Symbol();
    expect(assertType(symbol, "symbol")).toBe(symbol);
  });

  test("fails with a non-symbol", () => {
    expect(() => assertType("hello", "symbol")).toThrow(
      "Expected a symbol, but got another type",
    );
  });

  test("passes with undefined", () => {
    expect(assertType(undefined, "undefined")).toBe(undefined);
  });

  test("fails with a non-undefined", () => {
    expect(() => assertType("hello", "undefined")).toThrow(
      "Expected a undefined, but got another type",
    );
  });

  test("passes with an object", () => {
    expect(assertType({}, "object")).toEqual({});
  });

  test("passes with null", () => {
    expect(assertType(null, "object")).toBe(null);
  });

  test("fails with a non-object", () => {
    expect(() => assertType("hello", "object")).toThrow(
      "Expected a object, but got another type",
    );
  });

  test("passes with a function", () => {
    expect(assertType(() => {}, "function")).toEqual(expect.any(Function));
  });

  test("fails with a non-function", () => {
    expect(() => assertType("hello", "function")).toThrow(
      "Expected a function, but got another type",
    );
  });
});

describe("assertInstance", () => {
  test("passes with an instance of a class", () => {
    class Test {}
    expect(assertInstance(new Test(), Test)).toEqual(expect.any(Test));
  });

  test("fails with a non-instance", () => {
    class Test {}
    expect(() => assertInstance({}, Test)).toThrow(
      "Expected an instance of Test, but got another type",
    );
  });
});

describe("assertEquals", () => {
  test("passes with strictly equal values", () => {
    expect(assertEquals(1, 1)).toBe(1);
  });

  test("fails with non-equal values", () => {
    expect(() => assertEquals(1, 2)).toThrow("Values are not equal");
  });
});
