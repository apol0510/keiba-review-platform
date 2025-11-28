#!/usr/bin/env node

/**
 * 競馬予想サイト自動取得スクリプト (SerpAPI版)
 *
 * SerpAPI (Google検索) で競馬予想サイトを検索し、Airtableに自動登録します
 *
 * 使用方法:
 * SERPAPI_KEY=your-key AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/fetch-keiba-sites.js
 */

import { getJson } from 'serpapi';
import fetch from 'node-fetch';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!SERPAPI_KEY || !AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('必要な環境変数: SERPAPI_KEY, AIRTABLE_API_KEY, AIRTABLE_BASE_ID');
  process.exit(1);
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 検索キーワード
const SEARCH_QUERIES = [
  '南関競馬 予想サイト',
  '地方競馬 予想',
  '中央競馬 予想サイト',
  '競馬予想 的中',
];

// カテゴリ判定キーワード
const CATEGORY_KEYWORDS = {
  nankan: ['南関', '大井', '川崎', '船橋', '浦和'],
  chuo: ['中央競馬', 'JRA', '東京競馬', '阪神競馬', '中京競馬', '京都競馬'],
  chihou: ['地方競馬', 'NAR', '園田', '金沢', '名古屋', '高知'],
};

/**
 * SerpAPIでGoogle検索
 */
async function searchWithSerpAPI(query) {
  console.log(`🔍 検索中: "${query}"`);

  try {
    const response = await getJson({
      engine: 'google',
      api_key: SERPAPI_KEY,
      q: query,
      num: 10,
      hl: 'ja',
      gl: 'jp',
    });

    return response.organic_results || [];
  } catch (error) {
    console.error(`❌ 検索エラー (${query}):`, error.message);
    return [];
  }
}

/**
 * URLからサイト情報を抽出
 */
function extractSiteInfo(result) {
  try {
    const url = new URL(result.link);
    const domain = url.hostname.replace(/^www\./, '');
    const name = result.title;
    const description = result.snippet || '';

    // スラッグを生成（ドメイン名から）
    const slug = domain.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();

    // カテゴリ判定
    let category = 'other';
    const textToCheck = `${name} ${description} ${url}`.toLowerCase();

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => textToCheck.includes(keyword.toLowerCase()))) {
        category = cat;
        break;
      }
    }

    return {
      Name: name.substring(0, 100), // Airtableの制限に合わせる
      Slug: slug,
      URL: result.link,
      Category: category,
      Description: description.substring(0, 500),
      IsApproved: false, // デフォルトは未承認
    };
  } catch (error) {
    console.error(`❌ URL解析エラー:`, error.message);
    return null;
  }
}

/**
 * Airtableに既存サイトがあるかチェック
 */
async function checkExistingSite(url) {
  try {
    const encodedUrl = url.replace(/'/g, "\\'");
    const response = await fetch(
      `${AIRTABLE_API_URL}/Sites?filterByFormula={URL}='${encodedUrl}'`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.records.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Airtableにサイトを追加
 */
async function addSiteToAirtable(siteInfo) {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Sites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ fields: siteInfo }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Airtable登録エラー:`, error.message);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 競馬予想サイト自動取得を開始します (SerpAPI版)\n');
  console.log('📝 SerpAPI: Google検索結果を取得します');
  console.log('📝 無料枠: 月5,000クエリ\n');

  const allSites = [];
  const seenUrls = new Set();

  // 各検索クエリで検索
  for (const query of SEARCH_QUERIES) {
    const results = await searchWithSerpAPI(query);
    console.log(`  ✅ ${results.length}件の結果を取得\n`);

    for (const result of results) {
      // 重複チェック
      if (seenUrls.has(result.link)) continue;
      seenUrls.add(result.link);

      // サイト情報を抽出
      const siteInfo = extractSiteInfo(result);
      if (!siteInfo) continue;

      // Airtableに既に存在するかチェック
      const exists = await checkExistingSite(result.link);
      if (exists) {
        console.log(`  ⏭️  スキップ (既存): ${siteInfo.Name}`);
        continue;
      }

      allSites.push(siteInfo);
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 検索結果: ${allSites.length}件の新規サイトを発見\n`);

  if (allSites.length === 0) {
    console.log('✅ 新規サイトはありませんでした');
    return;
  }

  // Airtableに登録
  let added = 0;
  for (const site of allSites) {
    console.log(`📝 登録中: ${site.Name} (${site.Category})`);

    const result = await addSiteToAirtable(site);
    if (result) {
      added++;
      console.log(`  ✅ 登録完了: ${site.URL}`);
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n🎉 完了: ${added}件のサイトを登録しました`);
  console.log('\n次のステップ:');
  console.log('1. 管理画面で確認: https://frabjous-taiyaki-460401.netlify.app/admin/pending-sites');
  console.log('2. サイトを承認して公開');
  console.log('3. フロントエンドで確認: https://frabjous-taiyaki-460401.netlify.app/');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
