'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { Link, usePathname } from '@/i18n/navigation';
import { getLocaleFlag, LOCALE_OPTIONS } from '@/lib/locale';

export function LocaleSwitch() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const currentLabel = t(`locale.${locale}`);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('nav.switchLanguage')}: ${currentLabel}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background-muted"
      >
        <span aria-hidden="true" className="text-sm leading-none">
          {getLocaleFlag(locale)}
        </span>
        <span className="max-w-24 truncate">{currentLabel}</span>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('nav.switchLanguage')}
          className="absolute right-0 z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl border border-border bg-surface p-1 shadow-lg"
        >
          {LOCALE_OPTIONS.map(({ code, flag }) => {
            const active = locale === code;
            const label = t(`locale.${code}`);

            return (
              <li key={code} role="option" aria-selected={active}>
                <Link
                  href={pathname}
                  locale={code}
                  onClick={() => setOpen(false)}
                  className={
                    active
                      ? 'flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground'
                      : 'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-background-muted'
                  }
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {flag}
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`size-3.5 fill-none stroke-current stroke-[2] transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
