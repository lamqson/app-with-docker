import type { AppLocale } from '@/i18n/routing';

export type LocaleOption = {
  code: AppLocale;
  flag: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'zh-TW', flag: '🇹🇼' },
  { code: 'zh-CN', flag: '🇨🇳' },
  { code: 'ja', flag: '🇯🇵' },
  { code: 'ko', flag: '🇰🇷' },
  { code: 'it', flag: '🇮🇹' },
  { code: 'pt', flag: '🇵🇹' },
  { code: 'pt-BR', flag: '🇧🇷' },
];

export function getLocaleFlag(code: AppLocale): string {
  return LOCALE_OPTIONS.find((option) => option.code === code)?.flag ?? '🌐';
}
