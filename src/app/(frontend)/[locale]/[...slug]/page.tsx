import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PageView } from '@/components/pages/PageView';
import { routing, resolveLocale } from '@/i18n/routing';
import { buildLocalizedPathname, buildPageMetadata } from '@/lib/payload/metadata';
import { getAllPageSlugs, getPageBySlug } from '@/lib/payload/queries';

type CmsPageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
};

const RESERVED_PATHS = new Set(['blog', 'customers']);

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs();

  return routing.locales.flatMap((locale) =>
    slugs
      .filter((slug) => !RESERVED_PATHS.has(slug.split('/')[0]))
      .map((slug) => ({
        locale,
        slug: slug.split('/'),
      })),
  );
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const pageSlug = slug.join('/');
  const [page, siteName] = await Promise.all([
    getPageBySlug(pageSlug, locale),
    getTranslations({ locale, namespace: 'meta' }).then((t) => t('siteName')),
  ]);

  if (!page) {
    return {};
  }

  return buildPageMetadata(page, siteName, {
    locale,
    pathname: buildLocalizedPathname(locale, pageSlug),
  });
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  const pageSlug = slug.join('/');
  if (RESERVED_PATHS.has(pageSlug.split('/')[0])) {
    notFound();
  }

  const page = await getPageBySlug(pageSlug, locale);
  if (!page) {
    notFound();
  }

  return <PageView page={page} />;
}
