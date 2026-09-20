import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FOOTER_LEGAL, FOOTER_SITEMAP, HEADER_LINKS } from '@/lib/nav';

import { getPayload } from '../../lib/payload/getPayload';
import {
  placeholderBlocksForPage,
  sampleCaseStudyContent,
  samplePostContent,
} from './content';
import {
  blocksFromImported,
  collectImportedAssetPaths,
  isPublishedImport,
  loadImportedDocuments,
} from './import-markdown';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const assetsRoot = path.resolve(dirname, '../../assets');

const CORE_PAGES = [
  { slug: 'home', title: 'Home' },
  { slug: 'why-raindrop', title: 'Why Raindrop?' },
  { slug: 'about', title: 'About' },
  { slug: 'company', title: 'Company' },
  { slug: 'platform', title: 'Platform' },
  { slug: 'solutions', title: 'Solutions' },
  { slug: 'pricing', title: 'Pricing' },
  { slug: 'customers', title: 'Customers' },
  { slug: 'blog', title: 'Blog' },
  { slug: 'resources', title: 'Resources' },
  { slug: 'demo', title: 'Book a Demo' },
  { slug: 'contact', title: 'Contact' },
  { slug: 'legal', title: 'Legal' },
  { slug: 'security', title: 'Security' },
  { slug: 'legal/privacy', title: 'Privacy Policy' },
  { slug: 'legal/terms', title: 'Terms of Service' },
] as const;

const SAMPLE_POSTS = [
  {
    slug: 'agentic-intake-for-finance-teams',
    title: 'Agentic intake for finance teams',
    excerpt: 'How Raindrop connects requests, approvals, and supplier context in one workflow.',
  },
] as const;

const SAMPLE_CASE_STUDIES = [
  {
    slug: 'global-retailer-unifies-source-to-pay',
    title: 'Global retailer unifies source-to-pay',
    excerpt: 'One front door for spend requests across brands and business units.',
  },
] as const;

const SEED_MEDIA = [
  { relativePath: 'images/raindrop_full_logo.svg', alt: 'Raindrop logo (light theme)' },
  { relativePath: 'images/raindrop_full_logo_white.svg', alt: 'Raindrop logo (dark theme)' },
  { relativePath: 'images/raindrop_logo.svg', alt: 'Raindrop mark (light theme)' },
  { relativePath: 'images/raindrop_logo_white.svg', alt: 'Raindrop mark (dark theme)' },
  { relativePath: 'images/icon.png', alt: 'Raindrop icon' },
  { relativePath: 'images/icon_512x512.png', alt: 'Raindrop app icon' },
  { relativePath: 'images/rd-glow.webp', alt: 'Raindrop hero glow' },
  { relativePath: 'images/home/rain-base.webp', alt: 'Raindrop platform overview' },
  { relativePath: 'images/home/rain-in-action.webp', alt: 'Raindrop in action' },
  { relativePath: 'images/home/value-authentic.webp', alt: 'Authentic value illustration' },
  { relativePath: 'images/home/value-built.webp', alt: 'Built for finance illustration' },
  { relativePath: 'images/home/value-commitments.webp', alt: 'Commitments illustration' },
  { relativePath: 'images/home/logo-container-store.webp', alt: 'Container Store logo' },
  { relativePath: 'images/home/logo-insight-global.webp', alt: 'Insight Global logo' },
  { relativePath: 'images/home/logo-lands-end.webp', alt: 'Lands End logo' },
  { relativePath: 'images/home/logo-pottery-barn.webp', alt: 'Pottery Barn logo' },
  { relativePath: 'images/home/logo-sephora.webp', alt: 'Sephora logo' },
  { relativePath: 'images/home/logo-williams-sonoma.webp', alt: 'Williams Sonoma logo' },
  { relativePath: 'images/home/logo-workwear.webp', alt: 'Workwear logo' },
  { relativePath: 'images/home/logo-world-market.webp', alt: 'World Market logo' },
] as const;

function navLinksFromConfig(
  links: ReadonlyArray<{ href: string; key: string }>,
  labels: Record<string, string>,
) {
  return links.map((link) => ({
    key: link.key,
    href: link.href,
    label: labels[link.key] ?? link.key,
  }));
}

