import { cache } from 'react';

import type { AppLocale } from '@/i18n/routing';
import type { CaseStudy, Page, Post, SiteSetting } from '@/payload/payload-types';
import type { Payload } from 'payload';

import { getPayloadSafe } from './getPayload';
import { getStaticPageBySlug, getStaticPageSlugs } from './static-pages';

const isDev = process.env.NODE_ENV !== 'production';

const collectionQueryDefaults = {
  draft: isDev,
  overrideAccess: isDev,
} as const;

async function withPayload<T>(
  fn: (payload: Payload) => Promise<T>,
  fallback: T,
): Promise<T> {
  const payload = await getPayloadSafe();
  if (!payload) {
    return fallback;
  }

  try {
    return await fn(payload);
  } catch {
    return fallback;
  }
}

export const getSiteSettings = cache(async (locale: AppLocale): Promise<SiteSetting | null> =>
  withPayload(
    (payload) =>
      payload.findGlobal({
        slug: 'site-settings',
        locale,
        depth: 1,
      }),
    null,
  ),
);

export const getPageBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<Page | null> => {
    const fromDb = await withPayload(async (payload) => {
      const result = await payload.find({
        collection: 'pages',
        depth: 2,
        limit: 1,
        locale,
        where: {
          slug: {
            equals: slug,
          },
        },
        ...collectionQueryDefaults,
      });

      return result.docs[0] ?? null;
    }, null);

    return fromDb ?? getStaticPageBySlug(slug);
  },
);

export const getAllPageSlugs = cache(async (): Promise<string[]> => {
  const fromDb = await withPayload(async (payload) => {
    const result = await payload.find({
      collection: 'pages',
      limit: 100,
      pagination: false,
      select: {
        slug: true,
      },
      ...collectionQueryDefaults,
    });

    return result.docs.map((doc) => doc.slug);
  }, []);

  const slugs = new Set([...fromDb, ...getStaticPageSlugs()]);
  slugs.delete('home');

  return [...slugs];
});

export const getPosts = cache(async (locale: AppLocale): Promise<Post[]> =>
  withPayload(async (payload) => {
    const result = await payload.find({
      collection: 'posts',
      depth: 1,
      limit: 50,
      locale,
      sort: '-publishedAt',
      ...collectionQueryDefaults,
    });

    return result.docs;
  }, []),
);

export const getPostBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<Post | null> =>
    withPayload(async (payload) => {
      const result = await payload.find({
        collection: 'posts',
        depth: 2,
        limit: 1,
        locale,
        where: {
          slug: {
            equals: slug,
          },
        },
        ...collectionQueryDefaults,
      });

      return result.docs[0] ?? null;
    }, null),
);

export const getAllPostSlugs = cache(async (): Promise<string[]> =>
  withPayload(async (payload) => {
    const result = await payload.find({
      collection: 'posts',
      limit: 100,
      pagination: false,
      select: {
        slug: true,
      },
      ...collectionQueryDefaults,
    });

    return result.docs.map((doc) => doc.slug);
  }, []),
);

export const getCaseStudies = cache(async (locale: AppLocale): Promise<CaseStudy[]> =>
  withPayload(async (payload) => {
    const result = await payload.find({
      collection: 'case-studies',
      depth: 1,
      limit: 50,
      locale,
      sort: '-updatedAt',
      ...collectionQueryDefaults,
    });

    return result.docs;
  }, []),
);

export const getCaseStudyBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<CaseStudy | null> =>
    withPayload(async (payload) => {
      const result = await payload.find({
        collection: 'case-studies',
        depth: 2,
        limit: 1,
        locale,
        where: {
          slug: {
            equals: slug,
          },
        },
        ...collectionQueryDefaults,
      });

      return result.docs[0] ?? null;
    }, null),
);

export const getAllCaseStudySlugs = cache(async (): Promise<string[]> =>
  withPayload(async (payload) => {
    const result = await payload.find({
      collection: 'case-studies',
      limit: 100,
      pagination: false,
      select: {
        slug: true,
      },
      ...collectionQueryDefaults,
    });

    return result.docs.map((doc) => doc.slug);
  }, []),
);
