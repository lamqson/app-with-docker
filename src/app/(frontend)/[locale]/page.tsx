import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PageView } from '@/components/pages/PageView';
import { resolveLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/payload/metadata';
import { getPageBySlug } from '@/lib/payload/queries';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const [page, siteName, t] = await Promise.all([
    getPageBySlug('home', locale),
    getTranslations({ locale, namespace: 'meta' }).then((meta) => meta('siteName')),
    getTranslations({ locale, namespace: 'meta' }),
  ]);

  if (page) {
    return buildPageMetadata(page, siteName);
  }

  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  const page = await getPageBySlug('home', locale);
  if (!page) {
    notFound();
  }

  return <PageView page={page} showTitle={false} />;
}
