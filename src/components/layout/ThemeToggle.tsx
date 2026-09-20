'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
} from '@/lib/theme';

export function ThemeToggle() {
  const t = useTranslations('nav');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setResolved(resolveTheme(readStoredTheme(), prefersDark));
  }, []);

  function toggleTheme() {
    const next = resolved === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    persistTheme(next);
    setResolved(next);
  }

  const nextLabel = resolved === 'dark' ? t('useLightTheme') : t('useDarkTheme');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={t('toggleTheme')}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-background-muted"
    >
      <span className="sr-only">{nextLabel}</span>
      {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.75]">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M16.5 13.5A7 7 0 1 1 10.5 7a5.5 5.5 0 0 0 6 6.5Z" />
    </svg>
  );
}
