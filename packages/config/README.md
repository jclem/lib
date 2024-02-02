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
import { ConfigParser, envReader } from "@jclem/config";
import z from "zod";

Bun.env["DATABASE__URL"] = "mysql://localhost:3306/mydb";
Bun.env["DATABASE__POOL_SIZE"] = "10";

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

export const config = new ConfigParser(Config).read(envReader(Bun.env)).parse();

console.log(config.database.url); // mysql://localhost:3306/mydb
console.log(config.database.poolSize); // 10
```

### Reading Configuration Input

#### Reading a Raw Value

Config can read configuration input from a raw value by returning it from a
reader function:

```typescript
import { ConfigParser } from "@jclem/config";

const config = new ConfigParser(z.object({ foo: z.string() }))
  .read(() => ({ foo: "bar" }))
  .parse();

console.log(config.foo); // bar
```

A shortcut for this common case is to use `valueReader`:

```typescript
import { ConfigParser, valueReader } from "@jclem/config";

const config = new ConfigParser(z.object({ foo: z.string() }))
  .read(valueReader({ foo: "bar" }))
  .parse();

console.log(config.foo); // bar
```

#### Reading a File

Config can read a file by passing a file reader to `read`:

```typescript
import { ConfigParser } from "@jclem/config";
import { readFileSync } from "node:fs";

// config.json
// {"foo": "bar"}

const fileReader = (filePath: string) => () => Bun.file(filePath).json();

const config = new ConfigParser(z.object({ foo: z.string() }))
  .read(fileReader("config.json"))
  .parse();

console.log(config.foo); // bar
```

#### Reading the Environment

Config can read configuration input from environment variables by calling
`envReader`:

```typescript
import { ConfigParser, envReader } from "@jclem/config";

Bun.env.FOO = "bar";

const config = newParser(z.object({ foo: z.string() }))
  .read(envReader(Bun.env))
  .parse();

console.log(config.foo); // bar
```

Note that `envReader` converts schema paths to double-underscore-separated
uppercased environment variable names. So, for example, the schema path
`database.url` would be converted to the environment variable `DATABASE__URL`
and the schema path `database.poolSize` would be converted to the environment
variable `DATABASE__POOL_SIZE` (capital letters imply a single-underscore
separation).

This means that a schema with both `database.url` and `database__url` will have
both values populated from the same environment variable, `DATABASE__URL`.

It's relatively straightforward to create a custom reader that converts paths to
keys in a different way (for example, to parse command-line flags).

Config provides a function `flatReader` to easily create a custom reader for
these common scenarios. It accepts what it expects to be a flat dictionary of
string keys to values and a function that converts schema property paths to keys
in the dictionary:

```typescript
import { ConfigParser, flatReader } from "@jclem/config";

// Converts a path to a flag name (`["foo", "bar"]` -> `"foo-bar"`).
const pathToFlag = (path: string[]) => path.join("-");

const config = newParser(z.object({ foo: z.object({ bar: z.string() }) }))
  .read(flatReader({ "foo-bar": "baz" }, pathToFlag))
  .parse();

console.log(config.foo.bar); // baz
```

### Configuration Source Precedence

Config will read configuration input in the order in which they were added to
the config, with later readers taking precedence over earlier readers. For
example:

```typescript
import { ConfigParser, envReader, valueReader } from "@jclem/config";

const Schema = z.object({
  a: z.string(),
  b: z.string(),
  c: z.string(),
});

const value = { a: "a", b: "b", c: "c" };

// config.json
// {"b": "b from file", "c": "c from file"}

Bun.env.C = "c from env";

const fileReader = (filePath: string) => () => Bun.file(filePath).json();

const config = new ConfigParser(Schema)
  .read(valueReader(value))
  .read(fileReader("config.json"))
  .read(envReader(Bun.env))
  .parse();

console.log(config.a); // a
console.log(config.b); // b from file
console.log(config.c); // c from env
```
