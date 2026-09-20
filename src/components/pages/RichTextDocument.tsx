import { RichText } from '@payloadcms/richtext-lexical/react';

import type { CaseStudy, Post } from '@/payload/payload-types';

type RichTextDocumentProps = {
  content: Post['content'] | CaseStudy['content'];
};

export function RichTextDocument({ content }: RichTextDocumentProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="cms-rich-text">
      <RichText data={content} />
    </div>
  );
}
