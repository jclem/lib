import { z } from "zod";

/** A {@link z.ZodObject} schema type used to define configuration */
export type ConfigSchema = z.ZodObject<z.ZodRawShape>;

type ReadRecord = { type: "record"; value: Record<string, unknown> };
type ReadFile<F> = {
  type: "file";
  path: string;
  read: (path: string) => F;
  parse: (contents: F) => unknown;
};
type ReadEnv = { type: "env"; env: Dict<string> };
type ReadFn = { type: "function"; fn: () => Record<string, unknown> };
type ReadFnAsync = {
  type: "function-async";
  fn: () => Promise<Record<string, unknown>>;
};
type ReadIn<F> = ReadRecord | ReadFile<F> | ReadEnv | ReadFn;

/**
 * A parser for configuration, that can draw from runtime values, the
 * environment, and files.
 */
export class ConfigParser<S extends ConfigSchema> {
  readonly #schema: S;
  readonly #reads: ReadIn<any>[] = [];

  constructor(schema: S) {
    this.#schema = schema;
  }

  /**
   * Add a function to the parser's read sources.
   *
   * @param fn The function to read from
   * @returns this
   */
  read(fn: () => Record<string, unknown>): this {
    this.#reads.push({ type: "function", fn });
    return this;
  }

  /**
   * Add an async function to the parser's read sources.
   *
   * @param fn The async function to read from
   * @returns An async config parser
   */
  readAsync(fn: () => Promise<Record<string, unknown>>): AsyncConfigParser<S> {
    return new AsyncConfigParser(this.#schema, [
      ...this.#reads,
      { type: "function-async", fn },
    ]);
  }

  /**
   * Add a file to the parser's read sources.
   *
   * @param path The path to the file to read
   * @param read A function to read the file
   * @param parse A function to parse the file contents
   * @returns this
   */
  readFile<F>(
    path: string,
    read: (path: string) => F,
    parse: (contents: F) => unknown,
  ): this {
    this.#reads.push({ type: "file", path, read, parse });
    return this;
  }

  /**
   * Add the environment to the parser's read sources.
   *
   * @returns this
   */
  readEnv(env: Dict<string>): this {
    this.#reads.push({ type: "env", env });
    return this;
  }

  /**
   * Add a value to the parser's read sources.
   *
   * @param value The value to read
   * @returns this
   */
  readValue(value: Record<string, unknown>): this {
    this.#reads.push({ type: "record", value });
    return this;
  }

  /**
   * Parse the configuration from the configured read sources.
   */
  parse(): z.infer<S> {
    const input = gatherSyncInputs(this.#reads, this.#schema);
    return this.#schema.parse(input);
  }

  /**
   * Safely parse the configuration from the configured read sources.
   *
   * Note that only the schema parsing is safe—other errors such as errors
   * thrown by file-readers are not safe.
   */
  safeParse(): z.SafeParseReturnType<unknown, z.infer<S>> {
    const input = gatherSyncInputs(this.#reads, this.#schema);
    return this.#schema.safeParse(input);
  }
}

/**
 * An async parser for configuration, that can draw from runtime values, the
 * environment, and files.
 */
export class AsyncConfigParser<S extends ConfigSchema> extends ConfigParser<S> {
  readonly #schema: S;
  readonly #reads: (ReadIn<any> | ReadFnAsync)[];

  constructor(schema: S, reads: (ReadIn<any> | ReadFnAsync)[]) {
    super(schema);
    this.#schema = schema;
    this.#reads = reads;
  }

  read(fn: () => Record<string, unknown>): this {
    this.#reads.push({ type: "function", fn });
    return this;
  }

  readAsync(fn: () => Promise<Record<string, unknown>>): this {
    this.#reads.push({ type: "function-async", fn });
    return this;
  }

  readFile<F>(
    path: string,
    read: (path: string) => F,
    parse: (contents: F) => unknown,
  ): this {
    this.#reads.push({ type: "file", path, read, parse });
    return this;
  }

  readEnv(env: Dict<string>): this {
    this.#reads.push({ type: "env", env });
    return this;
  }

  readValue(value: Record<string, unknown>): this {
    this.#reads.push({ type: "record", value });
    return this;
  }

  parse(): never {
    throw new Error("Cannot call `parse` on an async config parser");
  }

  async parseAsync(): Promise<z.infer<S>> {
    const input = await this.#gatherInputs();
    return this.#schema.parse(input);
  }

  safeParse(): never {
    throw new Error("Cannot call `safeParse` on an async config parser");
  }

  async safeParseAsync(): Promise<z.SafeParseReturnType<unknown, z.infer<S>>> {
    const input = await this.#gatherInputs();
    return this.#schema.safeParse(input);
  }

  async #gatherInputs() {
    const resolvedReads = this.#reads.map(async (read) => {
      switch (read.type) {
        case "function-async":
          return await read.fn();
        default:
          return gatherSyncInputs([read], this.#schema);
      }
    });

    return deepMerge(await Promise.all(resolvedReads));
  }
}

