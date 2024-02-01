# @jclem/config

This is a configuration library for JavaScript runtimes. Inspired by the
excellent [Viper](https://github.com/spf13/viper) library for Go, Config allows
one to stop relying on reading from unstructured, untyped, and unsafe
environment variables for runtime configuration and instead use a structured,
typed, and safe configuration schema populated by raw values, configuration
files, and the environment, instead.

Config uses [Zod](https://zod.dev) for schema validation.

## Use

```shell
$ bun add @jclem/config
```

```typescript
import { newParser } from "@jclem/config";
import z from "zod";

process.env["DATABASE__URL"] = "mysql://localhost:3306/mydb";
process.env["DATABASE__POOL_SIZE"] = "10";

// Define a configuration schema using Zod.
const Config = z.object({
  database: z.object({
    url: z.string(),
    poolSize: z.preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number(),
    ),
  }),
});

export const config = newParser(Config).readEnv(Bun.env).parse();

console.log(config.database.url); // mysql://localhost:3306/mydb
console.log(config.database.poolSize); // 10
```

### Reading Configuration Input

#### Reading a Raw Value

Config can read configuration input from a raw value by calling `readValue`:

```typescript
import { newParser } from "@jclem/config";

const config = newParser(z.object({ foo: z.string() }))
  .readValue({ foo: "bar" })
  .parse();

console.log(config.foo); // bar
```

#### Reading a Configuration File

Config can read configuration input from a JSON file by calling `readFile`:

```typescript
import { newParser } from "@jclem/config";
import { readFileSync } from "node:fs";

// config.json
// {"foo": "bar"}

const readFile = (path: string) => readFileSync(path).toString();

const config = newParser(z.object({ foo: z.string() }))
  .readFile("config.json", readFile, JSON.parse)
  .parse();

console.log(config.foo); // bar
```

A non-JSON file can also be read by supplying a tuple containing a file path and
a parser function with the signature `(data: Buffer) => unknown`:

```typescript
import { newParser } from "@jclem/config";
import { load as yamlParse } from "js-yaml";
import { readFileSync } from "node:fs";

// config.yaml
// foo: bar

const readFile = (path: string) => readFileSync(path).toString();

const config = newParser(z.object({ foo: z.string() }))
  .readFile("config.yaml", readFile, yamlParse)
  .parse();

console.log(config.foo); // bar
```

#### Reading the Environment

Config can read configuration input from environment variables by calling
`readEnv`:

```typescript
import { newParser } from "@jclem/config";

Bun.env.FOO = "bar";

const config = newParser(z.object({ foo: z.string() }))
  .readEnv(Bun.env)
  .parse();

console.log(config.foo); // bar
```

Note that currently, Config converts schema paths to double-underscore-separated
uppercased environment variable names. So, for example, the schema path
`database.url` would be converted to the environment variable `DATABASE__URL`
and the schema path `database.poolSize` would be converted to the environment
variable `DATABASE__POOL_SIZE` (capital letters imply a single-underscore
separation).

Note that this means that a schema with both `database.url` and `database__url`
will have both values populated from the same environment variable,
`DATABASE__URL`.

### Configuration Source Precedence

Config will read configuration input in the order in which there were added to
the config, with later sources taking precedence over earlier sources. For
example:

```typescript
import { newParser } from "@jclem/config";

const Schema = z.object({
  a: z.string(),
  b: z.string(),
  c: z.string(),
});

const value = { a: "a", b: "b", c: "c" };

// config.json
// {"b": "b from file", "c": "c from file"}

Bun.env.C = "c from env";

const config = newParser(Schema)
  .readValue(value)
  .readFile("config.json", readFile, JSON.parse)
  .readEnv(Bun.env)
  .parse();

console.log(config.a); // a
console.log(config.b); // b from file
console.log(config.c); // c from env
```
