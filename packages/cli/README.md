# @jclem/cli

Parses command-line arguments into a set of positional args and a map of flags.

## Usage

First, you can parse arguments into separate positional and named flags. All
flags are parsed into arrays of `(string | true)` (value-less flags are parsed
as `true`).

```typescript
import { parseArgs } from "@jclem/cli";

// Bun.args = ["bun", "run-script", "--foo=foo", "--foo=foo2", "bar", "baz"]
const parsed = parseArgs(Bun.args.slice(2));

// {
//   positional: ["bar", "baz"],
//   flags: { foo: ["foo", "foo2"] }
// }
```

Although this package has no direct dependency on [Zod](https://zod.dev), it is
easy to use Zod to parse the flags into a more structured format.

```typescript
import { z } from "zod";

const string = z.tuple([z.string()]).transform(([v]) => v);
const boolean = z.tuple([z.boolean()]).transform(([v]) => v);

const mySchema = z.object({
  positional: z.tuple([z.string(), z.coerce.number()]),
  flags: z.object({
    foo: string,
    t: boolean,
  }),
});

// Bun.args = ["bun", "run-script", "--foo=bar", "-t", "abc", "123"]
const parsedArgs = parseArgs(Bun.args.slice(2));
const result = mySchema.parse(parsedArgs);

// {
//   positional: ["abc", 123],
//   flags: { foo: "bar", t: true },
// }
```
