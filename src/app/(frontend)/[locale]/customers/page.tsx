import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageView } from '@/components/pages/PageView';
import { CollectionIndex } from '@/components/pages/CollectionIndex';
import { resolveLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/payload/metadata';
import { getCaseStudies, getPageBySlug } from '@/lib/payload/queries';

type CustomersIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CustomersIndexProps): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const [page, siteName] = await Promise.all([
    getPageBySlug('customers', locale),
    getTranslations({ locale, namespace: 'meta' }).then((t) => t('siteName')),
  ]);

  if (page) {
    return buildPageMetadata(page, siteName);
  }

  return { title: `Customers · ${siteName}` };
}

export default async function CustomersIndexPage({ params }: CustomersIndexProps) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  const [page, caseStudies] = await Promise.all([
    getPageBySlug('customers', locale),
    getCaseStudies(locale),
  ]);

  return (
    <>
      {page ? (
        <PageView page={page} />
      ) : (
        <section className="section-block pb-0">
          <div className="mx-auto max-w-7xl px-8">
            <h1 className="text-4xl md:text-5xl">Customers</h1>
            <p className="mt-4 max-w-2xl text-foreground-muted">
              See how finance and procurement teams run source-to-pay on Raindrop.
            </p>
          </div>
        </section>
      )}
      <CollectionIndex
        basePath="/customers"
        emptyMessage="No case studies yet. Add entries in Payload admin under Case Studies."
        items={caseStudies}
      />
    </>
  );
}
