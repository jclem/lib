/** Represents an OK or not OK state, wrapping a value or an error */
export type Result<T, E> = ResultOk<T> | ResultError<E>

/** An OK state, wrapping a value */
export type ResultOk<T> = {ok: true; value: T}

/** A not OK state, wrapping an error */
export type ResultError<E> = {ok: false; error: E}

/**
 * Wrap the given value in a {@link ResultOk}.
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * console.log(result.ok)    // true
 * console.log(result.value) // 42
 * ```
 *
 * @param value The value to wrap in an OK result
 * @returns The value wrapped in a {@link ResultOk}
 */
export function resultOk<T>(value: T): ResultOk<T> {
  return {ok: true, value}
}

/**
 * Wrap the given value in a {@link ResultError}.
 *
 * @example
 * ```ts
 * const result = resultErr(new Error('Boom'))
 * console.log(result.ok)     // false
 * console.log(result.error)  // Error: Boom
 * ```
 *
 * @param error The error to wrap in a not OK result
 * @returns The value wrapped in a {@link ResultError}
 */
export function resultErr<E>(error: E): ResultError<E> {
  return {ok: false, error}
}

/**
 * Unwrap a {@link Result}'s value or throw its error.
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * console.log(unwrap(result)) // 42
 * ```
 *
 * @example
 * ```ts
 * const result = resultErr(new Error('Boom'))
 * console.log(unwrap(result)) // throws Error: Boom
 * ```
 *
 * @param result A result to unwrap the value of
 * @returns The value of the result
 */
export function unwrap<T>(result: Result<T, unknown>): T {
  if (result.ok) {
    return result.value
  }

  throw result.error
}

/**
 * Unwrap a {@link Result}'s error or throw an error.
 *
 * @example
 * ```ts
 * const result = resultErr(new Error('Boom'))
 * console.log(unwrapErr(result)) // Error: Boom
 * ```
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * console.log(unwrapErr(result)) // throws Error: Expected error, but got 42
 * ```
 *
 * @param result A result to unwrap the error of
 * @returns The error of the result
 */
export function unwrapErr<E>(result: Result<unknown, E>): E {
  if (!result.ok) {
    return result.error
  }

  throw new Error(`Expected error, but got ${result.value}`)
}

/**
 * Create a {@link Result} from a {@link Promise}.
 *
 * @example
 * ```ts
 * const result = fromPromise(Promise.resolve(42))
 * console.log(result.ok)    // true
 * console.log(result.value) // 42
 * ```
 *
 * @param promise A promise that may resolve to a value or reject with an error
 * @returns A promise that resolves to a {@link Result} wrapping the original promise's value or error
 */
export function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, unknown>> {
  return promise.then(resultOk).catch(resultErr)
}

/**
 * Run `onOk` if the given {@link Result} is an {@link ResultOk}, or `onError`
 * if it is a {@link ResultError}.
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * const result2 = resultErr(new Error('Boom'))
 * console.log(either(result, value => value + 1, error => error.message))  // 43
 * console.log(either(result2, value => value + 1, error => error.message)) // Boom
 * ```
 *
 * @param result The result to unwrap
 * @param onOk The function to call when the result is OK
 * @param onError The function to call when the result is not OK
 */
export function either<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => unknown,
  onError: (error: E) => unknown
): void {
  map(result, onOk, onError)
}

/**
 * Map a {@link Result} to a new {@link Result} by applying the OK or error
 * function to the value or error, respectively.
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * const result2 = resultErr(new Error('Boom'))
 * console.log(map(result, value => value + 1, error => error.message))  // {ok: true, value: 43}
 * console.log(map(result2, value => value + 1, error => error.message)) // {ok: false, error: 'Boom'}
 * ```
 *
 * @param result The result to map
 * @param onOk The function to map the value through when the result is OK
 * @param onError The function to map the error through when the result is not OK
 * @returns A new {@link Result} wrapping the mapped value and error type
 */
export function map<T, E, R, RE>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onError: (error: E) => RE
): Result<R, RE> {
  if (result.ok) {
    return resultOk(onOk(result.value))
  } else {
    return resultErr(onError(result.error))
  }
}

/**
 * Map a {@link Result} or a {@link Promise} resolving to a result to a new
 * {@link Result} by applying the optionally async OK or error function to the
 * value or error, respectively.
 *
 * @example
 * ```ts
 * const result = resultOk(42)
 * const result2 = resultErr(new Error('Boom'))
 * console.log(mapAsync(result, value => Promise.resolve(value + 1), error => Promise.resolve(error.message)))  // {ok: true, value: 43}
 * console.log(mapAsync(result2, value => Promise.resolve(value + 1), error => Promise.resolve(error.message))) // {ok: false, error: 'Boom'}
 * ```
 *
 * @param result The result to map
 * @param onOk The optionally async function to map the value through when the result is OK
 * @param onError The optionally async function to map the error through when the result is not OK
 * @returns A promise resolving to a new {@link Result} wrapping the mapped value and error type
 */
export async function mapAsync<T, E, R, RE>(
  result:
    | Promise<Result<T | Promise<T>, E | Promise<E>>>
    | Result<T | Promise<T>, E | Promise<E>>,
  onOk: (value: T) => R,
  onError: (error: E) => RE
): Promise<Result<Awaited<R>, Awaited<RE>>> {
  const awaitedResult = await result

  if (awaitedResult.ok) {
    return resultOk(await onOk(await awaitedResult.value))
  } else {
    return resultErr(await onError(await awaitedResult.error))
  }
}

/**
 * Map a {@link Promise} through optionally asynchronous functions.
 *
 * @param promise The promise to map
 * @param onOk The function to map the value through when the promise resolves
 * @param onError The function to map the error through when the promise rejects
 * @returns A {@link Promise} resolving to a result wrapping the value and error type
 */
export async function mapPromise<T, T2, E2>(
  promise: Promise<T>,
  onOk: (value: T) => T2,
  onError: (error: unknown) => E2
): Promise<Result<Awaited<T2>, Awaited<E2>>> {
  return mapAsync(fromPromise(promise), onOk, onError)
}

/**
 * Map a result whose values are possibly promises by awaiting those promises.
 *
 * @param result The result to map through an await
 * @returns A new result, with promises awaited
 */
export async function mapAwait<T, E>(
  result:
    | Promise<Result<T | Promise<T>, E | Promise<E>>>
    | Result<T | Promise<T>, E | Promise<E>>
): Promise<Result<T, E>> {
  const awaitedResult = await result

  if (awaitedResult.ok) {
    return resultOk(await awaitedResult.value)
  } else {
    return resultErr(await awaitedResult.error)
  }
}
