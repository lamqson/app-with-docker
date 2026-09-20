import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { CaseStudies } from './collections/CaseStudies';
import { databaseAdapter } from './database';
import { FAQs } from './collections/FAQs';
import { Media } from './collections/Media';
import { Pages } from './collections/Pages';
import { Posts } from './collections/Posts';
import { Users } from './collections/Users';
import { SiteSettings } from './globals/SiteSettings';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, '../app/(payload)'),
    },
  },
  collections: [Users, Media, Pages, Posts, CaseStudies, FAQs],
  db: databaseAdapter(),
  editor: lexicalEditor(),
  globals: [SiteSettings],
  localization: {
    locales: [
      'en',
      'es',
      'fr',
      'de',
      'zh-TW',
      'zh-CN',
      'ja',
      'ko',
      'it',
      'pt',
      'pt-BR',
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3200',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
