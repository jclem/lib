# @jclem/cli

Parses command-line arguments into a set of positional args and a map of flags.

## Usage

```typescript
import { parseArgs } from "@jclem/cli";

// Bun.args = ["bun", "run-script", "--foo=foo", "--foo=foo2", "bar", "baz"]
const parsed = parseArgs(Bun.args.slice(2));

// {
//   positional: ["bar", "baz"],
//   flags: new Map([["foo", ["foo", "foo2"]]])
// }
```
