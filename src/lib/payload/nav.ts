import {
  DEFAULT_TOP_BANNER,
  FOOTER_LEGAL,
  FOOTER_SITEMAP,
  HEADER_LINKS,
  HEADER_MENU,
  type HeaderMenuItem,
} from '@/lib/nav';
import { DEFAULT_FOOTER_SOCIAL, type SocialLink } from '@/lib/seo/organization';
import type { SiteSetting } from '@/payload/payload-types';

export type NavLinkItem = {
  href: string;
  key?: string | null;
  label: string;
};

export type TopBannerItem = {
  href: string;
  label: string;
  openInNewTab?: boolean;
};

export function resolveNavLabel(
  link: Pick<NavLinkItem, 'href' | 'key' | 'label'>,
  translate?: (key: string) => string,
): string {
  if (link.label.trim()) {
    return link.label;
  }

  if (link.key && translate) {
    try {
      return translate(link.key);
    } catch {
      return link.key;
    }
  }

  return link.href;
}

/** Locked production header — CMS flat links are not used for structure. */
export function getHeaderMenu(): HeaderMenuItem[] {
  return HEADER_MENU;
}

export function getHeaderNav(): NavLinkItem[] {
  return HEADER_LINKS.map((link) => ({
    href: link.href,
    key: link.key,
    label: '',
  }));
}

export function getFooterSitemap(settings: SiteSetting | null): NavLinkItem[] {
  if (settings?.footerSitemap?.length) {
    return settings.footerSitemap.map((link) => ({
      href: link.href,
      key: link.key,
      label: link.label,
    }));
  }

  return FOOTER_SITEMAP.map((link) => ({
    href: link.href,
    key: link.key,
    label: '',
  }));
}

export function getFooterLegal(settings: SiteSetting | null): NavLinkItem[] {
  if (settings?.footerLegal?.length) {
    return settings.footerLegal.map((link) => ({
      href: link.href,
      key: link.key,
      label: link.label,
    }));
  }

  return FOOTER_LEGAL.map((link) => ({
    href: link.href,
    key: link.key,
    label: '',
  }));
}

export function getSignInHref(settings: SiteSetting | null): string {
  return settings?.signInUrl?.trim() || 'https://us1.raindrop.com/';
}

export function getDemoCtaHref(settings: SiteSetting | null): string {
  return settings?.demoCtaHref?.trim() || '/contact/get-started';
}

export function getFooterSocial(settings: SiteSetting | null): SocialLink[] {
  if (settings?.footerSocial?.length) {
    return settings.footerSocial.flatMap((link) => {
      const platform = link.platform?.trim();
      const url = link.url?.trim();
      if (!platform || !url) {
        return [];
      }
      return [{ platform, url }];
    });
  }

  return DEFAULT_FOOTER_SOCIAL;
}

export function getTopBannerItems(settings: SiteSetting | null): TopBannerItem[] {
  if (settings?.topBanner?.length) {
    return settings.topBanner.flatMap((item) => {
      const label = item.label?.trim();
      const href = item.href?.trim();

      if (!label || !href) {
        return [];
      }

      return [
        {
          label,
          href,
          openInNewTab: item.openInNewTab ?? false,
        },
      ];
    });
  }

  return DEFAULT_TOP_BANNER.map((item) => ({ ...item }));
}
