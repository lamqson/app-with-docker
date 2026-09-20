import ogDefault from '@/assets/images/icon_512x512.png';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { Media } from '@/payload/payload-types';

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3200';
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export function defaultOgImageUrl(): string {
  return absoluteUrl(ogDefault.src);
}

export function resolveOgImageUrl(
  seoImage?: number | Media | null,
  fallbackImage?: number | Media | null,
): string {
  if (isPopulatedMedia(seoImage) && seoImage.url) {
    return absoluteUrl(normalizeMediaUrl(seoImage.url));
  }

  if (isPopulatedMedia(fallbackImage) && fallbackImage.url) {
    return absoluteUrl(normalizeMediaUrl(fallbackImage.url));
  }

  return defaultOgImageUrl();
}
