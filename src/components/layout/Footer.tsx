import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/routing';
import {
  getDemoCtaHref,
  getFooterLegal,
  getFooterSitemap,
  getSignInHref,
  resolveNavLabel,
} from '@/lib/payload/nav';
import { getSiteSettings } from '@/lib/payload/queries';

import { BrandLogo } from './BrandLogo';

export async function Footer() {
  const locale = resolveLocale(await getLocale());
  const [t, footer, siteName, settings] = await Promise.all([
    getTranslations('nav'),
    getTranslations('footer'),
    getTranslations('meta').then((meta) => meta('siteName')),
    getSiteSettings(locale),
  ]);

  const footerSitemap = getFooterSitemap(settings);
  const footerLegal = getFooterLegal(settings);
  const signInHref = getSignInHref(settings);
  const demoCtaHref = getDemoCtaHref(settings);
  const agentEnabled = settings?.agentEnabled ?? false;

  return (
    <footer className="border-t border-border-subtle pb-12 pt-16">
      <div className="mx-auto max-w-7xl px-8">
        <div className="flex flex-col gap-10 border-b border-border-subtle pb-11 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <BrandLogo label={siteName} settings={settings} />
            <p className="mt-4 text-foreground-muted">{footer('tagline')}</p>
            <address className="mt-6 space-y-1 not-italic text-sm text-foreground-muted">
              <p>{footer('address')}</p>
              <p>
                <a href={`tel:${footer('phone')}`} className="hover:text-foreground">
                  {footer('phone')}
                </a>
              </p>
              <p>
                <a href={`mailto:${footer('email')}`} className="hover:text-foreground">
                  {footer('email')}
                </a>
              </p>
            </address>
          </div>
          <div>
            <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">
              {footer('sitemap')}
            </h2>
            <ul className="mt-4 space-y-2">
              {footerSitemap.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-foreground-muted hover:text-foreground">
                    {resolveNavLabel(item, (key) => t(key as Parameters<typeof t>[0]))}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={signInHref} className="text-foreground-muted hover:text-foreground">
                  {t('signIn')}
                </Link>
              </li>
              <li>
                <Link href={demoCtaHref} className="text-brand hover:opacity-90">
                  {t('bookDemo')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-4 text-sm">
            {footerLegal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-foreground-muted hover:text-foreground">
                  {resolveNavLabel(item, (key) => footer(key as Parameters<typeof footer>[0]))}
                </Link>
              </li>
            ))}
          </ul>
          <p
            className={`text-sm text-foreground-muted${agentEnabled ? ' pr-40 sm:pr-44' : ''}`}
          >
            {footer('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
