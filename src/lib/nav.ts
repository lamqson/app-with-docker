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

export const DEFAULT_TOP_BANNER = [
  {
    label: 'Raindrop Recognized As A Sample Vendor In 2026 Gartner Hype Cycle',
    href: '/hype-cycle-for-procurement-sourcing-2026',
    openInNewTab: false,
  },
  {
    label: 'Understanding Agentic AI & Its Role In Procurement',
    href: '/understanding-agentic-ai-and-its-role-in-procurement',
    openInNewTab: false,
  },
  {
    label: 'Contracts that flag their own renewals. Meet Agentic CLM.',
    href: '/solutions/modules/contract-lifecycle-management',
    openInNewTab: false,
  },
] as const;

export const TOP_BANNER_SLUGS = DEFAULT_TOP_BANNER.map((item) => item.href.replace(/^\//, ''));

export const FOOTER_LEGAL = [
  { href: '/legal', key: 'legal' },
  { href: '/security', key: 'security' },
  { href: '/legal/privacy', key: 'privacy' },
] as const;
