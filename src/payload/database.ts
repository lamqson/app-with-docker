import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import type { DatabaseAdapterObj } from 'payload';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function postgresConnectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
}

export function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT,
  );
}

/** SQLite is local-only; serverless hosts require Postgres. */
export function isDatabaseConfigured(): boolean {
  if (postgresConnectionString()) {
    return true;
  }

  return !isServerlessRuntime();
}

function sqliteUrl(): string {
  const configured = process.env.DATABASE_URI;
  const fallback = path.resolve(dirname, '../../payload.sqlite');

  if (!configured) {
    return `file:${fallback}`;
  }

  if (/^file:/.test(configured)) {
    return configured;
  }

  return `file:${configured}`;
}

export function databaseAdapter(): DatabaseAdapterObj {
  const connectionString = postgresConnectionString();

  if (connectionString) {
    return postgresAdapter({
      pool: {
        connectionString,
      },
    });
  }

  return sqliteAdapter({
    client: {
      url: sqliteUrl(),
    },
  });
}
