import type { Page } from '@/payload/payload-types';

import { staticPagesBySlug } from './static-pages.generated';

export function getStaticPageBySlug(slug: string): Page | null {
  return staticPagesBySlug.get(slug) ?? null;
}

export function getStaticPageSlugs(): string[] {
  return [...staticPagesBySlug.keys()];
}
