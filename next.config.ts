import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  agentRules: false,
  async redirects() {
    return [
      {
        source: '/:locale/demo',
        destination: '/:locale/contact/get-started',
        permanent: true,
      },
      {
        source: '/demo',
        destination: '/contact/get-started',
        permanent: true,
      },
      {
        source: '/:locale/why-raindrop/agentic-ai',
        destination: '/:locale/agentic-procurement',
        permanent: true,
      },
      {
        source: '/why-raindrop/agentic-ai',
        destination: '/agentic-procurement',
        permanent: true,
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withPayload(withNextIntl(nextConfig));
