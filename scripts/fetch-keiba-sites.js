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

// 検索キーワード（大幅拡充）
const SEARCH_QUERIES = [
  // 南関競馬系
  '南関競馬 予想サイト',
  '南関競馬 予想',
  '大井競馬 予想',
  '川崎競馬 予想',
  '船橋競馬 予想',
  '浦和競馬 予想',
  '南関競馬 無料予想',
  '南関競馬 買い目',

  // 中央競馬系
  '中央競馬 予想サイト',
  'JRA 予想',
  '競馬予想 中央',
  '東京競馬 予想',
  '阪神競馬 予想',
  '中京競馬 予想',
  '京都競馬 予想',
  '新潟競馬 予想',

  // 地方競馬系
  '地方競馬 予想',
  '地方競馬 予想サイト',
  '地方競馬 無料予想',
  'NAR 競馬予想',
  '園田競馬 予想',
  '金沢競馬 予想',
  '名古屋競馬 予想',
  '高知競馬 予想',
  '佐賀競馬 予想',

  // 一般的な検索
  '競馬予想 的中',
  '競馬予想 無料',
  '競馬予想 AI',
  '競馬予想 ブログ',
  '競馬予想 サイト',
  '競馬 買い目',
  '競馬 予想家',
  '競馬 的中率',
  '競馬情報サイト',
  '競馬 データ予想',
  '競馬 指数予想',
  '競馬 コンピ予想',
];

// カテゴリ判定キーワード
const CATEGORY_KEYWORDS = {
  nankan: ['南関', '大井', '川崎', '船橋', '浦和'],
  chuo: ['中央競馬', 'JRA', '東京競馬', '阪神競馬', '中京競馬', '京都競馬'],
  chihou: ['地方競馬', 'NAR', '園田', '金沢', '名古屋', '高知'],
};

// 除外すべきドメイン・URLパターン
const EXCLUDED_PATTERNS = [
  // ECサイト・アプリストア
  'amazon.co.jp',
  'rakuten.co.jp',
  'apps.apple.com',
  'play.google.com',

  // SNS個別投稿
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',

  // ブログ個別記事（noteなど）
  'note.com',

  // 動画
  'youtube.com/watch',
  'youtube.com/playlist',
  'youtube.com/channel',  // YouTubeチャンネルも除外

  // Yahoo!系サービス
  'yahoo.co.jp/answer',
  'chiebukuro.yahoo.co.jp',
  'detail.chiebukuro.yahoo.co.jp',
  'sports.yahoo.co.jp', // Yahoo!スポーツの個別記事

  // 公式サイト（JRA、NAR、競馬場）
  'jra.go.jp',
  'keiba.go.jp',  // NAR
  'nankankeiba.com',
  'urawa-keiba.jp',
  'kawasaki-keiba.jp',
  'funabashi-keiba.jp',
  'f-keiba.com',  // 船橋競馬場
  'oi-keiba.jp',
  'tokyocitykeiba.com',  // 大井競馬場
  'sonoda-himeji.jp',
  'kanazawakeiba.com',
  'nagoyakeiba.com',
  'kochi-keiba.com',
  'sagakeiba.net',

  // 競馬場公式・レース情報ページ（予想サイトではない）
  'netkeiba.com/racecourse',
  'nar.netkeiba.com/racecourse',

  // データベース・レース情報
  'netkeiba.com',  // netkeiba（データベース・情報サイト）
  'uma-x.jp',      // uma-x（データベース）
  'regimag.jp',    // regimag（ランキング/レビューサイト）
  'jbis.or.jp',    // JBISサーチ
  'keibalab.jp',   // 競馬ラボ（レース一覧のみ）
  'keiba-gp.com',  // 競馬予想GP（メディア）

  // 投票サイト（馬券購入サービス）
  'oddspark.com',
  'spat4.jp',
  'spat4special.jp',  // SPAT4スペシャル
  'ipat.jra.go.jp',

  // 競馬新聞・メディア
  'nikkansports.com',   // 日刊スポーツ
  'sanspo.com',         // サンスポ
  'tospo-keiba.jp',     // 東スポ競馬
  'daily.co.jp',        // デイリースポーツ
  'keibabook.co.jp',    // 競馬ブック
  'sports.yahoo.co.jp', // スポーツナビ
  'hochi.co.jp',        // スポーツ報知
  'keiba-tokai.jp',     // 競馬東海スペシャル
  'fukuchan.net',       // 福ちゃん出版社
  'kanazawakeiba-yoso.com', // 金沢競馬専門紙協会
  'kichiuma.net',       // 吉馬（WEB競馬新聞）
  'kichiuma-chiho.net', // 吉馬 地方競馬版

  // ツール・ランキングサイト
  'uma36.com',             // 馬三郎タイムズ（ランキング）
  'keiba.pa.land.to',      // ツール（早見表）
  'tom.tokyokeibajo.com',  // ツール（買い目計算）

  // URLパスパターン（個別記事を示す）
  '/article/',
  '/archives/',
  '/entry/',
  '/posts/',
  '/column/',
  '/n/', // noteの個別記事
  '/qa/',
  '/question_detail/',
  '/race/predict/ai/', // 個別レースのAI予想ページ
];

