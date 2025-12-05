#!/usr/bin/env node

/**
 * SerpAPIで競馬予想サイトを自動検索してAirtableに登録
 *
 * 使用方法:
 * SERPAPI_KEY=your-key AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/fetch-keiba-sites-serpapi.js
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!SERPAPI_KEY || !AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('必要な環境変数: SERPAPI_KEY, AIRTABLE_API_KEY, AIRTABLE_BASE_ID');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 検索クエリ（カテゴリ別）
const searchQueries = [
  { query: '南関競馬 予想サイト', category: 'nankan' },
  { query: '地方競馬 予想サイト', category: 'chihou' },
  { query: '中央競馬 予想サイト JRA', category: 'chuo' },
  { query: '競馬予想 的中', category: 'other' },
];

/**
 * SerpAPIで検索
 */
async function searchWithSerpAPI(query) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&gl=jp&hl=ja&num=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();

    const results = data.organic_results?.map(r => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || '',
    })) || [];

    return results;
  } catch (error) {
    console.error(`❌ 検索エラー (${query}):`, error.message);
    return [];
  }
}

/**
 * URLからドメイン名を抽出してSlugを生成
 */
function generateSlug(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    return null;
  }
}

/**
 * Airtableで既存サイトをチェック
 */
async function checkExistingSite(url, slug) {
  try {
    const response = await fetch(
      `${API_URL}/Sites?filterByFormula=OR({URL}='${url}',{Slug}='${slug}')`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    return data.records && data.records.length > 0;
  } catch (error) {
    console.error('  ❌ 重複チェックエラー:', error.message);
    return true; // エラー時は登録しない
  }
}

/**
 * Airtableに新規サイトを登録
 */
async function registerSite(site, category) {
  try {
    const response = await fetch(`${API_URL}/Sites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: site.title,
              Slug: site.slug,
              URL: site.url,
              Category: category,
              Description: site.snippet,
              IsApproved: false, // 未承認で登録
              SubmitterName: 'SerpAPI自動検知',
              SubmitterEmail: 'system@auto-detect',
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    console.log(`  ✅ 登録完了: ${site.title}`);
    return true;
  } catch (error) {
    console.error(`  ❌ 登録エラー:`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 SerpAPIで競馬予想サイトを検索します\n');

  let totalFound = 0;
  let totalRegistered = 0;
  let totalSkipped = 0;

  for (const { query, category } of searchQueries) {
    console.log(`\n🔍 検索中: "${query}" (カテゴリ: ${category})`);

    const results = await searchWithSerpAPI(query);
    console.log(`  📊 検索結果: ${results.length}件`);

    totalFound += results.length;

    for (const result of results) {
      const slug = generateSlug(result.url);

      if (!slug) {
        console.log(`  ⏭️  スキップ (無効なURL): ${result.url}`);
        totalSkipped++;
        continue;
      }

      // 重複チェック
      const exists = await checkExistingSite(result.url, slug);

      if (exists) {
        console.log(`  ⏭️  スキップ (既存): ${result.title}`);
        totalSkipped++;
        continue;
      }

      // 新規登録
      const success = await registerSite(
        { ...result, slug },
        category
      );

      if (success) {
        totalRegistered++;
      }

      // API制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('\n\n🎉 処理完了');
  console.log(`📊 検索結果総数: ${totalFound}件`);
  console.log(`✅ 新規登録: ${totalRegistered}件`);
  console.log(`⏭️  スキップ: ${totalSkipped}件`);
  console.log('\n次のステップ:');
  console.log('1. /admin/pending-sites で未承認サイトを確認');
  console.log('2. 承認すると自動でスクリーンショット取得');
  console.log('3. サイトに掲載されます');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
