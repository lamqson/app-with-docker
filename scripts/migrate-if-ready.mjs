import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'src/migrations');

const secret = process.env.PAYLOAD_SECRET;
const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!secret) {
  console.warn(
    '[ci:migrate] Skipping — missing PAYLOAD_SECRET.\n' +
      'Add it in Netlify → Site configuration → Environment variables.',
  );
  process.exit(0);
}

if (!databaseUrl) {
  console.warn(
    '[ci:migrate] Skipping — DATABASE_URL not set.\n' +
      'SQLite migrations are not used on Netlify. Add a Postgres DATABASE_URL for production CMS.',
  );
  process.exit(0);
}

if (!existsSync(migrationsDir)) {
  console.warn(
    '[ci:migrate] Skipping — no src/migrations directory.\n' +
      'Generate migrations with: DATABASE_URL="postgres://..." npm run payload migrate:create',
  );
  process.exit(0);
}

execSync('cross-env NODE_OPTIONS=--no-deprecation payload migrate', {
  stdio: 'inherit',
});
