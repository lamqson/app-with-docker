import type { GlobalConfig } from 'payload';

import { navLinksField } from '../fields/link';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Branding',
          fields: [
            {
              name: 'logoLight',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'logoDark',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'defaultTheme',
              type: 'select',
              defaultValue: 'dark',
              options: [
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
              ],
            },
            {
              name: 'defaultLocale',
              type: 'select',
              defaultValue: 'en',
              options: [
                { label: 'English', value: 'en' },
                { label: 'Spanish', value: 'es' },
                { label: 'French', value: 'fr' },
                { label: 'German', value: 'de' },
                { label: 'Traditional Chinese', value: 'zh-TW' },
                { label: 'Simplified Chinese', value: 'zh-CN' },
                { label: 'Japanese', value: 'ja' },
                { label: 'Korean', value: 'ko' },
                { label: 'Italian', value: 'it' },
                { label: 'Portuguese', value: 'pt' },
                { label: 'Brazilian Portuguese', value: 'pt-BR' },
              ],
            },
          ],
        },
        {
          label: 'Navigation',
          fields: [
            navLinksField('headerNav', 'Header navigation'),
            {
              name: 'signInUrl',
              type: 'text',
              defaultValue: '#',
            },
            {
              name: 'demoCtaHref',
              type: 'text',
              defaultValue: '/demo',
            },
            navLinksField('footerSitemap', 'Footer sitemap'),
            navLinksField('footerLegal', 'Footer legal links'),
            {
              name: 'footerSocial',
              label: 'Footer social links',
              type: 'array',
              fields: [
                {
                  name: 'platform',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Integrations',
          fields: [
            {
              name: 'hubspotPortalId',
              type: 'text',
              admin: {
                description: 'Overrides NEXT_PUBLIC_HUBSPOT_PORTAL_ID when set.',
              },
            },
            {
              name: 'hubspotDemoFormId',
              type: 'text',
              admin: {
                description: 'Overrides NEXT_PUBLIC_HUBSPOT_DEMO_FORM_ID when set.',
              },
            },
            {
              name: 'graphqlAgentEndpoint',
              type: 'text',
              admin: {
                description: 'Overrides GRAPHQL_ENDPOINT when set.',
              },
            },
            {
              name: 'agentEnabled',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
      ],
    },
  ],
};
