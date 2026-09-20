import Image from 'next/image';

import rdGlow from '@/assets/images/rd-glow.webp';

type GlowBackgroundProps = {
  /** Hero: glow centered behind headline. Page: ambient glow across the full page. */
  variant?: 'hero-centered' | 'hero-split' | 'page';
  priority?: boolean;
};

export function GlowBackground({ variant = 'hero-centered', priority = false }: GlowBackgroundProps) {
  if (variant === 'page') {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image
          src={rdGlow}
          alt=""
          width={1559}
          height={924}
          priority={priority}
          sizes="(min-width: 1024px) 2000px, 100vw"
          className="absolute -top-[8vh] left-1/2 w-full max-w-[2200px] -translate-x-1/2 opacity-90 lg:scale-110"
        />
        <Image
          src={rdGlow}
          alt=""
          width={1559}
          height={924}
          sizes="(min-width: 1024px) 2000px, 100vw"
          className="absolute top-[45vh] left-1/2 w-full max-w-[1800px] -translate-x-1/2 opacity-40 blur-sm lg:scale-105"
        />
      </div>
    );
  }

  const positionClass =
    variant === 'hero-split'
      ? 'absolute top-1/2 left-1/2 -z-10 hidden w-full -translate-x-1/2 -translate-y-1/2 lg:block'
      : 'pointer-events-none absolute top-[38%] left-1/2 -z-10 hidden w-full -translate-x-1/2 -translate-y-1/2 lg:block';

  const maxWidth = variant === 'hero-split' ? 'max-w-[1200px] opacity-70' : 'max-w-[2000px] opacity-90 lg:scale-105';

  return (
    <div aria-hidden className={positionClass}>
      <Image
        src={rdGlow}
        alt=""
        width={1559}
        height={924}
        priority={priority}
        sizes={`(min-width: 1024px) ${variant === 'hero-split' ? '1200px' : '2000px'}, 100vw`}
        className={`mx-auto w-full ${maxWidth}`}
      />
    </div>
  );
}
