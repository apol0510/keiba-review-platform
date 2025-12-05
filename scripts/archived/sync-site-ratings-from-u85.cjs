const puppeteer = require('puppeteer');
const Airtable = require('airtable');
const fs = require('fs');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * u85.jpから悪質サイト一覧を取得
 */
async function fetchMaliciousSitesFromU85() {
  console.log('🔍 u85.jpから悪質サイト一覧を取得中...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // 悪質サイト一覧ページ
    const url = 'https://u85.jp/category/akutoku/';
    console.log(`📝 アクセス: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // サイト一覧を取得
    const sites = await page.evaluate(() => {
      const siteList = [];

      // 記事リンクを取得
      const articles = document.querySelectorAll('article');

      articles.forEach(article => {
        const titleElement = article.querySelector('h2.entry-title a');
        const linkElement = article.querySelector('a[href*="u85.jp"]');

        if (titleElement && linkElement) {
          const title = titleElement.textContent.trim();
          const url = linkElement.href;

          // URLからスラッグを抽出
          const match = url.match(/u85\.jp\/([^\/]+)/);
          const slug = match ? match[1] : '';

          if (slug && slug !== 'category' && slug !== 'akutoku') {
            siteList.push({
              title,
              url,
              slug,
              isMalicious: true
            });
          }
        }
      });

      return siteList;
    });

    console.log(`✅ ${sites.length}件の悪質サイトを取得しました\n`);

    return sites;

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * u85.jpから優良サイト一覧を取得
 */
async function fetchLegitSitesFromU85() {
  console.log('🔍 u85.jpから優良サイト一覧を取得中...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // 優良サイト一覧ページ
    const url = 'https://u85.jp/category/yuryo/';
    console.log(`📝 アクセス: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // サイト一覧を取得
    const sites = await page.evaluate(() => {
      const siteList = [];

      const articles = document.querySelectorAll('article');

      articles.forEach(article => {
        const titleElement = article.querySelector('h2.entry-title a');
        const linkElement = article.querySelector('a[href*="u85.jp"]');

        if (titleElement && linkElement) {
          const title = titleElement.textContent.trim();
          const url = linkElement.href;

          const match = url.match(/u85\.jp\/([^\/]+)/);
          const slug = match ? match[1] : '';

          if (slug && slug !== 'category' && slug !== 'yuryo') {
            siteList.push({
              title,
              url,
              slug,
              isMalicious: false
            });
          }
        }
      });

      return siteList;
    });

    console.log(`✅ ${sites.length}件の優良サイトを取得しました\n`);

    return sites;

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * u85.jpの個別ページから平均評価を取得
 */
async function fetchAverageRatingFromU85(siteUrl) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(siteUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 平均評価を取得
    const averageRating = await page.evaluate(() => {
      const ratingText = document.body.textContent.match(/平均([\d.]+)\/3/);
      if (ratingText) {
        const rating = parseFloat(ratingText[1]);
        // 3段階評価を5段階に変換
        return Math.round((rating / 3) * 5 * 10) / 10;
      }
      return null;
    });

    return averageRating;

  } catch (error) {
    console.error(`  ❌ 評価取得エラー: ${error.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Airtableの全サイトを取得
 */
async function getAllAirtableSites() {
  console.log('📊 Airtableから全サイトを取得中...\n');

  const records = await base('Sites').select({
    view: 'Grid view'
  }).all();

  const sites = records.map(record => ({
    id: record.id,
    name: record.fields.Name,
    slug: record.fields.Slug,
    url: record.fields.URL
  }));

  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  return sites;
}

/**
 * サイトの評価をマッチング
 */
function matchSiteRating(airtableSite, u85Sites) {
  // URLまたはサイト名で一致を探す
  const match = u85Sites.find(u85Site => {
    // サイト名で部分一致
    const nameMatch = airtableSite.name.includes(u85Site.title) ||
                      u85Site.title.includes(airtableSite.name);

    // URLで一致
    const urlMatch = airtableSite.url && u85Site.slug &&
                     airtableSite.url.includes(u85Site.slug);

    return nameMatch || urlMatch;
  });

  if (match) {
    return {
      matched: true,
      isMalicious: match.isMalicious,
      u85Url: match.url,
      u85Title: match.title
    };
  }

  return {
    matched: false,
    isMalicious: false
  };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 u85.jpとAirtableのサイト評価を同期開始\n');

  // u85.jpから悪質・優良サイトを取得
  const maliciousSites = await fetchMaliciousSitesFromU85();
  await new Promise(resolve => setTimeout(resolve, 2000)); // レート制限対策

  const legitSites = await fetchLegitSitesFromU85();

  const allU85Sites = [...maliciousSites, ...legitSites];

  console.log(`\n📊 u85.jp サイト統計:`);
  console.log(`  悪質サイト: ${maliciousSites.length}件`);
  console.log(`  優良サイト: ${legitSites.length}件`);
  console.log(`  合計: ${allU85Sites.length}件\n`);

  // Airtableのサイトを取得
  const airtableSites = await getAllAirtableSites();

  // マッチング処理
  const matchResults = [];

  console.log('🔄 サイト評価のマッチング中...\n');

  for (const airtableSite of airtableSites) {
    const result = matchSiteRating(airtableSite, allU85Sites);

    if (result.matched) {
      matchResults.push({
        ...airtableSite,
        ...result
      });

      const status = result.isMalicious ? '❌ 悪質' : '✅ 優良';
      console.log(`  ${status}: ${airtableSite.name}`);
    }
  }

  console.log(`\n✅ マッチング完了: ${matchResults.length}/${airtableSites.length}件\n`);

  // 結果を保存
  const outputPath = '/tmp/site-ratings-u85.json';
  const output = {
    maliciousSites: matchResults.filter(s => s.isMalicious),
    legitSites: matchResults.filter(s => !s.isMalicious),
    unmatchedSites: airtableSites.filter(as =>
      !matchResults.find(mr => mr.id === as.id)
    )
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('📁 結果を保存しました:');
  console.log(`  ${outputPath}\n`);

  console.log('📊 最終統計:');
  console.log(`  悪質サイト: ${output.maliciousSites.length}件`);
  console.log(`  優良サイト: ${output.legitSites.length}件`);
  console.log(`  未マッチ: ${output.unmatchedSites.length}件`);
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fetchMaliciousSitesFromU85,
  fetchLegitSitesFromU85,
  matchSiteRating
};
