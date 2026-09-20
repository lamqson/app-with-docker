'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import type { HeaderMenuItem, NavChildLink, NavMegaColumn } from '@/lib/nav/header-menu';
import { navChildLabelKey } from '@/lib/nav/labels';

type DesktopNavProps = {
  menu: HeaderMenuItem[];
};

export function DesktopNav({ menu }: DesktopNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const isActive = useCallback(
    (href: string, children?: NavChildLink[] | NavMegaColumn[]) => {
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        return true;
      }

      if (!children) {
        return false;
      }

      if ('children' in children[0]) {
        return (children as NavMegaColumn[]).some((column) =>
          column.children.some(
            (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
          ),
        );
      }

      return (children as NavChildLink[]).some(
        (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
      );
    },
    [pathname],
  );

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenId(null);
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenId(null);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <nav ref={navRef} aria-label={t('main')} className="hidden items-center gap-1 lg:flex">
      {menu.map((item) => {
        const active = isActive(
          item.href,
          item.kind === 'dropdown' ? item.children : item.columns,
        );
        const open = openId === item.id;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpenId(item.id)}
            onMouseLeave={() => setOpenId((current) => (current === item.id ? null : current))}
          >
            <div
              className={`inline-flex items-center gap-0.5 whitespace-nowrap px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                active || open ? 'text-foreground' : 'text-foreground-muted'
              }`}
            >
              <Link href={item.href} className="hover:text-foreground">
                {t(item.key as Parameters<typeof t>[0])}
              </Link>
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={open ? t('collapseSection') : t('expandSection')}
                onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
                className="inline-flex size-6 items-center justify-center rounded-full hover:text-foreground"
              >
                <Chevron open={open} />
              </button>
            </div>

            {open ? (
              item.kind === 'mega' ? (
                <MegaPanel columns={item.columns} />
              ) : (
                <DropdownPanel children={item.children} />
              )
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function DropdownPanel({ children }: { children: NavChildLink[] }) {
  const t = useTranslations('nav');
  const panelId = useId();

  return (
    <div
      id={panelId}
      className="absolute left-1/2 top-full z-50 min-w-[15rem] -translate-x-1/2 pt-2"
    >
      <div className="rounded-2xl border border-border bg-surface p-2 shadow-lg">
        <ul className="flex flex-col gap-0.5">
          {children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="block rounded-xl px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
              >
                {t(navChildLabelKey(child.key) as Parameters<typeof t>[0])}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MegaPanel({ columns }: { columns: NavMegaColumn[] }) {
  const t = useTranslations('nav');
  const panelId = useId();

  return (
    <div id={panelId} className="absolute left-1/2 top-full z-50 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 pt-2">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="grid gap-8 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.titleKey}>
              <Link
                href={column.href}
                className="mb-3 block text-sm font-semibold text-foreground hover:opacity-80"
              >
                {t(`sections.${column.titleKey}` as Parameters<typeof t>[0])}
              </Link>
              <ul className="flex flex-col gap-0.5">
                {column.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="block rounded-lg px-1 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
                    >
                      {t(navChildLabelKey(child.key) as Parameters<typeof t>[0])}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
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
