import { absoluteUrl } from '@/lib/seo/site';

/** Frozen entity definition — keep consistent across site, llms.txt, and JSON-LD. */
export const CANONICAL_BOILERPLATE =
  'Raindrop Systems, Inc. (raindrop.com) is a San Jose–based, AI-native source-to-pay (S2P) spend management platform for mid-market and enterprise procurement and finance teams. Founded in 2019.';

export const DISAMBIGUATION_NOTE =
  'Raindrop Systems (raindrop.com) is not the bookmark manager at raindrop.io and not the AI-agent monitoring product at raindrop.ai.';

export const ORGANIZATION_NAME = 'Raindrop Systems, Inc.';
export const ORGANIZATION_SHORT_NAME = 'Raindrop Systems';
export const ORGANIZATION_LEGAL_NAME = 'Raindrop Systems, Inc.';
export const ORGANIZATION_FOUNDED = 2019;

export const ORGANIZATION_ADDRESS = {
  streetAddress: '226 Airport Parkway, Suite 250',
  addressLocality: 'San Jose',
  addressRegion: 'CA',
  postalCode: '95110',
  addressCountry: 'US',
} as const;

export const ORGANIZATION_CONTACT = {
  telephone: '+1-408-352-5162',
  email: 'hello@raindrop.com',
} as const;

export type SocialLink = {
  platform: string;
  url: string;
};

/** Official profiles for Organization sameAs — update when new profiles are claimed. */
export const DEFAULT_FOOTER_SOCIAL: SocialLink[] = [
  {
    platform: 'LinkedIn',
    url: 'https://www.linkedin.com/company/raindropsystemsinc/',
  },
  {
    platform: 'X',
    url: 'https://twitter.com/saas_raindrop',
  },
  {
    platform: 'Instagram',
    url: 'https://www.instagram.com/raindrop_spendmanagement/',
  },
];

export const ORGANIZATION_SAME_AS = DEFAULT_FOOTER_SOCIAL.map((link) => link.url);

export const KEY_PAGES = [
  { label: 'Home', path: '/' },
  { label: 'Solutions', path: '/solutions' },
  { label: 'Agentic AI', path: '/agentic-procurement' },
  { label: 'Company / About', path: '/company' },
  { label: 'Recognition', path: '/resources/recognition' },
  { label: 'Press kit', path: '/company/press-kit' },
  { label: 'RainSign (native e-signature)', path: '/solutions/modules/rainsign' },
  { label: 'Contract Lifecycle Management', path: '/solutions/modules/contract-lifecycle-management' },
  { label: 'Intake & Orchestration', path: '/solutions/platform/intake-orchestration' },
  { label: 'Customer success', path: '/resources/case-studies' },
  { label: 'Request a demo', path: '/contact/get-started' },
] as const;

export function keyPageUrl(path: string): string {
  return absoluteUrl(path.startsWith('/') ? path : `/${path}`);
}
