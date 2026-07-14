/**
 * Centralized domain error catalogue.
 *
 * Each code maps to exactly one public API error and HTTP status in the web
 * layer, keeping user-safe messaging and telemetry consistent (spec 04 §4).
 */

export const DomainErrorCode = {
  INVALID_TRANSITION: 'invalid_transition',
  VERSION_CONFLICT: 'version_conflict',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  NO_ROUTE_AVAILABLE: 'no_route_available',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  STALE_DATA: 'stale_data',
} as const;

export type DomainErrorCode = (typeof DomainErrorCode)[keyof typeof DomainErrorCode];

export interface DomainError {
  readonly code: DomainErrorCode;
  /** Safe to show to end users after localization. */
  readonly message: string;
  /** Structured context for logs; must never contain secrets or PII. */
  readonly context?: Record<string, string | number | boolean>;
}

export function domainError(
  code: DomainErrorCode,
  message: string,
  context?: Record<string, string | number | boolean>,
): DomainError {
  return context === undefined ? { code, message } : { code, message, context };
}
