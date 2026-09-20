import type { Field } from 'payload';

export function linkFields(name: string, required = true): Field {
  return {
    name,
    type: 'group',
    required,
    fields: [
      {
        name: 'label',
        type: 'text',
        localized: true,
      },
      {
        name: 'href',
        type: 'text',
        required,
      },
    ],
  };
}

export function optionalLinkFields(name: string): Field {
  return linkFields(name, false);
}

const navLinkArrayFields: Field[] = [
  {
    name: 'key',
    type: 'text',
    admin: {
      description: 'Stable id for i18n message keys (optional).',
    },
  },
  {
    name: 'label',
    type: 'text',
    localized: true,
    required: true,
  },
  {
    name: 'href',
    type: 'text',
    required: true,
  },
];

export function navLinksField(name: string, label: string): Field {
  return {
    name,
    label,
    type: 'array',
    fields: navLinkArrayFields,
  };
}

const bannerLinkFields: Field[] = [
  {
    name: 'label',
    type: 'text',
    localized: true,
    required: true,
  },
  {
    name: 'href',
    type: 'text',
    required: true,
    admin: {
      description: 'Internal path (/solutions/...) or full URL (https://...).',
    },
  },
  {
    name: 'openInNewTab',
    type: 'checkbox',
    defaultValue: false,
  },
];

export function bannerLinksField(name: string, label: string): Field {
  return {
    name,
    label,
    type: 'array',
    admin: {
      description: 'Rotating announcement links shown above the header.',
    },
    fields: bannerLinkFields,
  };
}
