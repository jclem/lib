import { z } from "zod";
import { isZodDefault, isZodObject, isZodRecord } from "./zod.js";

/** A {@link z.ZodObject} schema type used to define configuration */
export type ConfigSchema = z.ZodObject<z.ZodRawShape>;

/** A value or promise resolving to a value */
export type Awaitable<T> = T | Promise<T>;

/** A function that takes a Zod schema and returns an awaitable input to be parsed by that schema */
export type Reader<S extends ConfigSchema> = (schema: S) => Awaitable<unknown>;

type ParseTarget = Record<string, unknown>;

/**
 * A parser for configuration, that can draw from runtime values, the
 * environment, and files.
 */
export class ConfigParser<S extends ConfigSchema> {
  readonly #schema: S;
  readonly #readers: Reader<S>[] = [];

  constructor(schema: S) {
    this.#schema = schema;
  }

  /**
   * Add a function to the parser's read sources.
   *
   * @param reader The function to read from
   * @returns this
   */
  read(reader: Reader<S>): this {
    this.#readers.push(reader);
    return this;
  }

  /**
   * Parse the configuration from the configured read sources.
   */
  async parse(): Promise<z.infer<S>> {
    const input = await gatherInputs(this.#readers, this.#schema);
    return this.#schema.parse(input);
  }

  /**
   * Safely parse the configuration from the configured read sources.
   *
   * Note that only the schema parsing is safe—other errors such as errors
   * thrown by file-readers are not safe.
   */
  async safeParse(): Promise<z.SafeParseReturnType<unknown, z.infer<S>>> {
    const input = await gatherInputs(this.#readers, this.#schema);
    return this.#schema.safeParse(input);
  }
}

/**
 * Create a reader that reads from the given environment.
 *
 * Paths to configuration keys are converted to uppercase snake case, and nested
 * paths are separated by double underscores.
 *
 * @param env The environment to read from (a flat dictionary of string keys to string values)
 * @returns A reader function that reads from the environment
 */
export function envReader<S extends ConfigSchema>(
  env: Dict<unknown>,
): Reader<S> {
  return flatReader(env, (path: string[]) =>
    path
      .map((segment) =>
        segment
          .split(/(?=[A-Z])/)
          .map((part) => part.toUpperCase())
          .join("_"),
      )
      .join("__"),
  );
}

/**
 * Create a reader that just reads the given value.
 *
 * @param value The value to read
 * @returns A reader function that reads the value
 */
export function valueReader<S extends ConfigSchema>(value: unknown): Reader<S> {
  return () => value;
}

/**
 * Read values from keys in a flat dictionary.
 *
 * @param record The record to read from
 * @param pathToKey A function that converts a path to a key
 * @returns A reader function that reads from the record
 */
export function flatReader<S extends ConfigSchema>(
  record: Dict<unknown>,
  pathToKey: (path: string[]) => string,
): Reader<S> {
  return (schema) => {
    return readFlatRecord(record, schema, pathToKey);
  };
}

function readFlatRecord<S extends ConfigSchema>(
  env: Dict<unknown>,
  schema: S,
  pathToKey: (path: string[]) => string,
) {
  const readInput = (
    input: ParseTarget,
    schema: z.ZodType,
    path: string[] = [],
  ): ParseTarget => {
    if (isZodObject(schema)) {
      for (const key in schema.shape) {
        readInput(input, schema.shape[key], [...path, key]);
      }
    } else if (isZodDefault(schema)) {
      readInput(input, schema.removeDefault(), path);
    } else {
      const value = env[pathToKey(path)];

      if (value != null) {
        path.reduce<ParseTarget>((position, key, i) => {
          if (i === path.length - 1) {
            position[key] = value;
            return position;
          } else {
            position[key] ??= {};

            const newPosition = position[key];

            if (isZodRecord(newPosition)) {
              return newPosition;
            } else {
              throw new Error(
                `Expected a record at ${path.slice(0, i).join(".")}`,
              );
            }
          }
        }, input);
      }
    }

    return input;
  };

  return readInput({}, schema);
}

async function gatherInputs<S extends ConfigSchema>(
  reads: Reader<S>[],
  schema: S,
) {
  const resolvedReads = await Promise.all(
    reads.map(async (read) => {
      const resolved = await read(schema);

      if (!isZodRecord(resolved)) {
        throw new Error(
          "Expected reader to return a record with string keys, but got something else.",
        );
      }

      return resolved;
    }),
  );

  return deepMerge(resolvedReads);
}

function deepMerge(inputs: ParseTarget[]) {
  const output: ParseTarget = {};

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
