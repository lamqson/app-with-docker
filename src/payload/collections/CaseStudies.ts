import type { CollectionConfig } from 'payload';

import { seoField } from '../fields/seo';

export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description: 'Original raindrop.com URL this case study was imported from.',
        readOnly: true,
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'clientLogo',
      type: 'upload',
      relationTo: 'media',
    },
    seoField,
  ],
};
