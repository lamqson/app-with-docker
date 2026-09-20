'use client';

import { useLayoutEffect } from 'react';

import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type ThemeId,
} from '@/lib/theme';

type ThemeInitProps = {
  defaultTheme: ThemeId;
};

export function ThemeInit({ defaultTheme }: ThemeInitProps) {
  useLayoutEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = readStoredTheme();
    applyTheme(resolveTheme(stored ?? defaultTheme, prefersDark));
  }, [defaultTheme]);

  return null;
}
