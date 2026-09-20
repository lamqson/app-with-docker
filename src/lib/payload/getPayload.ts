import config from '@payload-config';
import { getPayload as getPayloadClient, type Payload } from 'payload';

import { isDatabaseConfigured } from '@/payload/database';

let cached: Promise<Payload> | undefined;

export async function getPayloadSafe(): Promise<Payload | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    if (!cached) {
      cached = getPayloadClient({ config });
    }

    return await cached;
  } catch {
    cached = undefined;
    return null;
  }
}

export async function getPayload(): Promise<Payload> {
  const payload = await getPayloadSafe();

  if (!payload) {
    throw new Error(
      'Database unavailable. Set DATABASE_URL for production or run locally with SQLite.',
    );
  }

  return payload;
}
