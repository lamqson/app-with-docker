import Image from 'next/image';

import { RichTextDocument } from '@/components/pages/RichTextDocument';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { CaseStudy, Post } from '@/payload/payload-types';

type CollectionDetailProps = {
  doc: Post | CaseStudy;
};

export function CollectionDetail({ doc }: CollectionDetailProps) {
  const image = isPopulatedMedia(doc.featuredImage) ? doc.featuredImage : null;

  return (
    <article>
      <section className="section-block pb-0">
        <div className="mx-auto max-w-3xl px-8">
          <h1 className="text-4xl md:text-5xl">{doc.title}</h1>
          {doc.excerpt ? <p className="mt-4 text-lg text-foreground-muted">{doc.excerpt}</p> : null}
        </div>
      </section>
      {image?.url ? (
        <section className="section-block pt-8">
          <div className="mx-auto max-w-5xl px-8">
            <div className="surface-card overflow-hidden p-2">
              <Image
                src={normalizeMediaUrl(image.url)}
                alt={image.alt || doc.title}
                width={image.width ?? 1200}
                height={image.height ?? 675}
                className="w-full rounded-3xl"
              />
            </div>
          </div>
        </section>
      ) : null}
      <section className="section-block">
        <div className="mx-auto max-w-3xl px-8">
          <RichTextDocument content={doc.content} />
        </div>
      </section>
    </article>
  );
}
