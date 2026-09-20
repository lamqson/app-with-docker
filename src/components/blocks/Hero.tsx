import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import rainInAction from '@/assets/images/home/rain-in-action.webp';
import { ImagePlaceholder } from '@/components/blocks/ImagePlaceholder';
import { GlowBackground } from '@/components/layout/GlowBackground';
import { Link } from '@/i18n/navigation';
import { isPopulatedMedia, normalizeMediaUrl } from '@/lib/payload/media';
import type { HeroBlock } from '@/payload/payload-types';

type HeroProps = {
  block?: HeroBlock | null;
  /** Homepage-only: enables tagline, video link, and placeholder fallback media. */
  isHome?: boolean;
};

export async function Hero({ block = null, isHome = false }: HeroProps) {
  const t = isHome ? await getTranslations('home') : null;

  const variant = block?.variant ?? 'centered-stack';
  const headline = block?.headline ?? t?.('title') ?? '';
  const subheadline = block?.subheadline ?? t?.('subtitle') ?? '';
  const announcement = block?.eyebrow ?? (isHome ? t?.('announcement') : undefined);
  const primaryCtaLabel = block?.primaryCta?.label ?? t?.('primaryCta') ?? 'Request a Demo';
  const primaryCtaHref = block?.primaryCta?.href ?? '/contact/get-started';
  const secondaryCtaLabel = block?.secondaryCta?.label ?? (isHome ? t?.('secondaryCta') : undefined);
  const secondaryCtaHref = block?.secondaryCta?.href ?? '/solutions';

  const heroMedia = isPopulatedMedia(block?.image) ? block.image : null;
  const hasHeroMedia = Boolean(heroMedia?.url);

  const ctaLinks = (
    <>
      <Link href={primaryCtaHref} className="btn-primary">
        {primaryCtaLabel}
      </Link>
      {secondaryCtaLabel ? (
        <Link href={secondaryCtaHref} className="btn-secondary">
          {secondaryCtaLabel}
        </Link>
      ) : null}
    </>
  );

  const heroImage =
    hasHeroMedia || isHome ? (
      <div className="surface-card overflow-hidden rounded-4xl border border-border-subtle p-2">
        {hasHeroMedia ? (
          <Image
            src={normalizeMediaUrl(heroMedia!.url!)}
            alt={heroMedia!.alt ?? headline}
            width={heroMedia!.width ?? 1200}
            height={heroMedia!.height ?? 675}
            className="w-full rounded-3xl"
            priority
          />
        ) : isHome ? (
          block ? (
            <ImagePlaceholder alt={headline} />
          ) : (
            <Image
              src={rainInAction.src}
              alt={headline}
              width={rainInAction.width}
              height={rainInAction.height}
              className="w-full rounded-3xl"
              priority
            />
          )
        ) : null}
      </div>
    ) : null;

  if (variant === 'split-right-media' || variant === 'split-left-media') {
    const imageFirst = variant === 'split-left-media';

    if (!heroImage) {
      return (
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-20 lg:pb-28">
          <div className="relative z-10 mx-auto max-w-4xl px-8">
            {announcement ? (
              <p className="mb-4 text-sm font-medium tracking-[0.2em] text-brand uppercase">{announcement}</p>
            ) : null}
            <h1 className="text-balance text-4xl tracking-tighter md:text-5xl lg:text-6xl">{headline}</h1>
            {subheadline ? (
              <p className="mt-6 text-lg text-foreground-muted text-pretty">{subheadline}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-4">{ctaLinks}</div>
          </div>
        </section>
      );
    }

    return (
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-20 lg:pb-28">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-8 lg:grid-cols-2">
          <div className={imageFirst ? 'lg:order-2' : undefined}>
            {announcement ? (
              <p className="mb-4 text-sm font-medium tracking-[0.2em] text-brand uppercase">{announcement}</p>
            ) : null}
            <h1 className="text-balance text-4xl tracking-tighter md:text-5xl lg:text-6xl">{headline}</h1>
            {subheadline ? (
              <p className="mt-6 text-lg text-foreground-muted text-pretty">{subheadline}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-4">{ctaLinks}</div>
          </div>
          <div className={imageFirst ? 'lg:order-1' : undefined}>{heroImage}</div>
        </div>
        <GlowBackground variant="hero-split" priority />
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden pt-20 ${heroImage ? 'pb-32 lg:pb-[350px] xl:pb-[450px]' : 'pb-20 lg:pb-28'} xl:pt-24`}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-8">
        <div className="mx-auto max-w-4xl text-center">
          {announcement ? (
            <p className="mb-6 inline-flex rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground-muted">
              {announcement}
            </p>
          ) : null}
          {isHome ? (
            <p className="mb-3 text-sm font-medium tracking-[0.2em] text-brand uppercase">{t!('tagline')}</p>
          ) : null}
          <h1 className="text-balance text-4xl tracking-tighter md:text-6xl lg:text-[5rem] lg:leading-[1.2]">
            {headline}
          </h1>
          {subheadline ? (
            <p className="mx-auto mt-6 max-w-3xl text-lg text-foreground-muted text-pretty">{subheadline}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{ctaLinks}</div>
          {isHome ? <p className="mt-6 text-sm text-foreground-muted">{t!('videoLabel')}</p> : null}
        </div>
        {heroImage ? <div className="relative z-10 mx-auto mt-16 max-w-5xl">{heroImage}</div> : null}
      </div>
      <GlowBackground variant="hero-centered" priority />
    </section>
  );
}
