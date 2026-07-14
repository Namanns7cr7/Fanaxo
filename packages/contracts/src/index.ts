/**
 * @fanaxo/contracts — shared runtime-validated contracts.
 *
 * Single source of truth for entity shapes, API payloads, realtime events,
 * and actor identity. Consumed by domain, server, and client code alike so
 * a contract can never drift between trust boundaries.
 */

export * from './enums.js';
export * from './ids.js';
export * from './entities.js';
export * from './events.js';
export * from './api.js';
export * from './actor.js';