function deepMerge(inputs: Record<string, unknown>[]) {
  const output: Record<string, unknown> = {};

  inputs.map((input) => {
    for (const key in input) {
      const inputValue = input[key];
      const outputValue = output[key];

      if (isZodRecord(inputValue) && isZodRecord(outputValue)) {
        output[key] = deepMerge([outputValue, inputValue]);
      } else {
        output[key] = inputValue;
      }
    }
  });

  return output;
}

function getEnvInput(read: ReadEnv, schema: z.ZodType) {
  const input: Record<string, unknown> = {};

  const readEnvValue = (path: string[]) => {
    const envVarName = path
      .map((segment) =>
        segment
          .split(/(?=[A-Z])/)
          .map((part) => part.toUpperCase())
          .join("_"),
      )
      .join("__");

    return read.env[envVarName];
  };

  const readEnv = (path: string[], schema: z.ZodType) => {
    if (isZodObject(schema)) {
      for (const key in schema.shape) {
        readEnv([...path, key], schema.shape[key]);
      }
    } else if (isZodDefault(schema)) {
      readEnv(path, schema.removeDefault());
    } else {
      const value = readEnvValue(path);

      if (value != null) {
        let inputPosition = input;

        for (let i = 0; i < path.length; i++) {
          const key = path[i];

          if (i === path.length - 1) {
            inputPosition[key] = value;
          } else {
            inputPosition[key] ??= {};

            const newPosition = inputPosition[key];

            if (isZodRecord(newPosition)) {
              inputPosition = newPosition;
            } else {
              throw new Error(
                `Expected a record at ${path.slice(0, i).join(".")}`,
              );
            }
          }
        }
      }
    }
  };

  readEnv([], schema);

  return input;
}

function getFileInput(read: ReadFile<unknown>) {
  const input = read.parse(read.read(read.path));

  if (!isZodRecord(input)) {
    throw new Error(
      `Failed to parse file at ${
        read.path
      } into a record with string keys (got ${typeof input})`,
    );
  }

  return input;
}

function gatherSyncInputs(reads: ReadIn<any>[], schema: z.ZodType) {
  const resolvedReads = reads.map((read) => {
    switch (read.type) {
      case "env":
        return getEnvInput(read, schema);
      case "file":
        return getFileInput(read);
      case "function":
        return read.fn();
      case "record":
        return read.value;
    }
  });

  return deepMerge(resolvedReads);
}

function isZodRecord(value: unknown): value is Record<string, unknown> {
  return z.record(z.string(), z.unknown()).safeParse(value).success;
}

function isZodObject(value: unknown): value is z.ZodObject<z.ZodRawShape> {
  return value instanceof z.ZodObject;
}

function isZodDefault(value: unknown): value is z.ZodDefault<z.ZodType> {
  return value instanceof z.ZodDefault;
}
