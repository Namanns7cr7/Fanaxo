/**
 * Result type for expected failures.
 *
 * Domain rules return `Result` instead of throwing, so callers must handle
 * the failure path explicitly and HTTP mapping stays in one place
 * (spec 04, "Use Result or discriminated-union outcomes for expected failures").
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Unwrap a Result known to be Ok; throws if misused (programmer error). */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`unwrap called on Err: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}
