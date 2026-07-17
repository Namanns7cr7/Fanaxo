/**
 * Database client factory (ADR-006).
 *
 * SQLite via better-sqlite3 for a zero-infrastructure, fresh-clone-runnable
 * demo. The Drizzle schema is dialect-portable; swapping to managed Postgres
 * means changing this factory and the migration driver, not feature code.
 */

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

import Database, { type Options as DatabaseOptions } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { EMBEDDED_MIGRATIONS } from './migrations-embedded.js';
import * as schema from './schema.js';

const require = createRequire(import.meta.url);

/**
 * Resolve the compiled native binding directly.
 *
 * better-sqlite3 normally locates its `.node` via the `bindings` package,
 * which parses `Error.prepareStackTrace`. Next.js overrides that hook for
 * source maps, so `bindings` reads `undefined` and throws. Passing an
 * explicit `nativeBinding` skips `bindings` entirely. Returns undefined in
 * environments where the path can't be resolved (plain Node handles it fine).
 */
function resolveNativeBinding(): string | undefined {
  try {
    return require.resolve('better-sqlite3/build/Release/better_sqlite3.node');
  } catch {
    return undefined;
  }
}

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
  const nativeBinding = resolveNativeBinding();
  const options: DatabaseOptions = nativeBinding === undefined ? {} : { nativeBinding };
  const sqlite = new Database(filePath, options);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

/**
 * Apply committed migrations from the embedded module.
 *
 * Migrations are embedded (not read from disk) so the package works after
 * Next.js bundles it — a filesystem lookup for `../migrations` fails in a
 * bundled server. A tracking table makes re-runs idempotent.
 */
export function migrateDatabase(handle: DatabaseHandle): void {
  const { sqlite } = handle;
  sqlite
    .prepare(
      'CREATE TABLE IF NOT EXISTS __fanaxo_migrations (idx INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    )
    .run();
  const applied = new Set(
    sqlite
      .prepare('SELECT idx FROM __fanaxo_migrations')
      .all()
      .map((row) => (row as { idx: number }).idx),
  );

  const runAll = sqlite.transaction(() => {
    EMBEDDED_MIGRATIONS.forEach((statements, index) => {
      if (applied.has(index)) {
        return;
      }
      for (const statement of statements) {
        sqlite.prepare(statement).run();
      }
      sqlite
        .prepare('INSERT INTO __fanaxo_migrations (idx, applied_at) VALUES (?, ?)')
        .run(index, new Date().toISOString());
    });
  });
  runAll();
}
