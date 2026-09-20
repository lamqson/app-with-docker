import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CollectionDetail } from '@/components/pages/CollectionDetail';
import { routing, resolveLocale } from '@/i18n/routing';
import { buildPostMetadata } from '@/lib/payload/metadata';
import { getAllCaseStudySlugs, getCaseStudyBySlug } from '@/lib/payload/queries';

type CaseStudyPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllCaseStudySlugs();

  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const [caseStudy, siteName] = await Promise.all([
    getCaseStudyBySlug(slug, locale),
    getTranslations({ locale, namespace: 'meta' }).then((t) => t('siteName')),
  ]);

  if (!caseStudy) {
    return {};
  }

  return buildPostMetadata(caseStudy, siteName);
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  const caseStudy = await getCaseStudyBySlug(slug, locale);
  if (!caseStudy) {
    notFound();
  }

  return <CollectionDetail doc={caseStudy} />;
}
