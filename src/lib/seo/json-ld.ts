import { routing } from '@/i18n/routing';
import {
  CANONICAL_BOILERPLATE,
  ORGANIZATION_ADDRESS,
  ORGANIZATION_CONTACT,
  ORGANIZATION_FOUNDED,
  ORGANIZATION_LEGAL_NAME,
  ORGANIZATION_SAME_AS,
  ORGANIZATION_SHORT_NAME,
} from '@/lib/seo/organization';
import { absoluteUrl, defaultOgImageUrl, getSiteUrl } from '@/lib/seo/site';
import type { FaqBlock, Page } from '@/payload/payload-types';

type JsonLd = Record<string, unknown>;

const SOFTWARE_PRODUCTS: Record<
  string,
  { name: string; description: string; category: string }
> = {
  'solutions/modules/rainsign': {
    name: 'RainSign',
    description:
      'RainSign is Raindrop Systems’ native electronic signature, built into Raindrop CLM. Procurement, legal, and suppliers execute contracts inside the same system that authored, redlined, and approved them.',
    category: 'BusinessApplication',
  },
  'solutions/modules/contract-lifecycle-management': {
    name: 'Raindrop Contract Lifecycle Management',
    description:
      'AI-native contract lifecycle management with drafting, redlining, approvals, RainSign e-signature, and commitment visibility inside Raindrop’s source-to-pay platform.',
    category: 'BusinessApplication',
  },
  'solutions/platform/intake-orchestration': {
    name: 'Raindrop Intake & Orchestration',
    description:
      'Digital front door and intake orchestration for procurement requests, embedded in Raindrop’s AI-native source-to-pay platform.',
    category: 'BusinessApplication',
  },
};

export function buildOrganizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${getSiteUrl()}/#organization`,
    name: ORGANIZATION_LEGAL_NAME,
    alternateName: [ORGANIZATION_SHORT_NAME, 'Raindrop', 'Raindrop Platform'],
    url: getSiteUrl(),
    logo: defaultOgImageUrl(),
    description: CANONICAL_BOILERPLATE,
    foundingDate: String(ORGANIZATION_FOUNDED),
    address: {
      '@type': 'PostalAddress',
      ...ORGANIZATION_ADDRESS,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: ORGANIZATION_CONTACT.telephone,
      email: ORGANIZATION_CONTACT.email,
      areaServed: 'Worldwide',
      availableLanguage: routing.locales,
    },
    sameAs: ORGANIZATION_SAME_AS,
  };
}

export function buildWebSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteUrl()}/#website`,
    name: ORGANIZATION_SHORT_NAME,
    url: getSiteUrl(),
    description: CANONICAL_BOILERPLATE,
    publisher: {
      '@id': `${getSiteUrl()}/#organization`,
    },
    inLanguage: routing.locales,
  };
}

export function buildFaqPageJsonLd(items: FaqBlock['items']): JsonLd | null {
  const faqs = (items ?? []).flatMap((item) => {
    const question = item.question?.trim();
    const answer = item.answer?.trim();
    if (!question || !answer) {
      return [];
    }
    return [
      {
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      },
    ];
  });

  if (!faqs.length) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs,
  };
}

export function buildSoftwareApplicationJsonLd(slug: string, pageTitle: string): JsonLd | null {
  const product = SOFTWARE_PRODUCTS[slug];
  if (!product) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    applicationCategory: product.category,
    operatingSystem: 'Web',
    description: product.description,
    url: absoluteUrl(`/${slug}`),
    provider: {
      '@id': `${getSiteUrl()}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Contact Raindrop Systems for pricing.',
    },
    alternateName: pageTitle !== product.name ? [pageTitle] : undefined,
  };
}

export function buildBreadcrumbJsonLd(slug: string, pageTitle: string): JsonLd | null {
  if (!slug || slug === 'home') {
    return null;
  }

  const segments = slug.split('/');
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: getSiteUrl(),
    },
    ...segments.map((segment, index) => {
      const path = segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;
      return {
        '@type': 'ListItem',
        position: index + 2,
        name: isLast ? pageTitle : segment.replace(/-/g, ' '),
        item: absoluteUrl(`/${path}`),
      };
    }),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export function extractFaqBlocks(page: Page): FaqBlock['items'] {
  return (
    page.blocks?.flatMap((block) =>
      block.blockType === 'faq' ? (block.items ?? []) : [],
    ) ?? []
  );
}

export function buildPageJsonLd(page: Page): JsonLd[] {
  const graphs: JsonLd[] = [];
  const faqItems = extractFaqBlocks(page);
  const faq = buildFaqPageJsonLd(faqItems);
  const software = buildSoftwareApplicationJsonLd(page.slug, page.title);
  const breadcrumbs = buildBreadcrumbJsonLd(page.slug, page.title);

  if (faq) {
    graphs.push(faq);
  }
  if (software) {
    graphs.push(software);
  }
  if (breadcrumbs) {
    graphs.push(breadcrumbs);
  }

  return graphs;
}

export function buildGlobalJsonLd(): JsonLd[] {
  return [buildOrganizationJsonLd(), buildWebSiteJsonLd()];
}
