import { cache } from 'react';

import type { AppLocale } from '@/i18n/routing';
import type { CaseStudy, Page, Post, SiteSetting } from '@/payload/payload-types';

import { getPayload } from './getPayload';

const isDev = process.env.NODE_ENV !== 'production';

const collectionQueryDefaults = {
  draft: isDev,
  overrideAccess: isDev,
} as const;

export const getSiteSettings = cache(async (locale: AppLocale): Promise<SiteSetting | null> => {
  try {
    const payload = await getPayload();
    return await payload.findGlobal({
      slug: 'site-settings',
      locale,
      depth: 1,
    });
  } catch {
    return null;
  }
});

export const getPageBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<Page | null> => {
    try {
      const payload = await getPayload();
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
    } catch {
      return null;
    }
  },
);

export const getAllPageSlugs = cache(async (): Promise<string[]> => {
  try {
    const payload = await getPayload();
    const result = await payload.find({
      collection: 'pages',
      limit: 100,
      pagination: false,
      select: {
        slug: true,
      },
      ...collectionQueryDefaults,
    });

    return result.docs
      .map((doc) => doc.slug)
      .filter((slug) => slug !== 'home');
  } catch {
    return [];
  }
});

export const getPosts = cache(async (locale: AppLocale): Promise<Post[]> => {
  try {
    const payload = await getPayload();
    const result = await payload.find({
      collection: 'posts',
      depth: 1,
      limit: 50,
      locale,
      sort: '-publishedAt',
      ...collectionQueryDefaults,
    });

    return result.docs;
  } catch {
    return [];
  }
});

export const getPostBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<Post | null> => {
    try {
      const payload = await getPayload();
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
    } catch {
      return null;
    }
  },
);

export const getAllPostSlugs = cache(async (): Promise<string[]> => {
  try {
    const payload = await getPayload();
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
  } catch {
    return [];
  }
});

export const getCaseStudies = cache(async (locale: AppLocale): Promise<CaseStudy[]> => {
  try {
    const payload = await getPayload();
    const result = await payload.find({
      collection: 'case-studies',
      depth: 1,
      limit: 50,
      locale,
      sort: '-updatedAt',
      ...collectionQueryDefaults,
    });

    return result.docs;
  } catch {
    return [];
  }
});

export const getCaseStudyBySlug = cache(
  async (slug: string, locale: AppLocale): Promise<CaseStudy | null> => {
    try {
      const payload = await getPayload();
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
    } catch {
      return null;
    }
  },
);

export const getAllCaseStudySlugs = cache(async (): Promise<string[]> => {
  try {
    const payload = await getPayload();
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
  } catch {
    return [];
  }
});
