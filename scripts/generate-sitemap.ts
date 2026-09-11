import { sql, closeDatabase } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://ontario-economic-intelligence.ca';

async function generateSitemap() {
  console.log('[Sitemap] Fetching all municipalities from geographies table...');
  const geos = await sql<{ id: string; name: string }[]>`
    SELECT id, name
    FROM geographies
    WHERE geo_type = 'CSD' OR population_2021 > 0
    ORDER BY population_2021 DESC NULLS LAST, name ASC;
  `;

  console.log(`[Sitemap] Found ${geos.length} municipalities.`);

  const coreRoutes = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/overview`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_ORIGIN}/rankings`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/opportunity`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/listings`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/venture-capital`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/sources`, changefreq: 'monthly', priority: '0.6' },
  ];

  const cityRoutes = geos.flatMap(geo => {
    const citySlug = encodeURIComponent(geo.name.replace(/\s+/g, '-'));
    return [
      { loc: `${SITE_ORIGIN}/city/${citySlug}/overview`, changefreq: 'weekly', priority: '0.7' },
      { loc: `${SITE_ORIGIN}/city/${citySlug}/opportunity`, changefreq: 'weekly', priority: '0.7' },
      { loc: `${SITE_ORIGIN}/city/${citySlug}/business`, changefreq: 'weekly', priority: '0.6' },
    ];
  });

  const allUrls = [...coreRoutes, ...cityRoutes];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemapXml, 'utf-8');

  console.log(`[Sitemap] Successfully wrote ${allUrls.length} URLs to ${outputPath}`);
  await closeDatabase();
}

generateSitemap().catch(err => {
  console.error('[Sitemap Error]', err);
  process.exit(1);
});
