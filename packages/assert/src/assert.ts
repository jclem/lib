/**
 * Assert that `value` is not undefined or null.
 *
 * @param value The value to assert exists
 * @param message An error message for the thrown error if `value` is undefined or null
 * @returns The non-null-non-undefined value
 */
export function assert<T>(
  value: T | undefined | null,
  message = "Expected value, but got none",
): T {
  if (value == null) {
    throw new Error(message);
  }

  return value;
}

/**
 * Assert that `value` is a string.
 *
 * @param value The value to assert is a string
 * @param message An error message for the thrown error if `value` is not a string
 * @returns The string value
 */
export function assertString(
  value: unknown,
  message = "Expected a string, but got another type",
): string {
  return assertType(value, "string", message);
}

type TypeofMap = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  object: object | null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  function: Function;
};

/**
 * Assert that `value` is of the given type.
 *
 * @param value The value to assert is of the given type
 * @param type The type to assert the value is
 * @param message An error message for the thrown error if `value` is not of the given type
 * @returns The value
 */
export function assertType<K extends keyof TypeofMap>(
  value: unknown,
  type: K,
  message = `Expected a ${type}, but got another type`,
): TypeofMap[K] {
  if (typeof value !== type) {
    throw new Error(message);
  }

  return value as TypeofMap[K];
}

/**
 * Assert that `value` is an instance of the given type.
 *
 * @param value The value to assert is an instance of the given type
 * @param type The type to assert the value is an instance of
 * @param message An error message for the thrown error if `value` is not an instance of the given type
 * @returns The value
 */
export function assertInstance<T extends abstract new (...args: any) => any>(
  value: unknown,
  type: T,
  message = `Expected an instance of ${type.name}, but got another type`,
): InstanceType<T> {
  if (!(value instanceof type)) {
    throw new Error(message);
  }

  return value;
}

/**
 * Assert that `val1` is equal to `val2` by strict comparison.
 *
 * Note that `val2` is returned.
 *
 * @param val1 The value to compare
 * @param val2 The value to assert is `val1` is equal to
 * @param message An error message for the thrown error if `val1` is not equal to `val2`
 * @returns `val2`
 */
export function assertEquals<T>(
  val1: unknown,
  val2: T,
  message = "Values are not equal",
): T {
  if (val1 !== val2) {
    throw new Error(message);
  }

  return val2;
}

/**
 * Assert that `value` matches the given predicate.
 *
 * @param value The value to assert matches the predicate
 * @param predicate The predicate to assert the value matches
 * @param message An error message for the thrown error if `value` does not match the predicate
 * @returns The value
 */
export function assertPredicate<T>(
  value: unknown,
  predicate: (value: unknown) => value is T,
  message = "Value does not match predicate",
): T {
  if (!predicate(value)) {
    throw new Error(message);
  }

  return value;
}
