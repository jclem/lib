import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import z from "zod";
import { ConfigParser, envReader, flatReader, valueReader } from "./config";

const BasicConfig = z.object({
  string: z.string(),
  number: z.number(),
  object: z.object({
    a: z.string().optional(),
    b: z.string().optional(),
    c: z.string().optional(),
  }),
});

const fileReader = (filePath: string) => () =>
  Bun.file(path.join(import.meta.dir, "..", filePath)).json();

describe("read", () => {
  it("reads an arbitrary object", async () => {
    const config = await new ConfigParser(z.object({ foo: z.string() }))
      .read(() => ({ foo: "bar" }))
      .parse();

    expect(config).toStrictEqual({ foo: "bar" });
  });

  it("provides the schema to the reader", async () => {
    const parser = new ConfigParser(z.object({ foo: z.string() }));
    const config = await parser
      .read((schema) => {
        return Object.keys(schema.shape).reduce(
          (out, key) => ({ ...out, [key]: "bar" }),
          {},
        );
      })
      .parse();

    expect(config).toStrictEqual({ foo: "bar" });
  });

  it("deep-merges multiple configs", async () => {
    const config = await new ConfigParser(
      BasicConfig.extend({ foo: z.string() }),
    )
      .read(() => ({ foo: "bar", string: "string0" }))
      .read(fileReader("fixtures/config1.json"))
      .read(fileReader("fixtures/config2.json"))
      .parse();

    expect(config).toStrictEqual({
      foo: "bar",
      string: "string",
      number: 1,
      object: { a: "a", b: "b", c: "c" },
    });
  });

  it("merges value, file, function, environment", async () => {
    const config = await new ConfigParser(
      BasicConfig.extend({ fnValue: z.string() }),
    )
      .read(() => ({ string: "string from value", number: -1 }))
      .read(fileReader("fixtures/config1.json"))
      .read(envReader({ OBJECT__A: "a from env", OBJECT__C: "c from env" }))
      .read(() => ({ fnValue: "hi" }))
      .parse();

    expect(config.string).toEqual("string");
    expect(config.number).toEqual(1);
    expect(config.object).toEqual({ a: "a from env", b: "b", c: "c from env" });
    expect(config.fnValue).toEqual("hi");
  });

  it("handles preprocessing", async () => {
    const config = await new ConfigParser(
      z.object({
        count: z.preprocess(
          (v) => (typeof v === "string" ? parseInt(v, 10) : v),
          z.number(),
        ),
      }),
    )
      .read(() => ({ count: "1" }))
      .parse();

    expect(config.count).toEqual(1);
  });

  it("parses safely", async () => {
    const config = await new ConfigParser(z.object({ foo: z.string() }))
      .read(() => ({ foo: "foo" }))
      .safeParse();

    if (!config.success) expect.unreachable();
    expect(config.data.foo).toEqual("foo");
  });

  it("parses safely with an error", async () => {
    const config = await new ConfigParser(z.object({ foo: z.string() }))
      .read(() => ({ foo: 1 }))
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
});

describe("valueReader", () => {
  it("reads the given value", async () => {
    const config = await new ConfigParser(z.object({ foo: z.string() }))
      .read(valueReader({ foo: "bar" }))
      .parse();

    expect(config).toStrictEqual({ foo: "bar" });
  });
});

describe("envReader", () => {
  it("reads from an environment", async () => {
    const parser = new ConfigParser(
      z.object({
        log: z.object({
          level: z.string(),
          format: z.string(),
        }),
      }),
    );

    const config = await parser
      .read(envReader({ LOG__LEVEL: "info", LOG__FORMAT: "pretty" }))
      .parse();

    expect(config).toStrictEqual({
      log: { level: "info", format: "pretty" },
    });
  });

  it("handles complex configurations", async () => {
    const schema = z.object({
      port: z.coerce.number(),
      log: z
        .object({
          level: z.enum(["debug", "info", "warn", "error"]).default("info"),
          format: z.enum(["json", "pretty"]).default("pretty"),
        })
        .default({}),
    });

    const config = schema.parse({ port: "3000" });

    expect(config).toStrictEqual({
      port: 3000,
      log: { level: "info", format: "pretty" },
    });

    const parsed = await new ConfigParser(schema)
      .read(envReader({ PORT: "3000", LOG__LEVEL: "debug" }))
      .parse();

    expect(parsed).toStrictEqual({
      port: 3000,
      log: { level: "debug", format: "pretty" },
    });
  });

  it("handles conflicting property names and object paths", async () => {
    const config = await new ConfigParser(
      z.object({
        fooBar: z.string(),
        foo_bar: z.string(),
      }),
    )
      .read(envReader({ FOO_BAR: "baz" }))
      .parse();

    expect(config.foo_bar).toEqual("baz");
    expect(config.fooBar).toEqual("baz");
  });

  it("handles camel-cased names in env vars", async () => {
    const config = await new ConfigParser(
      z.object({ fooBar: z.string(), foobar: z.string() }),
    )
      .read(envReader({ FOO_BAR: "baz", FOOBAR: "qux" }))
      .parse();

    expect(config.fooBar).toEqual("baz");
    expect(config.foobar).toEqual("qux");
  });
});

describe("flatReader", () => {
  it("reads from a flat record", async () => {
    const parser = new ConfigParser(
      z.object({
        log: z.object({
          level: z.string(),
          format: z.string(),
        }),
      }),
    );

    const reader = flatReader(
      { "log-level": "info", "log-format": "pretty" },
      (path) => path.join("-"),
    );

    const config = await parser.read(reader).parse();

    expect(config).toStrictEqual({
      log: { level: "info", format: "pretty" },
    });
  });
});

describe("objects", () => {
  it("handles basic objects", async () => {
    const Config = z.object({
      log: z.object({
        level: z.enum(["info", "warn"]),
        format: z.enum(["json", "pretty"]),
      }),
    });
    const config = await new ConfigParser(Config)
      .read(() => ({ log: { level: "info", format: "pretty" } }))
      .parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");
  });

  it("handles default object keys", async () => {
    const Config = z.object({
      log: z
        .object({
          format: z.enum(["json", "pretty"]).default("pretty"),
          level: z.enum(["info", "warn"]).default("info"),
        })
        .default({}),
    });

    let config = await new ConfigParser(Config).read(() => ({})).parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");

    config = await new ConfigParser(Config)
      .read(() => ({ log: { format: "json" } }))
      .parse();

    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("json");
  });

  it("handles default object keys from environment", async () => {
    const Config = z.object({
      log: z
        .object({
          format: z.enum(["json", "pretty"]).default("pretty"),
          level: z.enum(["info", "warn"]).default("info"),
        })
        .default({}),
    });

    let config = await new ConfigParser(Config).read(envReader({})).parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("pretty");

    config = await new ConfigParser(Config)
      .read(envReader({ LOG__FORMAT: "json" }))
      .parse();
    expect(config.log.level).toEqual("info");
    expect(config.log.format).toEqual("json");
  });
});
