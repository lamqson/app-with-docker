import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function InlineLink({ href, children }: { href: string; children: string }) {
  const className = 'text-brand underline underline-offset-2 hover:opacity-90';

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function InlineMarkdown({ children, className }: { children: string; className?: string }) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(MARKDOWN_LINK_RE.source, 'g');
  while ((match = re.exec(children)) !== null) {
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }
    parts.push(
      <InlineLink key={`${match.index}-${match[2]}`} href={match[2]}>
        {match[1]}
      </InlineLink>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