/**
 * URLが除外対象かチェック
 */
function shouldExcludeUrl(url) {
  const urlLower = url.toLowerCase();

  // 除外パターンに一致するかチェック
  for (const pattern of EXCLUDED_PATTERNS) {
    if (urlLower.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  // パス部分が異常に長い場合（100文字以上 = 個別記事の可能性が高い）
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname.length > 100) {
      return true;
    }
  } catch (error) {
    return true; // URLパースエラーの場合も除外
  }

  return false;
}

/**
 * SerpAPIでGoogle検索（ページネーション対応）
 */
async function searchWithSerpAPI(query, page = 0) {
  const start = page * 100;
  console.log(`🔍 検索中: "${query}" (${page + 1}ページ目)`);

  try {
    const response = await getJson({
      engine: 'google',
      api_key: SERPAPI_KEY,
      q: query,
      num: 100,        // 10 → 100に増加（最大値）
      start: start,    // ページネーション
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
 * 複数ページを取得
 */
async function searchMultiplePages(query, maxPages = 3) {
  const allResults = [];

  for (let page = 0; page < maxPages; page++) {
    const results = await searchWithSerpAPI(query, page);

    if (results.length === 0) {
      break; // これ以上結果がない場合は終了
    }

    allResults.push(...results);
    console.log(`  ✅ ${results.length}件の結果を取得 (累計: ${allResults.length}件)`);

    // API制限を考慮して待機
    if (page < maxPages - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allResults;
}

/**
 * サイト名をクリーニング
 */
function cleanSiteName(title) {
  let name = title;

  // 不要な接尾辞を削除
  const suffixes = [
    / \| netkeiba.*/i,
    / - netkeiba.*/i,
    / \| 競馬.*/,
    / - 競馬.*/,
    / \| .*/,
    / - .*/,
    /【.*】/g,
    /「.*」/g,
    /\.{3,}$/,  // 末尾の...
    / -$/,
    / \|$/,
  ];

  for (const suffix of suffixes) {
    name = name.replace(suffix, '');
  }

  // トリム
  name = name.trim();

  // 空の場合はドメイン名を使う
  if (!name) {
    name = 'サイト名未取得';
  }

  return name;
}

/**
 * URLからサイト情報を抽出
 */
function extractSiteInfo(result) {
  try {
    const url = new URL(result.link);
    const domain = url.hostname.replace(/^www\./, '');

    // サイト名をクリーニング
    const name = cleanSiteName(result.title);
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
      URL: url.origin + url.pathname, // クエリパラメータを除去
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
 * Airtableに既存サイトがあるかチェック（Slugベース）
 */
async function checkExistingSite(slug) {
  try {
    const encodedSlug = slug.replace(/'/g, "\\'");
    const response = await fetch(
      `${AIRTABLE_API_URL}/Sites?filterByFormula={Slug}='${encodedSlug}'`,
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
  console.log('🚀 競馬予想サイト自動取得を開始します (SerpAPI版 - 強化版)\n');
  console.log('📝 SerpAPI: Google検索結果を取得します');
  console.log('📝 検索キーワード数: ' + SEARCH_QUERIES.length + '個');
  console.log('📝 1検索あたり: 最大100件 × 1ページ = 100件');
  console.log('📝 理論上の最大取得数: ' + (SEARCH_QUERIES.length * 100) + '件');
  console.log('📝 無料枠: 月5,000クエリ\n');

  const allSites = [];
  const seenUrls = new Set();
  const seenSlugs = new Set(); // Slugベースの重複チェック
  let totalSearched = 0;

  // 各検索クエリで検索
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    console.log(`\n[${i + 1}/${SEARCH_QUERIES.length}] 検索中: "${query}"`);

    // 複数ページ取得（1ページのみ = 100件）
    const results = await searchMultiplePages(query, 1);
    totalSearched += results.length;

    for (const result of results) {
      // URL重複チェック
      if (seenUrls.has(result.link)) continue;
      seenUrls.add(result.link);

      // 除外URLチェック
      if (shouldExcludeUrl(result.link)) {
        console.log(`  ⏭️  除外: ${result.link.substring(0, 80)}...`);
        continue;
      }

      // サイト情報を抽出
      const siteInfo = extractSiteInfo(result);
      if (!siteInfo) continue;

      // Slug重複チェック（同じドメインは1つだけ）
      if (seenSlugs.has(siteInfo.Slug)) continue;
      seenSlugs.add(siteInfo.Slug);

      // Airtableに既に存在するかチェック（Slugベース）
      const exists = await checkExistingSite(siteInfo.Slug);
      if (exists) {
        // 既存サイトは静かにスキップ（ログを減らす）
        continue;
      }

      allSites.push(siteInfo);
      console.log(`  🆕 新規発見: ${siteInfo.Name} (${siteInfo.Category})`);
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 検索完了`);
  console.log(`  - 検索キーワード数: ${SEARCH_QUERIES.length}個`);
  console.log(`  - 検索結果総数: ${totalSearched}件`);
  console.log(`  - ユニークURL数: ${seenUrls.size}件`);
  console.log(`  - 新規サイト数: ${allSites.length}件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
