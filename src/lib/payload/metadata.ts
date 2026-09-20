import type { Metadata } from 'next';

import { routing, type AppLocale } from '@/i18n/routing';
import { absoluteUrl, getSiteUrl, resolveOgImageUrl } from '@/lib/seo/site';
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
  locale?: string;
  pathname?: string;
  siteName?: string;
  title?: string;
};

function formatTitle(title: string, siteName?: string): string {
  if (!siteName || title.includes(siteName)) {
    return title;
  }

  return `${title} · ${siteName}`;
}

function buildAlternates(pathname?: string): Metadata['alternates'] | undefined {
  if (!pathname) {
    return undefined;
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const match = normalized.match(/^\/([^/]+)(\/.*)?$/);
  const maybeLocale = match?.[1];
  const suffix = match?.[2] ?? '';
  const hasLocalePrefix =
    Boolean(maybeLocale) && routing.locales.includes(maybeLocale as AppLocale);

  const languages = Object.fromEntries(
    routing.locales.map((locale) => [
      locale,
      absoluteUrl(`/${locale}${hasLocalePrefix ? suffix : normalized}`),
    ]),
  );

  return {
    canonical: absoluteUrl(normalized),
    languages,
  };
}

export function buildSeoMetadata(
  doc: SeoFields,
  options: MetadataOptions = {},
): Metadata {
  const title = doc.seo?.title ?? options.title ?? doc.title;
  const description = doc.seo?.description ?? options.description;
  const ogImage = resolveOgImageUrl(doc.seo?.ogImage, options.fallbackImage);
  const pageUrl = options.pathname ? absoluteUrl(options.pathname) : getSiteUrl();

  return {
    alternates: buildAlternates(options.pathname),
    description,
    openGraph: {
      description: description ?? undefined,
      images: [{ url: ogImage }],
      locale: options.locale,
      siteName: options.siteName,
      title,
      type: 'website',
      url: pageUrl,
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

export function buildPageMetadata(
  page: Page,
  siteName: string,
  options: { locale?: string; pathname?: string } = {},
): Metadata {
  const metadata = buildSeoMetadata(page, {
    siteName,
    locale: options.locale,
    pathname: options.pathname,
  });
  const title = metadata.title;

  return {
    ...metadata,
    title: typeof title === 'string' ? formatTitle(title, siteName) : title,
  };
}

export function buildPostMetadata(
  post: Post | CaseStudy,
  siteName: string,
  options: { locale?: string; pathname?: string } = {},
): Metadata {
  const metadata = buildSeoMetadata(post, {
    description: post.excerpt ?? undefined,
    fallbackImage: post.featuredImage,
    siteName,
    title: post.title,
    locale: options.locale,
    pathname: options.pathname,
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
  locale?: string;
  pathname?: string;
  siteName: string;
  title: string;
}): Metadata {
  const ogImage = resolveOgImageUrl(null);
  const pageUrl = options.pathname ? absoluteUrl(options.pathname) : getSiteUrl();

  return {
    alternates: buildAlternates(options.pathname),
    description: options.description,
    metadataBase: new URL(getSiteUrl()),
    openGraph: {
      description: options.description,
      images: [{ url: ogImage }],
      locale: options.locale,
      siteName: options.siteName,
      title: options.title,
      type: 'website',
      url: pageUrl,
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

export function buildLocalizedPathname(locale: string, slug?: string): string {
  if (!slug || slug === 'home') {
    return `/${locale}`;
  }

  return `/${locale}/${slug}`;
}
