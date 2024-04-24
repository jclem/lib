/** An error thrown when an unwrap fails. */
export class UnwrapError<T> extends Error {
  readonly value: T;

  constructor(value: T) {
    super("Unwrap Error");
    this.value = value;
  }
}

/** Represents a result of an operation that can return one of two types of values. */
export type Either<L, R> = Left<L> | Right<R>;

/** Represents a value that is the left result of an operation. */
export type Left<L> = {
  type: "left";
  value: L;
};

/** Represents a value that is the right result of an operation. */
export type Right<R> = {
  type: "right";
  value: R;
};

/** Create a left value. */
export function Left<V>(value: V): Left<V> {
  return { type: "left", value };
}

/** Create a right value. */
export function Right<V>(value: V): Right<V> {
  return { type: "right", value };
}

/** Unwrap the left or right value or throw an error. */
export function unwrapEither<S extends "left" | "right", L, R>(
  side: S,
  either: Either<L, R>,
): S extends "left" ? L : R {
  if (either.type === side) {
    return either.value as S extends "left" ? L : R;
  } else {
    throw new UnwrapError(either.value);
  }
}

/** A type that can be a given value or no value. */
export type Option<T> = Some<T> | None;

/** Represents a value that is present. */
export type Some<T> = {
  type: "some";
  value: T;
};

/** Represents a value that is not present. */
export type None = {
  type: "none";
};

/** Unwrap an option value or throw an error. */
export function unwrapOption<T>(option: Option<T>): T {
  if (option.type === "some") {
    return option.value;
  } else {
    throw new UnwrapError(None());
  }
}

/** Create a "some" value. */
export function Some<T>(value: T): Some<T> {
  return { type: "some", value };
}

/** Create a "none" value. */
export function None(): None {
  return { type: "none" };
}

/** Represents the result of an operation that may succeed or fail. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Represents a successful result. */
export type Ok<T> = {
  ok: true;
  value: T;
};

/** Represents a failed result. */
export type Err<E> = {
  ok: false;
  value: E;
};

/** Create a successful result. */
export function Ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Create a failed result. */
export function Err<E>(value: E): Err<E> {
  return { ok: false, value };
}

/** Unwrap a successful result or throw the error. */
export function unwrapResult<T>(result: Result<T, unknown>): T {
  if (result.ok) {
    return result.value;
  } else {
    throw new UnwrapError(result.value);
  }
}

/**
 * Try to run a function and return a successful result if it succeeds or a
 * failed result if it throws an error.
 */
export function tryCatch<T>(fn: () => T): Result<T, unknown> {
  try {
    return Ok(fn());
  } catch (error) {
    return Err(error);
  }
}

/**
 * Try to run an async function and return a successful result if it succeeds or
 * a failed result if it throws an error.
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, unknown>> {
  return fn().then(Ok, Err);
}
