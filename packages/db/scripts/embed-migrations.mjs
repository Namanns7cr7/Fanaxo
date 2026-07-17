/**
 * Regenerates src/migrations-embedded.ts from migrations/*.sql.
 *
 * Embedding the SQL as a module makes migrations bundler-proof (no runtime
 * filesystem lookup), which matters because Next.js bundles workspace
 * packages. Run after every `drizzle-kit generate`:
 *
 *   node scripts/embed-migrations.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(packageRoot, 'migrations');

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const migrations = files.map((name) => {
  const sql = readFileSync(join(migrationsDir, name), 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  return { name, statements };
});

const body = migrations
  .map(
    (migration) =>
      `  // ${migration.name}\n  [\n${migration.statements
        .map((statement) => `    ${JSON.stringify(statement)},`)
        .join('\n')}\n  ],`,
  )
  .join('\n');

const output = `/**
 * GENERATED FILE — do not edit by hand.
 * Source of truth: migrations/*.sql (drizzle-kit generate).
 * Regenerate with: node scripts/embed-migrations.mjs
 */

/** Ordered migrations; each entry is the statement list of one SQL file. */
export const EMBEDDED_MIGRATIONS: readonly (readonly string[])[] = [
${body}
];
`;

writeFileSync(join(packageRoot, 'src', 'migrations-embedded.ts'), output, 'utf8');
console.warn(`Embedded ${migrations.length} migration file(s) into src/migrations-embedded.ts`);
