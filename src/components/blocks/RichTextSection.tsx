import { RichText } from '@payloadcms/richtext-lexical/react';

import type { RichTextBlock } from '@/payload/payload-types';

type RichTextSectionProps = {
  block: RichTextBlock;
};

export function RichTextSection({ block }: RichTextSectionProps) {
  return (
    <section className="section-block">
      <div className="mx-auto max-w-3xl px-8">
        <div className="cms-rich-text">
          <RichText data={block.content} />
        </div>
      </div>
    </section>
  );
}
