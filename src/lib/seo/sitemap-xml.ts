import type { MetadataRoute } from 'next';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastModified(value: MetadataRoute.Sitemap[number]['lastModified']): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function serializeSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lines = ['  <url>', `    <loc>${escapeXml(entry.url)}</loc>`];
      const lastModified = formatLastModified(entry.lastModified);

      if (lastModified) {
        lines.push(`    <lastmod>${lastModified}</lastmod>`);
      }

      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }

      if (entry.priority !== undefined) {
        lines.push(`    <priority>${entry.priority}</priority>`);
      }

      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}
