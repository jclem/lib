import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import z from "zod";
import { newParser } from "./config";

const BasicConfig = z.object({
  string: z.string(),
  number: z.number(),
  object: z.object({
    a: z.string().optional(),
    b: z.string().optional(),
    c: z.string().optional(),
  }),
});

const readFile = (path: string) => readFileSync(path).toString();

it("parses a basic config file", () => {
  const filePath = path.join(import.meta.dir, "../fixtures/config1.json");

  const config = newParser(BasicConfig)
    .readFile(filePath, readFile, JSON.parse)
    .parse();

  expect(config.string).toStrictEqual("string");
  expect(config.number).toStrictEqual(1);
  expect(config.object).toStrictEqual({ a: "a", b: "b" });
});

it("deep-merges multiple configs", () => {
  const config1Path = path.join(import.meta.dir, "../fixtures/config1.json");
  const config2Path = path.join(import.meta.dir, "../fixtures/config2.json");

  const config = newParser(BasicConfig.extend({ foo: z.string() }))
    .readValue({ foo: "bar", string: "string0" })
    .readFile(config1Path, readFile, JSON.parse)
    .readFile(config2Path, readFile, JSON.parse)
    .parse();

  expect(config).toStrictEqual({
    foo: "bar",
    string: "string",
    number: 1,
    object: { a: "a", b: "b", c: "c" },
  });
});

it("reads from the environment", () => {
  const config = newParser(z.object({ foo: z.string() }))
    .readEnv({ FOO: "bar" })
    .parse();
  expect(config.foo).toStrictEqual("bar");

  const nestedConfig = newParser(
    z.object({ foo: z.object({ bar: z.string() }) }),
  )
    .readEnv({ FOO__BAR: "baz" })
    .parse();
  expect(nestedConfig.foo.bar).toStrictEqual("baz");
});

it("reads from a function", () => {
  const config = newParser(z.object({ foo: z.string() }))
    .read(() => ({ foo: "bar" }))
    .parse();
  expect(config.foo).toStrictEqual("bar");
});

it("merges value, file, function, environment", () => {
  const filePath = path.join(import.meta.dir, "../fixtures/config1.json");

  const config = newParser(BasicConfig.extend({ fnValue: z.string() }))
    .readValue({ string: "string from value", number: -1 })
    .readFile(filePath, readFile, JSON.parse)
    .readEnv({ OBJECT__A: "a from env", OBJECT__C: "c from env" })
    .read(() => ({ fnValue: "hi" }))
    .parse();

  expect(config.string).toEqual("string");
  expect(config.number).toEqual(1);
  expect(config.object).toEqual({ a: "a from env", b: "b", c: "c from env" });
  expect(config.fnValue).toEqual("hi");
});

it("handles camel-cased names in env vars", () => {
  const config = newParser(z.object({ fooBar: z.string(), foobar: z.string() }))
    .readEnv({ FOO_BAR: "baz", FOOBAR: "qux" })
    .parse();

  expect(config.fooBar).toEqual("baz");
  expect(config.foobar).toEqual("qux");
});

it("handles conflicting property names and object paths", () => {
  const config = newParser(
    z.object({
      fooBar: z.string(),
      foo_bar: z.string(),
    }),
  )
    .readEnv({ FOO_BAR: "baz" })
    .parse();

  expect(config.foo_bar).toEqual("baz");
  expect(config.fooBar).toEqual("baz");
});

it("handles preprocessing", () => {
  const config = newParser(
    z.object({
      count: z.preprocess(
        (v) => (typeof v === "string" ? parseInt(v, 10) : v),
        z.number(),
      ),
    }),
  )
    .readEnv({ COUNT: "1" })
    .parse();

  expect(config.count).toEqual(1);
});

it("parses asynchronously", async () => {
  const path1 = path.join(import.meta.dir, "../fixtures/config1.json");
  const path2 = path.join(import.meta.dir, "../fixtures/config2.json");
  const config = await newParser(BasicConfig.extend({ async: z.string() }))
    .readAsync(async () => Promise.resolve({ async: "yes" }))
    .readFile(path1, readFile, JSON.parse)
    .readFile(path2, readFile, JSON.parse)
    .parseAsync();

  expect(config.string).toEqual("string");
  expect(config.number).toEqual(1);
  expect(config.object).toEqual({ a: "a", b: "b", c: "c" });
  expect(config.async).toEqual("yes");
});

it("parses asynchronously safely", async () => {
  const path1 = path.join(import.meta.dir, "../fixtures/config1.json");
  const path2 = path.join(import.meta.dir, "../fixtures/config2.json");
  const result = await newParser(BasicConfig.extend({ async: z.string() }))
    .readAsync(async () => Promise.resolve({ async: "yes" }))
    .readFile(path1, readFile, JSON.parse)
    .readFile(path2, readFile, JSON.parse)
    .safeParseAsync();

  if (!result.success) expect.unreachable();

  expect(result.data.string).toEqual("string");
  expect(result.data.number).toEqual(1);
  expect(result.data.object).toEqual({ a: "a", b: "b", c: "c" });
  expect(result.data.async).toEqual("yes");
});

it("parses safely", () => {
  const config = newParser(z.object({ foo: z.string() }))
    .readValue({ foo: "foo" })
    .safeParse();

  if (!config.success) expect.unreachable();
  expect(config.data.foo).toEqual("foo");
});

it("parses safely with an error", () => {
  const config = newParser(z.object({ foo: z.string() }))
    .readValue({ foo: 1 })
    .safeParse();

  if (config.success) expect.unreachable();

  expect(config.error).toEqual(
    z.ZodError.create([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["foo"],
        message: "Expected string, received number",
      },
    ]),
  );
});

describe("objects", () => {
  it("handles basic objects", () => {
    const Config = z.object({
      log: z.object({
        level: z.enum(["info", "warn"]),
        format: z.enum(["json", "pretty"]),
      }),
    });
    const config = newParser(Config)
      .readValue({ log: { level: "info", format: "pretty" } })
      .parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");
  });

  it("handles default object keys", () => {
    const Config = z.object({
      log: z
        .object({
          format: z.enum(["json", "pretty"]).default("pretty"),
          level: z.enum(["info", "warn"]).default("info"),
        })
        .default({}),
    });

    let config = newParser(Config).readValue({}).parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");

    config = newParser(Config)
      .readValue({ log: { format: "json" } })
      .parse();

    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("json");
  });

  it("handles default object keys from environment", () => {
    const Config = z.object({
      log: z
        .object({
          format: z.enum(["json", "pretty"]).default("pretty"),
          level: z.enum(["info", "warn"]).default("info"),
        })
        .default({}),
    });

    let config = newParser(Config).readEnv({}).parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");

    config = newParser(Config).readEnv({ LOG__FORMAT: "json" }).parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("json");
  });
});
