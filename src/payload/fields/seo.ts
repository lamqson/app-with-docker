import type { Field } from 'payload';

export const seoField: Field = {
  name: 'seo',
  type: 'group',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
    },
  ],
};
