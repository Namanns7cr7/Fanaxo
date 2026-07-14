/**
 * Optimistic concurrency and event-ordering guards (spec 05 §3, §11).
 *
 * Aggregates carry an integer version. Mutations must present the version
 * they read; realtime consumers must ignore events older than local state.
 */

import { DomainErrorCode, domainError, type DomainError } from './errors.js';
import { err, ok, type Result } from './result.js';

/** Guard a mutation: reject when the caller read a stale version. */
export function checkExpectedVersion(
  currentVersion: number,
  expectedVersion: number,
): Result<number, DomainError> {
  if (currentVersion !== expectedVersion) {
    return err(
      domainError(
        DomainErrorCode.VERSION_CONFLICT,
        'The record changed since you loaded it. Review the latest state and retry.',
        { currentVersion, expectedVersion },
      ),
    );
  }
  return ok(currentVersion + 1);
}

/**
 * Guard a realtime apply: true when the incoming aggregate version supersedes
 * local state. Out-of-order or duplicate events must never roll state back.
 */
export function shouldApplyEvent(
  localVersion: number | undefined,
  incomingVersion: number,
): boolean {
  return localVersion === undefined || incomingVersion > localVersion;
}