async function seed() {
  if (!process.env.PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET is required. Copy .env.example to .env and set a secret.');
  }

  const payload = await getPayload();

  const users = await payload.find({ collection: 'users', limit: 1 });
  if (users.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
        password: process.env.SEED_ADMIN_PASSWORD || 'changeme',
      },
    });
    console.log('Created admin user');
  }

  const mediaByPath = new Map<string, number>();

  for (const asset of SEED_MEDIA) {
    const filePath = path.join(assetsRoot, asset.relativePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing asset: ${asset.relativePath}`);
      continue;
    }

    const basename = path.basename(filePath);
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: basename } },
      limit: 1,
    });

    if (existing.docs[0]) {
      mediaByPath.set(asset.relativePath, Number(existing.docs[0].id));
      continue;
    }

    const doc = await payload.create({
      collection: 'media',
      filePath,
      data: { alt: asset.alt },
    });

    mediaByPath.set(asset.relativePath, Number(doc.id));
    console.log(`Uploaded media: ${asset.relativePath}`);
  }

  const headerNav = navLinksFromConfig(HEADER_LINKS, {
    whyRaindrop: 'Why Raindrop?',
    solutions: 'Solutions',
    company: 'Company',
    resources: 'Resources',
    contact: 'Contact',
  });

  const footerSitemap = navLinksFromConfig(FOOTER_SITEMAP, {
    whyRaindrop: 'Why Raindrop?',
    solutions: 'Solutions',
    company: 'Company',
    resources: 'Resources',
    contact: 'Contact',
  });

  const footerLegal = navLinksFromConfig(FOOTER_LEGAL, {
    legal: 'Legal',
    security: 'Security',
    privacy: 'Privacy',
  });

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      defaultLocale: 'en',
      defaultTheme: 'dark',
      demoCtaHref: '/contact/get-started',
      signInUrl: 'https://us1.raindrop.com/',
      hubspotPortalId: process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || '',
      hubspotDemoFormId: process.env.NEXT_PUBLIC_HUBSPOT_DEMO_FORM_ID || '',
      graphqlAgentEndpoint: process.env.GRAPHQL_ENDPOINT || '',
      agentEnabled: true,
      logoLight: mediaByPath.get('images/raindrop_full_logo.svg'),
      logoDark: mediaByPath.get('images/raindrop_full_logo_white.svg'),
      topBanner: [
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
      ],
      headerNav,
      footerSitemap,
      footerLegal,
    },
  });
  console.log('Updated site settings');

  const importedDocs = loadImportedDocuments();
  const importedAssetPaths = collectImportedAssetPaths(importedDocs);

  for (const relativePath of importedAssetPaths) {
    if (!relativePath) {
      continue;
    }
    const filePath = path.join(assetsRoot, relativePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing imported asset: ${relativePath}`);
      continue;
    }

    if (mediaByPath.has(relativePath)) {
      continue;
    }

    const basename = path.basename(filePath);
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: basename } },
      limit: 1,
    });

    if (existing.docs[0]) {
      mediaByPath.set(relativePath, Number(existing.docs[0].id));
      continue;
    }

    const doc = await payload.create({
      collection: 'media',
      filePath,
      data: { alt: basename.replace(/[-_]/g, ' ') },
    });
    mediaByPath.set(relativePath, Number(doc.id));
    console.log(`Uploaded imported media: ${relativePath}`);
  }

  for (const doc of importedDocs) {
    for (const image of doc.images) {
      if (image.reused && !image.downloadFailed) {
        const key = image.src.replace(/^\/src\/assets\//, '');
        if (mediaByPath.has(key)) continue;
        const filePath = path.join(assetsRoot, key);
        if (!fs.existsSync(filePath)) continue;
        const basename = path.basename(filePath);
        const existing = await payload.find({
          collection: 'media',
          where: { filename: { equals: basename } },
          limit: 1,
        });
        if (existing.docs[0]) {
          mediaByPath.set(key, Number(existing.docs[0].id));
        }
      }
    }
  }
  for (const doc of importedDocs) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: doc.slug } },
      limit: 1,
    });

    const blocks = blocksFromImported(doc, mediaByPath);
    const publish = isPublishedImport(doc.slug, doc.importStatus);
    const pageData = {
      title: doc.title,
      slug: doc.slug,
      sourceUrl: doc.sourceUrl,
      seo: {
        title: doc.title.includes('Raindrop') ? doc.title : `${doc.title} | Raindrop`,
        description: doc.description,
      },
      blocks,
      _status: publish ? ('published' as const) : ('draft' as const),
    };

    if (existing.docs[0]) {
      await payload.delete({ collection: 'pages', id: existing.docs[0].id });
    }

    await payload.create({
      collection: 'pages',
      draft: !publish,
      data: pageData,
    });
    console.log(`Seeded imported page: ${doc.slug}${publish ? ' (published)' : ''}`);
  }

  const importedSlugs = new Set(importedDocs.map((doc) => doc.slug));

  for (const page of CORE_PAGES) {
    if (importedSlugs.has(page.slug)) {
      continue;
    }
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
    });

    const homeBlocks =
      page.slug === 'home'
        ? [
            {
              blockType: 'hero' as const,
              headline: 'AI-native Source-to-Pay',
              subheadline:
                'Unify intake, sourcing, contracts, suppliers, and payments with an agentic platform built for finance.',
              primaryCta: { label: 'Request a Demo', href: '/demo' },
              secondaryCta: { label: 'See the Platform', href: '/platform' },
              image: mediaByPath.get('images/home/rain-in-action.webp'),
            },
            {
              blockType: 'logoCloud' as const,
              headline: 'Trusted by leading brands',
              logos: [
                'logo-container-store.webp',
                'logo-insight-global.webp',
                'logo-lands-end.webp',
                'logo-pottery-barn.webp',
                'logo-sephora.webp',
                'logo-williams-sonoma.webp',
                'logo-workwear.webp',
                'logo-world-market.webp',
              ].flatMap((filename) => {
                const relativePath = `images/home/${filename}`;
                const mediaId = mediaByPath.get(relativePath);
                if (!mediaId) {
                  return [];
                }
                return [
                  {
                    image: mediaId,
                    alt: filename.replace(/^logo-|-\w+\.webp$/g, ' ').replace(/-/g, ' ').trim(),
                  },
                ];
              }),
            },
          ]
        : placeholderBlocksForPage(page.slug, page.title);

    if (existing.docs[0]) {
      if (!existing.docs[0].blocks?.length) {
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          draft: true,
          data: {
            blocks: homeBlocks,
          },
        });
        console.log(`Backfilled blocks for page: ${page.slug}`);
      }
      continue;
    }

    await payload.create({
      collection: 'pages',
      draft: true,
      data: {
        title: page.title,
        slug: page.slug,
        seo: {
          title: `${page.title} | Raindrop`,
          description: `${page.title} — AI-native Source-to-Pay for modern finance teams.`,
        },
        blocks: homeBlocks,
      },
    });
    console.log(`Created draft page: ${page.slug}`);
  }

  for (const post of SAMPLE_POSTS) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
    });

    if (existing.docs[0]) {
      continue;
    }

    await payload.create({
      collection: 'posts',
      draft: true,
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: samplePostContent(),
        featuredImage: mediaByPath.get('images/home/rain-base.webp'),
        publishedAt: new Date().toISOString(),
        seo: {
          title: `${post.title} | Raindrop`,
          description: post.excerpt,
        },
      },
    });
    console.log(`Created draft post: ${post.slug}`);
  }

  for (const caseStudy of SAMPLE_CASE_STUDIES) {
    const existing = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: caseStudy.slug } },
      limit: 1,
    });

    if (existing.docs[0]) {
      continue;
    }

    await payload.create({
      collection: 'case-studies',
      draft: true,
      data: {
        title: caseStudy.title,
        slug: caseStudy.slug,
        excerpt: caseStudy.excerpt,
        content: sampleCaseStudyContent(),
        featuredImage: mediaByPath.get('images/home/value-built.webp'),
        clientLogo: mediaByPath.get('images/home/logo-sephora.webp'),
        seo: {
          title: `${caseStudy.title} | Raindrop`,
          description: caseStudy.excerpt,
        },
      },
    });
    console.log(`Created draft case study: ${caseStudy.slug}`);
  }

  console.log('Seed complete');
  await payload.destroy();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
