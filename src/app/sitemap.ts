import type { MetadataRoute } from 'next';

import { buildSitemapEntries } from '@/lib/seo/sitemap-entries';
import { getSitemapSlugs } from '@/lib/seo/sitemap-slugs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(await getSitemapSlugs());
}
