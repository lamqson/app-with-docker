import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import {
  getAllCaseStudySlugs,
  getAllPageSlugs,
  getAllPostSlugs,
} from '@/lib/payload/queries';
import { getSiteUrl } from '@/lib/seo/site';

const COLLECTION_INDEX_SLUGS = new Set(['blog', 'customers']);

function localizedUrl(locale: string, path = ''): string {
  const siteUrl = getSiteUrl();
  const normalized = path.replace(/^\/+/, '');

  if (!normalized) {
    return `${siteUrl}/${locale}`;
  }

  return `${siteUrl}/${locale}/${normalized}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, caseStudies] = await Promise.all([
    getAllPageSlugs(),
    getAllPostSlugs(),
    getAllCaseStudySlugs(),
  ]);

  const staticPages = pages.filter((slug) => !COLLECTION_INDEX_SLUGS.has(slug));
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({
      changeFrequency: 'weekly',
      lastModified: new Date(),
      priority: 1,
      url: localizedUrl(locale),
    });

    for (const slug of staticPages) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified: new Date(),
        priority: 0.7,
        url: localizedUrl(locale, slug),
      });
    }

    entries.push({
      changeFrequency: 'weekly',
      lastModified: new Date(),
      priority: 0.8,
      url: localizedUrl(locale, 'blog'),
    });

    for (const slug of posts) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified: new Date(),
        priority: 0.6,
        url: localizedUrl(locale, `blog/${slug}`),
      });
    }

    entries.push({
      changeFrequency: 'weekly',
      lastModified: new Date(),
      priority: 0.8,
      url: localizedUrl(locale, 'customers'),
    });

    for (const slug of caseStudies) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified: new Date(),
        priority: 0.6,
        url: localizedUrl(locale, `customers/${slug}`),
      });
    }
  }

  return entries;
}
