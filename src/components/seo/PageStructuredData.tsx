import { JsonLd } from '@/components/seo/JsonLd';
import { buildPageJsonLd } from '@/lib/seo/json-ld';
import type { Page } from '@/payload/payload-types';

type PageStructuredDataProps = {
  page: Page;
};

export function PageStructuredData({ page }: PageStructuredDataProps) {
  const data = buildPageJsonLd(page);
  if (!data.length) {
    return null;
  }

  return <JsonLd data={data} />;
}
