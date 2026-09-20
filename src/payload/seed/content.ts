type LexicalTextNode = {
  type: 'text';
  text: string;
  version: number;
};

type LexicalParagraphNode = {
  type: 'paragraph';
  children: LexicalTextNode[];
  direction: null;
  format: '';
  indent: 0;
  version: number;
};

export type LexicalRichText = {
  root: {
    type: 'root';
    children: LexicalParagraphNode[];
    direction: null;
    format: '';
    indent: 0;
    version: number;
  };
};

function paragraph(text: string): LexicalParagraphNode {
  return {
    type: 'paragraph',
    children: [{ type: 'text', text, version: 1 }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  };
}

export function richTextFromParagraphs(paragraphs: string[]): LexicalRichText {
  return {
    root: {
      type: 'root',
      children: paragraphs.map(paragraph),
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

export function richTextBlock(title: string, paragraphs: string[]) {
  return {
    blockType: 'richText' as const,
    content: richTextFromParagraphs(paragraphs),
  };
}

const PAGE_COPY: Record<string, string[]> = {
  about: [
    'Raindrop is an AI-native source-to-pay platform for teams that need speed, control, and clarity across spend.',
    'We connect intake, sourcing, contracts, supplier management, and payments on one codebase so finance and procurement can work from the same system of record.',
  ],
  'why-raindrop': [
    'Most source-to-pay stacks were built module by module. Raindrop starts with the request and layers agentic workflows on top of unified data.',
    'Rain, our agentic assistant, helps business users ask questions, route work, and move from insight to action without switching tools.',
  ],
  company: [
    'Raindrop is built in San Jose with teams across product, customer success, and go-to-market focused on modern procurement.',
    'We partner with finance and operations leaders at global brands to simplify how work gets requested, approved, and paid.',
  ],
  platform: [
    'The Raindrop platform covers intake orchestration, sourcing events, contract lifecycle, supplier records, and accounts payable in one environment.',
    'Each module shares permissions, audit history, and reporting so leaders can trust the data behind every decision.',
  ],
  solutions: [
    'Raindrop supports procurement, finance, legal, and business teams with workflows tailored to their role in source-to-pay.',
    'Use Raindrop to standardize intake, accelerate sourcing cycles, and give approvers the context they need before money moves.',
  ],
  pricing: [
    'Pricing depends on user count, modules enabled, and rollout scope. Most customers start with intake and sourcing, then expand to CLM and AP.',
    'Contact our team for a tailored quote and deployment plan aligned to your existing ERP and payment stack.',
  ],
  customers: [
    'Retail, manufacturing, and services companies use Raindrop to unify how requests become commitments and payments.',
    'Browse case studies below or request a reference call during your demo.',
  ],
  blog: [
    'Updates on agentic procurement, product releases, and customer lessons from the Raindrop team.',
  ],
  resources: [
    'Guides, webinars, and templates for teams modernizing intake, sourcing, and supplier governance.',
    'Check back as we publish new material, or subscribe during your demo request.',
  ],
  contact: [
    'Reach the Raindrop team for product questions, partnership inquiries, or support routing.',
    'We respond to new inquiries within one business day.',
  ],
  legal: [
    'Review Raindrop legal documents including our SaaS agreement, acceptable use policy, and data processing addendum.',
    'Published PDFs are available in the site asset library and can be linked from this page as downloads are wired up.',
  ],
  security: [
    'Raindrop maintains SOC 2 controls, role-based access, and audit logging across source-to-pay workflows.',
    'Contact security@raindrop.com for questionnaires, penetration test summaries, or vendor review packages.',
  ],
  'legal/privacy': [
    'This privacy policy placeholder describes how Raindrop collects, uses, and protects customer and user data.',
    'Replace with your counsel-approved policy text before production launch.',
  ],
  'legal/terms': [
    'These terms of service placeholder outline acceptable use of the Raindrop marketing site and product.',
    'Replace with your counsel-approved terms before production launch.',
  ],
};

export function placeholderBlocksForPage(slug: string, title: string) {
  if (slug === 'demo' || slug === 'contact') {
    return [
      {
        blockType: 'formEmbed' as const,
        headline: slug === 'demo' ? 'Request a demo' : 'Contact Raindrop',
        description:
          slug === 'demo'
            ? 'Tell us about your source-to-pay goals and we will schedule a tailored walkthrough.'
            : 'Send a note to our team and we will route your request to the right group.',
      },
    ];
  }

  const paragraphs = PAGE_COPY[slug] ?? [
    `${title} content will be managed in Payload. This placeholder copy confirms the route is wired correctly.`,
    'Replace it with blocks, rich text, and media from the admin panel.',
  ];

  return [richTextBlock(title, paragraphs)];
}

export function samplePostContent(): LexicalRichText {
  return richTextFromParagraphs([
    'Finance teams still lose time chasing context across email, spreadsheets, and legacy intake tools.',
    'Raindrop connects the request, approval path, and supplier record so Rain can answer questions with data the business already trusts.',
    'Start with intake orchestration, then expand into sourcing and contract workflows as your rollout matures.',
  ]);
}

export function sampleCaseStudyContent(): LexicalRichText {
  return richTextFromParagraphs([
    'A multi-brand retailer replaced three intake tools with Raindrop to give business users one front door for spend requests.',
    'Procurement cut cycle time on tactical buys by standardizing data at submission and giving approvers policy context up front.',
    'Finance gained cleaner accrual signals because commitments and POs now share the same supplier and category model.',
  ]);
}
