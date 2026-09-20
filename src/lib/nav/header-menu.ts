/** Production header IA — paths match raindrop.com for inbound links. */
export type NavChildLink = {
  href: string;
  key: string;
};

export type NavMegaColumn = {
  titleKey: string;
  href: string;
  children: NavChildLink[];
};

export type NavDropdownItem = {
  kind: 'dropdown';
  id: string;
  href: string;
  key: string;
  children: NavChildLink[];
};

export type NavMegaItem = {
  kind: 'mega';
  id: string;
  href: string;
  key: string;
  columns: NavMegaColumn[];
};

export type HeaderMenuItem = NavDropdownItem | NavMegaItem;

function path(href: string): string {
  return href === '/' ? '/' : href.replace(/\/+$/, '');
}

export const HEADER_MENU: HeaderMenuItem[] = [
  {
    kind: 'dropdown',
    id: 'why-raindrop',
    href: path('/why-raindrop'),
    key: 'whyRaindrop',
    children: [
      { href: path('/agentic-procurement'), key: 'agenticAi' },
      { href: path('/ai-native-procurement'), key: 'aiNativeProcurement' },
      { href: path('/why-raindrop/ai-powered'), key: 'aiPowered' },
      { href: path('/why-raindrop/our-expertise'), key: 'ourExpertise' },
      { href: path('/why-raindrop/customer-success-stories'), key: 'customerSuccess' },
      { href: path('/resources/recognition'), key: 'recognition' },
    ],
  },
  {
    kind: 'mega',
    id: 'solutions',
    href: path('/solutions'),
    key: 'solutions',
    columns: [
      {
        titleKey: 'platform',
        href: path('/solutions/platform'),
        children: [
          { href: path('/ai-native-procurement'), key: 'aiNativeProcurement' },
          { href: path('/solutions/platform/key-components'), key: 'keyComponents' },
          { href: path('/solutions/raindrop-integrates-anywhere'), key: 'integrations' },
          { href: path('/solutions/platform/intake-orchestration'), key: 'intakeOrchestration' },
        ],
      },
      {
        titleKey: 'modules',
        href: path('/solutions/modules'),
        children: [
          { href: path('/solutions/modules/supplier-management'), key: 'supplierManagement' },
          { href: path('/solutions/modules/sourcing'), key: 'sourcing' },
          { href: path('/solutions/modules/contract-lifecycle-management'), key: 'clm' },
          { href: path('/solutions/modules/eprocurement'), key: 'eprocurement' },
          { href: path('/solutions/modules/e-invoicing'), key: 'eInvoicing' },
          { href: path('/solutions/modules/ap-automation'), key: 'apAutomation' },
          { href: path('/solutions/modules/rainpay'), key: 'rainpay' },
          { href: path('/solutions/modules/analytics'), key: 'analytics' },
          { href: path('/solutions/modules/rainsign'), key: 'rainsign' },
        ],
      },
      {
        titleKey: 'byBusinessFunction',
        href: path('/solutions/by-business-function'),
        children: [
          { href: path('/solutions/by-business-function/executives'), key: 'executives' },
          { href: path('/solutions/by-business-function/finance-teams'), key: 'finance' },
          { href: path('/solutions/by-business-function/procurement-teams'), key: 'procurement' },
          { href: path('/solutions/by-business-function/it-and-compliance-teams'), key: 'itCompliance' },
          { href: path('/solutions/by-business-function/legal-teams'), key: 'legal' },
        ],
      },
    ],
  },
  {
    kind: 'dropdown',
    id: 'company',
    href: path('/company'),
    key: 'company',
    children: [
      { href: path('/company/raindrop-team'), key: 'leadershipTeam' },
      { href: path('/company/advisor-team'), key: 'advisoryBoard' },
      { href: path('/why-raindrop/our-expertise'), key: 'ourExpertise' },
      { href: path('/company/partners'), key: 'partners' },
    ],
  },
  {
    kind: 'dropdown',
    id: 'resources',
    href: path('/resources'),
    key: 'resources',
    children: [
      { href: path('/resources/articles'), key: 'articles' },
      { href: path('/resources/recognition'), key: 'recognition' },
      { href: path('/resources/case-studies'), key: 'customerSuccess' },
      { href: path('/resources/raindrop-news'), key: 'raindropNews' },
      { href: path('/resources/videos'), key: 'videos' },
      { href: path('/resources/podcasts'), key: 'podcasts' },
    ],
  },
  {
    kind: 'dropdown',
    id: 'contact',
    href: path('/contact'),
    key: 'contact',
    children: [{ href: path('/contact/get-started'), key: 'bookDemo' }],
  },
];

export const HEADER_LINKS = HEADER_MENU.map((item) => ({
  href: item.href,
  key: item.key,
})) as readonly { href: string; key: string }[];

export type HeaderLinkKey = (typeof HEADER_LINKS)[number]['key'];

/** Flat list of every in-nav URL for crawls and sitemap generation. */
export function collectHeaderMenuHrefs(menu: HeaderMenuItem[] = HEADER_MENU): string[] {
  const hrefs = new Set<string>();

  for (const item of menu) {
    hrefs.add(item.href);
    if (item.kind === 'dropdown') {
      for (const child of item.children) {
        hrefs.add(child.href);
      }
    } else {
      for (const column of item.columns) {
        hrefs.add(column.href);
        for (const child of column.children) {
          hrefs.add(child.href);
        }
      }
    }
  }

  return [...hrefs].sort();
}
