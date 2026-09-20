import { hasLocale } from 'next-intl';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [
    'en',
    'es',
    'fr',
    'de',
    'zh-TW',
    'zh-CN',
    'ja',
    'ko',
    'it',
    'pt',
    'pt-BR',
  ],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

export function resolveLocale(locale: string | undefined): AppLocale {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}
