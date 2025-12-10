import type { APIRoute } from 'astro';
import { getSitesWithStats } from '../lib/airtable';

const SITE_URL = import.meta.env.SITE || 'https://keiba-review.jp';

export const GET: APIRoute = async () => {
  // 承認済みサイトを取得
  const sites = await getSitesWithStats();

  // 静的ページ
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/keiba-yosou/', priority: '0.9', changefreq: 'daily' },
    { url: '/keiba-yosou/nankan/', priority: '0.8', changefreq: 'daily' },
    { url: '/keiba-yosou/chuo/', priority: '0.8', changefreq: 'daily' },
    { url: '/keiba-yosou/chihou/', priority: '0.8', changefreq: 'daily' },
    { url: '/ranking/', priority: '0.9', changefreq: 'daily' },
    { url: '/ranking/chuo/', priority: '0.8', changefreq: 'daily' },
    { url: '/ranking/nankan/', priority: '0.8', changefreq: 'daily' },
    { url: '/ranking/chihou/', priority: '0.8', changefreq: 'daily' },
    { url: '/faq/', priority: '0.7', changefreq: 'monthly' },
    { url: '/about/', priority: '0.5', changefreq: 'monthly' },
    { url: '/terms/', priority: '0.3', changefreq: 'yearly' },
    { url: '/privacy/', priority: '0.3', changefreq: 'yearly' },
    { url: '/contact/', priority: '0.5', changefreq: 'monthly' },
  ];

  // XMLを生成
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${sites
  .map(
    (site) => {
      // 日付のバリデーション
      let lastmod: string;
      try {
        if (site.createdAt) {
          const date = new Date(site.createdAt);
          if (!isNaN(date.getTime())) {
            lastmod = date.toISOString().split('T')[0];
          } else {
            lastmod = new Date().toISOString().split('T')[0];
          }
        } else {
          lastmod = new Date().toISOString().split('T')[0];
        }
      } catch {
        lastmod = new Date().toISOString().split('T')[0];
      }

      return `  <url>
    <loc>${SITE_URL}/keiba-yosou/${site.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    }
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
