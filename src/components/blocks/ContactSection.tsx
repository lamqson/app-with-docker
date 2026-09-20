import type { ReactNode } from 'react';

import type { ContactSectionBlock } from '@/payload/payload-types';

type ContactSectionProps = {
  block: ContactSectionBlock;
};

function ContactLink({
  href,
  className,
  children,
}: {
  href?: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function ContactSection({ block }: ContactSectionProps) {
  const items = block.items ?? [];

  return (
    <section className="section-block">
      <div className="mx-auto max-w-7xl px-8">
        {block.headline ? <h2 className="section-intro text-3xl md:text-4xl">{block.headline}</h2> : null}
        {block.description ? (
          <p className="mx-auto mb-10 max-w-3xl text-center text-foreground-muted">{block.description}</p>
        ) : null}

        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((item) => (
              <ContactLink
                key={item.id ?? `${item.label}-${item.value}`}
                href={item.href}
                className="surface-card block p-6 transition-opacity hover:opacity-90"
              >
                <h3 className="text-lg text-brand">{item.label}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground-muted">{item.value}</p>
              </ContactLink>
            ))}
          </div>

          {block.mapEmbedUrl ? (
            <div className="surface-card overflow-hidden p-2">
              <iframe
                src={block.mapEmbedUrl}
                title="Raindrop Systems office location"
                width="600"
                height="450"
                className="aspect-[4/3] h-auto min-h-[320px] w-full rounded-3xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
