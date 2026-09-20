import type { Page } from '@/payload/payload-types';

import {
  AgentTeaserSection,
  ComparisonTableSection,
  CmsTestimonialsSection,
  CtaBlockSection,
  FaqSection,
  FeatureGridSection,
  FeatureSplitSection,
  PricingSection,
  ResourceListSection,
  StatsSection,
} from './CmsBlocks';
import { ContactSection } from './ContactSection';
import { FormEmbedSection } from './FormEmbedSection';
import { Hero } from './Hero';
import { LeadershipGridSection } from './LeadershipGridSection';
import { LogoCloud } from './LogoCloud';
import { RichTextSection } from './RichTextSection';

type RenderBlocksProps = {
  blocks: NonNullable<Page['blocks']>;
};

export async function RenderBlocks({ blocks }: RenderBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`;

        switch (block.blockType) {
          case 'hero':
            return <Hero key={key} block={block} />;
          case 'logoCloud':
            return <LogoCloud key={key} block={block} />;
          case 'richText':
            return <RichTextSection key={key} block={block} />;
          case 'featureGrid':
            return <FeatureGridSection key={key} block={block} />;
          case 'featureSplit':
            return <FeatureSplitSection key={key} block={block} />;
          case 'comparisonTable':
            return <ComparisonTableSection key={key} block={block} />;
          case 'stats':
            return <StatsSection key={key} block={block} />;
          case 'pricingTable':
            return <PricingSection key={key} block={block} />;
          case 'testimonials':
            return <CmsTestimonialsSection key={key} block={block} />;
          case 'faq':
            return <FaqSection key={key} block={block} />;
          case 'cta':
            return <CtaBlockSection key={key} block={block} />;
          case 'formEmbed':
            return <FormEmbedSection key={key} block={block} />;
          case 'contactSection':
            return <ContactSection key={key} block={block} />;
          case 'agentTeaser':
            return <AgentTeaserSection key={key} block={block} />;
          case 'leadershipGrid':
            return <LeadershipGridSection key={key} block={block} />;
          case 'resourceList':
            return <ResourceListSection key={key} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
