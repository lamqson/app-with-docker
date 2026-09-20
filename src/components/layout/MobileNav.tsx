'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { HeaderMenuItem } from '@/lib/nav/header-menu';
import { navChildLabelKey } from '@/lib/nav/labels';

type MobileNavProps = {
  demoCtaHref: string;
  menu: HeaderMenuItem[];
  signInHref: string;
};

export function MobileNav({ demoCtaHref, menu, signInHref }: MobileNavProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? t('closeMenu') : t('openMenu')}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground"
      >
        <span className="sr-only">{open ? t('closeMenu') : t('openMenu')}</span>
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-4 py-4 shadow-lg"
        >
          <nav aria-label={t('main')} className="flex flex-col gap-2">
            {menu.map((item) => {
              const expanded = expandedId === item.id;
              const hasChildren =
                item.kind === 'dropdown' ? item.children.length > 0 : item.columns.length > 0;

              return (
                <div key={item.id} className="border-b border-border-subtle pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="py-1 text-sm font-semibold uppercase tracking-[0.12em] text-foreground"
                    >
                      {t(item.key as Parameters<typeof t>[0])}
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={expanded ? t('collapseSection') : t('expandSection')}
                        onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                        className="inline-flex size-8 items-center justify-center rounded-full text-foreground-muted"
                      >
                        <Chevron open={expanded} />
                      </button>
                    ) : null}
                  </div>
                  {expanded && hasChildren ? (
                    item.kind === 'mega' ? (
                      <div className="mt-2 space-y-4 pl-2">
                        {item.columns.map((column) => (
                          <div key={column.titleKey}>
                            <Link
                              href={column.href}
                              onClick={() => setOpen(false)}
                              className="mb-1 block text-sm font-semibold text-foreground"
                            >
                              {t(`sections.${column.titleKey}` as Parameters<typeof t>[0])}
                            </Link>
                            <ul className="space-y-1">
                              {column.children.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={() => setOpen(false)}
                                    className="block py-1 text-sm text-foreground-muted"
                                  >
                                    {t(navChildLabelKey(child.key) as Parameters<typeof t>[0])}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="mt-2 space-y-1 pl-2">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="block py-1 text-sm text-foreground-muted"
                            >
                              {t(navChildLabelKey(child.key) as Parameters<typeof t>[0])}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </div>
              );
            })}
            <a
              href={signInHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="py-1 text-sm font-semibold uppercase tracking-[0.12em] text-foreground-muted"
            >
              {t('signIn')}
            </a>
            <Link href={demoCtaHref} onClick={() => setOpen(false)} className="btn-primary text-sm">
              {t('bookDemo')}
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`size-3 fill-none stroke-current stroke-[1.75] transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.75]">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
