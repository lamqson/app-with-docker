import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';

import { getSiteUrl } from './site-url';

const COLLECTION_INDEX_SLUGS = new Set(['blog', 'customers']);

export type SitemapSlugs = {
  pages: string[];
  posts: string[];
  caseStudies: string[];
};

function localizedUrl(locale: string, path = ''): string {
  const siteUrl = getSiteUrl();
  const normalized = path.replace(/^\/+/, '');

  if (!normalized) {
    return `${siteUrl}/${locale}`;
  }

  return `${siteUrl}/${locale}/${normalized}`;
}

export function buildSitemapEntries(slugs: SitemapSlugs): MetadataRoute.Sitemap {
  const staticPages = slugs.pages.filter((slug) => !COLLECTION_INDEX_SLUGS.has(slug));
  const entries: MetadataRoute.Sitemap = [];
  const lastModified = new Date();

  for (const locale of routing.locales) {
    entries.push({
      changeFrequency: 'weekly',
      lastModified,
      priority: 1,
      url: localizedUrl(locale),
    });

    for (const slug of staticPages) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified,
        priority: 0.7,
        url: localizedUrl(locale, slug),
      });
    }

    entries.push({
      changeFrequency: 'weekly',
      lastModified,
      priority: 0.8,
      url: localizedUrl(locale, 'blog'),
    });

    for (const slug of slugs.posts) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified,
        priority: 0.6,
        url: localizedUrl(locale, `blog/${slug}`),
      });
    }

    entries.push({
      changeFrequency: 'weekly',
      lastModified,
      priority: 0.8,
      url: localizedUrl(locale, 'customers'),
    });

    for (const slug of slugs.caseStudies) {
      entries.push({
        changeFrequency: 'monthly',
        lastModified,
        priority: 0.6,
        url: localizedUrl(locale, `customers/${slug}`),
      });
    }
  }

  return entries;
}
