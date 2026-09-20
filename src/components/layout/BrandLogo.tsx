import Image from 'next/image';

import logo from '@/assets/images/raindrop_full_logo.svg';
import logoWhite from '@/assets/images/raindrop_full_logo_white.svg';
import { Link } from '@/i18n/navigation';
import { resolveMediaImage } from '@/lib/payload/media';
import type { SiteSetting } from '@/payload/payload-types';

type BrandLogoProps = {
  label: string;
  settings?: SiteSetting | null;
};

export function BrandLogo({ label, settings = null }: BrandLogoProps) {
  const lightLogo = resolveMediaImage(settings?.logoLight, logo, label);
  const darkLogo = resolveMediaImage(settings?.logoDark, logoWhite, '');

  return (
    <Link href="/" aria-label={label} className="inline-flex items-center">
      <Image
        src={lightLogo.src}
        alt={lightLogo.alt}
        width={lightLogo.width}
        height={lightLogo.height}
        unoptimized={lightLogo.unoptimized}
        className="h-8 w-[9.3rem] dark:hidden"
        priority
      />
      <Image
        src={darkLogo.src}
        alt={darkLogo.alt}
        width={darkLogo.width}
        height={darkLogo.height}
        unoptimized={darkLogo.unoptimized}
        className="hidden h-8 w-[9.3rem] dark:block"
        priority
      />
    </Link>
  );
}
