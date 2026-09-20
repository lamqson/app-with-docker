import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Sora } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import icon from '@/assets/images/icon.png';
import { AgentWidget } from '@/components/agent/AgentWidget';
import { HubSpotTracking } from '@/components/integrations/HubSpotTracking';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeInit } from '@/components/layout/ThemeInit';
import { resolveLocale, routing } from '@/i18n/routing';
import { resolveGraphqlEndpoint, resolveHubspotPortalId } from '@/lib/hubspot/settings';
import { buildRootMetadata } from '@/lib/payload/metadata';
import { getSiteSettings } from '@/lib/payload/queries';
import {
  isThemeId,
  resolveServerTheme,
  THEME_STORAGE_KEY,
  type ThemeId,
} from '@/lib/theme';
import '@/styles/globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-body-family',
  display: 'swap',
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: resolveLocale(locale),
    namespace: 'meta',
  });

  return {
    ...buildRootMetadata({
      description: t('homeDescription'),
      siteName: t('siteName'),
      title: t('siteName'),
    }),
    icons: {
      icon: icon.src,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, settings] = await Promise.all([
    getMessages(),
    getSiteSettings(locale),
  ]);
  const defaultTheme: ThemeId = isThemeId(settings?.defaultTheme) ? settings.defaultTheme : 'dark';
  const themeCookie = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const serverTheme = resolveServerTheme(isThemeId(themeCookie) ? themeCookie : undefined, defaultTheme);
  const hubspotPortalId = resolveHubspotPortalId(settings);
  const graphqlEndpoint = resolveGraphqlEndpoint(settings);
  const agentEnabled = settings?.agentEnabled ?? false;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-default-theme={defaultTheme}
      className={`${sora.variable}${serverTheme === 'dark' ? ' dark' : ''}`}
      data-theme={serverTheme}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeInit defaultTheme={defaultTheme} />
        {hubspotPortalId ? <HubSpotTracking portalId={hubspotPortalId} /> : null}
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          {agentEnabled ? <AgentWidget endpoint={graphqlEndpoint} /> : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
