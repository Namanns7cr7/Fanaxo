/**
 * CLI entrypoint for `pnpm db:seed` — creates/migrates the database file and
 * resets it to the deterministic demo dataset. Development and demo use only.
 */

import { createDatabase, migrateDatabase } from './client.js';
import { resetDemoData } from './seed.js';

const databaseFile = process.env['DATABASE_FILE'] ?? '.data/fanaxo.db';

const handle = createDatabase(databaseFile);
migrateDatabase(handle);
resetDemoData(handle);
handle.sqlite.close();

console.warn(`Seeded deterministic demo data into ${databaseFile}`);
