/**
 * Database client factory (ADR-006).
 *
 * SQLite via better-sqlite3 for a zero-infrastructure, fresh-clone-runnable
 * demo. The Drizzle schema is dialect-portable; swapping to managed Postgres
 * means changing this factory and the migration driver, not feature code.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema.js';

export type FanaxoDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseHandle {
  readonly db: FanaxoDatabase;
  readonly sqlite: Database.Database;
}

/** Open (creating if needed) the database with safe pragmas. */
export function createDatabase(filePath: string): DatabaseHandle {
  if (filePath !== ':memory:') {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

/** Committed SQL migrations live next to this package (src/dist sibling). */
export function defaultMigrationsFolder(): string {
  return fileURLToPath(new URL('../migrations', import.meta.url));
}

export function migrateDatabase(
  handle: DatabaseHandle,
  migrationsFolder: string = defaultMigrationsFolder(),
): void {
  migrate(handle.db, { migrationsFolder });
}
