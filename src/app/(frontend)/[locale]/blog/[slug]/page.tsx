import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CollectionDetail } from '@/components/pages/CollectionDetail';
import { routing, resolveLocale } from '@/i18n/routing';
import { buildPostMetadata } from '@/lib/payload/metadata';
import { getAllPostSlugs, getPostBySlug } from '@/lib/payload/queries';

type BlogPostProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();

  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const [post, siteName] = await Promise.all([
    getPostBySlug(slug, locale),
    getTranslations({ locale, namespace: 'meta' }).then((t) => t('siteName')),
  ]);

  if (!post) {
    return {};
  }

  return buildPostMetadata(post, siteName);
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  const post = await getPostBySlug(slug, locale);
  if (!post) {
    notFound();
  }

  return <CollectionDetail doc={post} />;
}
