import {
  getAllCaseStudySlugs,
  getAllPageSlugs,
  getAllPostSlugs,
} from '@/lib/payload/queries';
import { getStaticPageSlugs } from '@/lib/payload/static-pages';

import type { SitemapSlugs } from './sitemap-entries';

const PAYLOAD_TIMEOUT_MS = 2_000;

function staticPageSlugs(): string[] {
  return getStaticPageSlugs().filter((slug) => slug !== 'home');
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), PAYLOAD_TIMEOUT_MS);
    }),
  ]);
}

export async function getSitemapSlugs(): Promise<SitemapSlugs> {
  const fallbackPages = staticPageSlugs();

  const [pages, posts, caseStudies] = await Promise.all([
    withTimeout(getAllPageSlugs(), fallbackPages),
    withTimeout(getAllPostSlugs(), []),
    withTimeout(getAllCaseStudySlugs(), []),
  ]);

  return { pages, posts, caseStudies };
}

export function getStaticSitemapSlugs(): SitemapSlugs {
  return {
    pages: staticPageSlugs(),
    posts: [],
    caseStudies: [],
  };
}
