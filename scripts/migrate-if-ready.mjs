import { execSync } from 'node:child_process';

const secret = process.env.PAYLOAD_SECRET;

if (!secret) {
  console.warn(
    '[ci:migrate] Skipping Payload migrations — missing PAYLOAD_SECRET.\n' +
      'Add it in Netlify → Site configuration → Environment variables, then redeploy.',
  );
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
if (!databaseUrl) {
  console.warn(
    '[ci:migrate] No DATABASE_URL — running migrations against SQLite (local/build fallback).\n' +
      'Set DATABASE_URL in Netlify for production Postgres.',
  );
}

execSync('cross-env NODE_OPTIONS=--no-deprecation payload migrate', {
  stdio: 'inherit',
});
