import type { StaticImageData } from 'next/image';

import type { Media } from '@/payload/payload-types';

export type ResolvedImage = {
  alt: string;
  height: number;
  src: string;
  unoptimized?: boolean;
  width: number;
};

/** Payload returns absolute URLs; Next.js Image needs same-origin paths. */
export function normalizeMediaUrl(url: string): string {
  if (url.startsWith('/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export function isPopulatedMedia(
  media: number | Media | null | undefined,
): media is Media {
  return typeof media === 'object' && media !== null && 'url' in media;
}

export function resolveMediaImage(
  media: number | Media | null | undefined,
  fallback: StaticImageData,
  alt: string,
): ResolvedImage {
  if (isPopulatedMedia(media) && media.url) {
    return {
      alt: media.alt || alt,
      height: media.height ?? fallback.height,
      src: normalizeMediaUrl(media.url),
      unoptimized: media.mimeType?.includes('svg') ?? false,
      width: media.width ?? fallback.width,
    };
  }

  return {
    alt,
    height: fallback.height,
    src: fallback.src,
    unoptimized: fallback.src.endsWith('.svg'),
    width: fallback.width,
  };
}
