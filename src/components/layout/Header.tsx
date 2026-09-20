import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';
import {
  getDemoCtaHref,
  getHeaderMenu,
  getSignInHref,
} from '@/lib/payload/nav';
import { getSiteSettings } from '@/lib/payload/queries';

import { BrandLogo } from './BrandLogo';
import { DesktopNav } from './DesktopNav';
import { LocaleSwitch } from './LocaleSwitch';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';

export async function Header() {
  const locale = resolveLocale(await getLocale());
  const [t, siteName, settings] = await Promise.all([
    getTranslations('nav'),
    getTranslations('meta').then((meta) => meta('siteName')),
    getSiteSettings(locale),
  ]);

  const headerMenu = getHeaderMenu();
  const signInHref = getSignInHref(settings);
  const demoCtaHref = getDemoCtaHref(settings);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-brand-foreground"
      >
        {t('skipToContent')}
      </a>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <BrandLogo label={siteName} settings={settings} />
        <DesktopNav menu={headerMenu} />
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
          <a
            href={signInHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted hover:text-foreground lg:inline"
          >
            {t('signIn')}
          </a>
          <Link
            href={demoCtaHref}
            className="btn-primary hidden whitespace-nowrap px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] lg:inline-flex"
          >
            {t('bookDemo')}
          </Link>
          <MobileNav demoCtaHref={demoCtaHref} menu={headerMenu} signInHref={signInHref} />
        </div>
      </div>
    </header>
  );
}
