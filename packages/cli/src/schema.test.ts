import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { parseArgs } from "./cli.js";

const string = z.tuple([z.string()]).transform(([v]) => v);
const boolean = z.tuple([z.boolean()]).transform(([v]) => v);

describe("parsing a Zod schema", () => {
  const mySchema = z.object({
    positional: z.tuple([z.string(), z.coerce.number()]),
    flags: z.object({
      foo: string,
      t: boolean,
    }),
  });

  it("parses positional arguments and flags", () => {
    const parsedArgs = parseArgs(["--foo=bar", "abc", "123", "-t"]);
    const result = mySchema.parse(parsedArgs);

    expect(result).toEqual({
      positional: ["abc", 123],
      flags: { foo: "bar", t: true },
    });
  });
});
