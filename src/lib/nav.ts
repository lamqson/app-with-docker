export {
  collectHeaderMenuHrefs,
  HEADER_LINKS,
  HEADER_MENU,
  type HeaderLinkKey,
  type HeaderMenuItem,
  type NavChildLink,
  type NavDropdownItem,
  type NavMegaColumn,
  type NavMegaItem,
} from '@/lib/nav/header-menu';

export const FOOTER_SITEMAP = [
  { href: '/why-raindrop', key: 'whyRaindrop' },
  { href: '/solutions', key: 'solutions' },
  { href: '/company', key: 'company' },
  { href: '/resources', key: 'resources' },
  { href: '/contact', key: 'contact' },
] as const;

export const FOOTER_LEGAL = [
  { href: '/legal', key: 'legal' },
  { href: '/security', key: 'security' },
  { href: '/legal/privacy', key: 'privacy' },
] as const;
