import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { CaseStudy, Post } from '@/payload/payload-types';

type CollectionItem = Pick<Post, 'excerpt' | 'featuredImage' | 'slug' | 'title'> &
  Pick<CaseStudy, 'excerpt' | 'featuredImage' | 'slug' | 'title'>;

type CollectionIndexProps = {
  basePath: '/blog' | '/customers';
  emptyMessage: string;
  items: CollectionItem[];
};

export function CollectionIndex({ basePath, emptyMessage, items }: CollectionIndexProps) {
  if (items.length === 0) {
    return (
      <section className="section-block">
        <div className="mx-auto max-w-3xl px-8">
          <p className="text-foreground-muted">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block">
      <div className="mx-auto grid max-w-7xl gap-6 px-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const image = isPopulatedMedia(item.featuredImage) ? item.featuredImage : null;

          return (
            <article key={item.slug} className="surface-card overflow-hidden">
              {image?.url ? (
                <Image
                  src={normalizeMediaUrl(image.url)}
                  alt={image.alt || item.title}
                  width={image.width ?? 640}
                  height={image.height ?? 360}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : null}
              <div className="p-6">
                <h2 className="text-2xl">
                  <Link href={`${basePath}/${item.slug}`} className="hover:text-brand">
                    {item.title}
                  </Link>
                </h2>
                {item.excerpt ? <p className="mt-3 text-foreground-muted">{item.excerpt}</p> : null}
                <Link href={`${basePath}/${item.slug}`} className="mt-4 inline-flex text-sm font-medium text-brand">
                  Read more
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
