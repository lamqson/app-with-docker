import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'sitemap.xml');

const { buildSitemapEntries } = await import('../src/lib/seo/sitemap-entries.ts');
const { getStaticSitemapSlugs } = await import('../src/lib/seo/sitemap-slugs.ts');
const { serializeSitemapXml } = await import('../src/lib/seo/sitemap-xml.ts');

const entries = buildSitemapEntries(getStaticSitemapSlugs());
const xml = serializeSitemapXml(entries);

fs.writeFileSync(outputPath, xml);
console.log(
  `[generate:sitemap] Wrote ${entries.length} URLs to ${path.relative(root, outputPath)}`,
);
