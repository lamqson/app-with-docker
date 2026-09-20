import config from '@payload-config';
import { getPayload as getPayloadClient, type Payload } from 'payload';

let cached: Promise<Payload> | undefined;

export async function getPayload(): Promise<Payload> {
  if (!cached) {
    cached = getPayloadClient({ config });
  }

  return cached;
}
