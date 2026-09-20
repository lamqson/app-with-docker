import type { CollectionConfig } from 'payload';

import { pageBlocks } from '../blocks';
import { seoField } from '../fields/seo';

export const Pages: CollectionConfig = {
  slug: 'pages',
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
      admin: {
        description: 'URL path without locale prefix (e.g. home, about, legal/privacy).',
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description: 'Original raindrop.com URL this page was imported from.',
        readOnly: true,
      },
    },
    seoField,
    {
      name: 'blocks',
      type: 'blocks',
      localized: true,
      blocks: pageBlocks,
    },
  ],
};
