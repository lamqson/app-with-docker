import ogDefault from '@/assets/images/icon_512x512.png';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { Media } from '@/payload/payload-types';

export { absoluteUrl, getSiteUrl } from '@/lib/seo/site-url';
import { absoluteUrl } from '@/lib/seo/site-url';

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
