import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: '/',
      disallow: ['/admin', '/api/'],
      userAgent: '*',
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
