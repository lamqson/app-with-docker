import Image from 'next/image';

import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { LeadershipGridBlock } from '@/payload/payload-types';

export function LeadershipGridSection({ block }: { block: LeadershipGridBlock }) {
  return (
    <section className="section-block">
      <div className="mx-auto max-w-7xl px-8">
        {block.headline ? (
          <h2 className="section-intro mb-10 text-3xl md:text-4xl">{block.headline}</h2>
        ) : null}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {block.members?.map((member) => {
            const photo = isPopulatedMedia(member.photo) ? member.photo : null;
            return (
              <article key={member.id ?? member.name} className="surface-card overflow-hidden">
                {photo?.url ? (
                  <div className="aspect-square overflow-hidden bg-background-muted">
                    <Image
                      src={normalizeMediaUrl(photo.url)}
                      alt={photo.alt || member.name}
                      width={photo.width ?? 400}
                      height={photo.height ?? 400}
                      className="size-full object-cover object-top"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <h3 className="text-xl text-foreground">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>
                  {member.bio ? (
                    <p className="mt-3 text-sm text-foreground-muted">{member.bio}</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
