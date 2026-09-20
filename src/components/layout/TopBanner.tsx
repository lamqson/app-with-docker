'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import type { TopBannerItem } from '@/lib/payload/nav';

type TopBannerProps = {
  items: TopBannerItem[];
};

const ROTATE_MS = 5000;
const FADE_MS = 300;

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function TopBanner({ items }: TopBannerProps) {
  const t = useTranslations('nav');
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const interval = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setIndex((current) => (current + 1) % items.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, [items.length]);

  if (!items.length) {
    return null;
  }

  const item = items[index];
  const linkClass = `text-xs font-semibold uppercase tracking-[0.08em] text-brand-foreground transition-opacity duration-300 hover:underline ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div
      className="bg-accent text-center"
      role="region"
      aria-label={t('announcementBanner')}
      aria-live="polite"
    >
      <div className="mx-auto flex h-9 items-center justify-center px-4">
        {isExternalHref(item.href) ? (
          <a
            href={item.href}
            target={item.openInNewTab ? '_blank' : undefined}
            rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
            className={linkClass}
          >
            {item.label}
          </a>
        ) : (
          <Link href={item.href} className={linkClass}>
            {item.label}
          </Link>
        )}
      </div>
    </div>
  );
}
