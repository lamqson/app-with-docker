import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import logoContainerStore from '@/assets/images/home/logo-container-store.webp';
import logoInsightGlobal from '@/assets/images/home/logo-insight-global.webp';
import logoLandsEnd from '@/assets/images/home/logo-lands-end.webp';
import logoPotteryBarn from '@/assets/images/home/logo-pottery-barn.webp';
import logoSephora from '@/assets/images/home/logo-sephora.webp';
import logoWilliamsSonoma from '@/assets/images/home/logo-williams-sonoma.webp';
import logoWorkwear from '@/assets/images/home/logo-workwear.webp';
import logoWorldMarket from '@/assets/images/home/logo-world-market.webp';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { LogoCloudBlock } from '@/payload/payload-types';

const FALLBACK_LOGOS = [
  { alt: 'World Market', height: 64, src: logoWorldMarket.src, width: 180 },
  { alt: 'Workwear Outfitters', height: 64, src: logoWorkwear.src, width: 180 },
  { alt: "Lands' End", height: 64, src: logoLandsEnd.src, width: 180 },
  { alt: 'Sephora', height: 64, src: logoSephora.src, width: 180 },
  { alt: 'Pottery Barn', height: 64, src: logoPotteryBarn.src, width: 180 },
  { alt: 'Williams Sonoma', height: 64, src: logoWilliamsSonoma.src, width: 180 },
  { alt: 'The Container Store', height: 64, src: logoContainerStore.src, width: 180 },
  { alt: 'Insight Global', height: 64, src: logoInsightGlobal.src, width: 180 },
] as const;

type LogoCloudProps = {
  block?: LogoCloudBlock | null;
};

export async function LogoCloud({ block = null }: LogoCloudProps) {
  const t = await getTranslations('home');
  const headline = block?.headline?.trim() ? block.headline : block ? undefined : t('trustedTitle');

  const logos =
    block?.logos
      ?.map((item) => {
        const media = isPopulatedMedia(item.image) ? item.image : null;
        if (!media?.url) {
          return null;
        }

        return {
          alt: item.alt,
          height: media.height ?? 64,
          src: normalizeMediaUrl(media.url),
          width: media.width ?? 180,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) ?? [];

  const items = logos.length > 0 ? logos : FALLBACK_LOGOS;
  const isCards = block?.variant === 'cards';

  if (isCards) {
    return (
      <section className="section-block">
        <div className="mx-auto max-w-7xl px-8">
          {headline ? <h2 className="section-intro text-3xl md:text-4xl">{headline}</h2> : null}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((logo, index) => (
              <div key={`${logo.src}-${index}`} className="surface-card overflow-hidden p-2">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={logo.height}
                  className="w-full rounded-3xl"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block border-t border-border">
      <div className="mx-auto max-w-7xl px-8">
        {headline ? (
          <h2 className="section-intro text-2xl tracking-[0.15em] uppercase md:text-3xl">{headline}</h2>
        ) : null}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((logo, index) => (
            <div
              key={`${logo.src}-${index}`}
              className="surface-card flex h-24 items-center justify-center rounded-2xl px-4 py-3"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="max-h-12 w-auto max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
