import type { Metadata } from 'next';

import { getSiteUrl, resolveOgImageUrl } from '@/lib/seo/site';
import type { CaseStudy, Media, Page, Post } from '@/payload/payload-types';

type SeoFields = {
  seo?: {
    description?: string | null;
    ogImage?: (number | null) | Media;
    title?: string | null;
  } | null;
  title: string;
};

type MetadataOptions = {
  description?: string;
  fallbackImage?: (number | null) | Media;
  siteName?: string;
  title?: string;
};

function formatTitle(title: string, siteName?: string): string {
  if (!siteName || title.includes(siteName)) {
    return title;
  }

  return `${title} · ${siteName}`;
}

export function buildSeoMetadata(
  doc: SeoFields,
  options: MetadataOptions = {},
): Metadata {
  const title = doc.seo?.title ?? options.title ?? doc.title;
  const description = doc.seo?.description ?? options.description;
  const ogImage = resolveOgImageUrl(doc.seo?.ogImage, options.fallbackImage);
  const siteUrl = getSiteUrl();

  return {
    description,
    openGraph: {
      description: description ?? undefined,
      images: [{ url: ogImage }],
      siteName: options.siteName,
      title,
      type: 'website',
      url: siteUrl,
    },
    title,
    twitter: {
      card: 'summary_large_image',
      description: description ?? undefined,
      images: [ogImage],
      title,
    },
  };
}

export function buildPageMetadata(page: Page, siteName: string): Metadata {
  const metadata = buildSeoMetadata(page, { siteName });
  const title = metadata.title;

  return {
    ...metadata,
    title: typeof title === 'string' ? formatTitle(title, siteName) : title,
  };
}

export function buildPostMetadata(post: Post | CaseStudy, siteName: string): Metadata {
  const metadata = buildSeoMetadata(post, {
    description: post.excerpt ?? undefined,
    fallbackImage: post.featuredImage,
    siteName,
    title: post.title,
  });
  const title = metadata.title;

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
    },
    title: typeof title === 'string' ? formatTitle(title, siteName) : title,
  };
}

export function buildRootMetadata(options: {
  description: string;
  siteName: string;
  title: string;
}): Metadata {
  const ogImage = resolveOgImageUrl(null);

  return {
    description: options.description,
    metadataBase: new URL(getSiteUrl()),
    openGraph: {
      description: options.description,
      images: [{ url: ogImage }],
      siteName: options.siteName,
      title: options.title,
      type: 'website',
    },
    title: {
      default: options.title,
      template: `%s · ${options.siteName}`,
    },
    twitter: {
      card: 'summary_large_image',
      description: options.description,
      images: [ogImage],
      title: options.title,
    },
  };
}
