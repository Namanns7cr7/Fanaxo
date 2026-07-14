/**
 * @fanaxo/db — persistence adapter (schema, client, deterministic seed).
 *
 * Feature services own their queries; this package owns the schema shape,
 * connection lifecycle, migrations, and the reproducible demo dataset.
 */

export * from './client.js';
export * from './schema.js';
export * from './seed.js';
export { demoId } from './demo-ids.js';
