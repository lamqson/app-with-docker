import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageView } from '@/components/pages/PageView';
import { CollectionIndex } from '@/components/pages/CollectionIndex';
import { resolveLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/payload/metadata';
import { getPageBySlug, getPosts } from '@/lib/payload/queries';

type BlogIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: BlogIndexProps): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const [page, siteName] = await Promise.all([
    getPageBySlug('blog', locale),
    getTranslations({ locale, namespace: 'meta' }).then((t) => t('siteName')),
  ]);

  if (page) {
    return buildPageMetadata(page, siteName);
  }

  return { title: `Blog · ${siteName}` };
}

export default async function BlogIndexPage({ params }: BlogIndexProps) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  const [page, posts] = await Promise.all([getPageBySlug('blog', locale), getPosts(locale)]);

  return (
    <>
      {page ? (
        <PageView page={page} />
      ) : (
        <section className="section-block pb-0">
          <div className="mx-auto max-w-7xl px-8">
            <h1 className="text-4xl md:text-5xl">Blog</h1>
            <p className="mt-4 max-w-2xl text-foreground-muted">
              Product updates, procurement insights, and Raindrop customer stories.
            </p>
          </div>
        </section>
      )}
      <CollectionIndex
        basePath="/blog"
        emptyMessage="No posts yet. Add entries in Payload admin under Posts."
        items={posts}
      />
    </>
  );
}
