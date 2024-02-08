# @jclem/assert

Provides a set of TypeScript-friendly functions for asserting values and types
of values.

## Installation

```shell
bun add @jclem/assert
```

## Usage

This package works by making assertions about a value, and then _returning_ the
value. This means that it works differently from other type assertions in
TypeScript such as `asserts value is Type` or `value is Type`. In order to make
use of the type-constrained value, you must use the returned value.

```typescript
import {
  assert,
  assertString,
  assertType,
  assertInstance,
} from "@jclem/assert";

class Foo {
  name = "foo";
}

function maybeValue<T>(value: T): T | null {
  return Math.random() > 0.5 ? value : null;
}

// Assert that a value is non-null and is defined.
const value = assert(maybeValue("Hello"));
value.length; // => 5

// Note that the returned value must be used.
const maybeString = maybeValue("Hello");
const definitelyString = assert(maybeString);
definitelyString.length; // => 5
// @ts-expect-error
maybeString.length; // => Error: Object is possibly 'null'.

// Assert that a value is a string
const str = assertString(maybeValue("Hello"));
str.length; // => 5

// Assert that a value is of a specific type
const bigint = assertType(maybeValue(1n), "bigint");
bigint.length; // => 1n

// Assert that a value is an instance of a class
const foo = assertInstance(maybeValue(new Foo()), Foo);
foo.name; // => 'foo'
```
