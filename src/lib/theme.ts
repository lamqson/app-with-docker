export const THEME_STORAGE_KEY = 'theme';

export type ThemeId = 'light' | 'dark' | 'system';

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(
  raw: string | null | undefined,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (!isThemeId(raw) || raw === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return raw;
}

export function readStoredTheme(): ThemeId | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function resolveServerTheme(
  cookieValue: string | null | undefined,
  defaultTheme: ThemeId,
): 'light' | 'dark' {
  if (cookieValue === 'light' || cookieValue === 'dark') {
    return cookieValue;
  }
  if (defaultTheme === 'light') {
    return 'light';
  }
  return 'dark';
}

export function persistTheme(theme: ThemeId): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.cookie = `${THEME_STORAGE_KEY}=${theme};path=/;max-age=31536000;samesite=lax`;
  } catch {
    // Storage can be blocked; keep the in-memory class anyway.
  }
}

export function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
}

