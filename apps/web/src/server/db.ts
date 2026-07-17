/**
 * Process-wide database handle.
 *
 * Next.js may re-evaluate modules across dev recompiles, so the handle is
 * pinned on globalThis. In demo mode an empty database is migrated and
 * seeded automatically so a fresh clone runs with zero manual steps.
 */

import 'server-only';

import {
  createDatabase,
  migrateDatabase,
  seedDemoData,
  venues,
  type DatabaseHandle,
} from '@fanaxo/db';

import { getEnv } from './env';

const globalStore = globalThis as unknown as { __fanaxoDb?: DatabaseHandle };

export function getDb(): DatabaseHandle {
  if (globalStore.__fanaxoDb === undefined) {
    const env = getEnv();
    const handle = createDatabase(env.DATABASE_FILE);
    migrateDatabase(handle);
    if (env.DEMO_MODE) {
      const hasVenue = handle.db.select({ id: venues.id }).from(venues).limit(1).all();
      if (hasVenue.length === 0) {
        seedDemoData(handle);
      }
    }
    globalStore.__fanaxoDb = handle;
  }
  return globalStore.__fanaxoDb;
}
