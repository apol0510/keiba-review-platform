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

// 検索キーワード（無料プラン最適化: 8個に拡大）
// 無料枠: 5,000クエリ/月（SerpAPI）
// 週1回実行 × 8キーワード = 32クエリ/月 → 長期間使用可能
const SEARCH_QUERIES = [
  // 最も包括的なキーワード（必須）
  '競馬予想サイト',           // 中央・南関・地方すべてカバー

  // 南関競馬（強化）
  '南関競馬 予想サイト',      // 南関競馬特化
  '大井競馬 予想',            // 大井競馬場
  'ナイター競馬 予想',        // ナイター競馬

  // 地方競馬（強化）
  '地方競馬 予想サイト',      // 地方競馬特化
  '地方競馬 無料予想',        // 無料予想提供サイト

  // 検索意図別
  '競馬予想サイト ランキング',  // ランキング記事からサイト収集
  '競馬情報会社',              // 有料予想会社を発見
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

  // 無料ブログプラットフォーム（独自ドメイン+WordPressは許可）
  'note.com',
  'ameblo.jp',        // アメブロ
  'livedoor.blog',    // ライブドアブログ
  'hatenablog.com',   // はてなブログ
  'hatena.ne.jp',     // はてなブログ（旧ドメイン）
  'fc2.com',          // FC2ブログ
  'seesaa.net',       // Seesaaブログ
  'blogspot.com',     // Blogger
  'wordpress.com',    // WordPress.com（無料版のみ）
  'jugem.jp',         // JUGEMブログ
  'exblog.jp',        // エキサイトブログ
  'cocolog-nifty.com', // ココログ
  'goo.ne.jp',        // gooブログ
  'blog.jp',          // 忍者ブログ
  'muragon.com',      // ムラゴンブログ
  'yaplog.jp',        // yaplog
  // 注: 独自ドメイン+WordPressは除外しない（ビジネスサイトの可能性が高い）

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
  '/race/',            // 個別レースページ
  '/special/',         // 特別レース特集ページ
  '/ranking/',         // ランキングページ
  '/yosoka_prof',      // 予想家プロフィール
  '/predictor/detail', // 予想家詳細
  '/tipster/',         // 予想家ページ
  'question_detail',   // 知恵袋の質問
  '/db/race/',         // レース一覧
  '/odds_uma/',        // オッズページ
  '/news_kiji/',       // ニュース記事
];

// NGワード（含まれているとブロック）
const NG_WORDS = [
  // 詐欺・悪質
  '詐欺', '騙された', '詐欺サイト', 'サギ',
  // 金銭トラブル
  '返金', '金返せ', '払い戻し',
  // 過度な批判
  '最悪', 'ひどい', 'クソ', '糞',
  // 誹謗中傷
  'バカ', '馬鹿', 'アホ',
  // 問い合わせ先
  '@', 'メール', '電話番号',
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
 * Phase 1: 品質チェック（自動化）
 */
async function checkSiteQuality(url, title, description) {
  const checks = {
    hasSSL: false,
    hasTitle: false,
    hasDescription: false,
    hasKeibaKeyword: false,
    noNGWords: false,
    notBlog: false,  // 追加: ブログでないことを確認
  };

  const reasons = [];

  // 1. SSL/HTTPS チェック
  checks.hasSSL = url.startsWith('https://');
  if (!checks.hasSSL) {
    reasons.push('HTTPSなし（セキュリティリスク）');
  }

  // 2. タイトルチェック（最低限の長さ）
  checks.hasTitle = title && title.length >= 3;
  if (!checks.hasTitle) {
    reasons.push('タイトルが短すぎる（3文字未満）');
  }

  // 3. 説明文チェック（最低限の長さ）
  checks.hasDescription = description && description.length >= 20;
  if (!checks.hasDescription) {
    reasons.push('説明文が短すぎる（20文字未満）');
  }

  // 4. 競馬関連キーワードチェック
  const combinedText = `${title} ${description}`.toLowerCase();
  const keibaKeywords = ['競馬', '予想', 'keiba', 'yosou', '馬券', 'jra', 'nar', '南関', '大井', '川崎', '船橋', '浦和', '地方競馬'];
  checks.hasKeibaKeyword = keibaKeywords.some(keyword => combinedText.includes(keyword));
  if (!checks.hasKeibaKeyword) {
    reasons.push('競馬関連キーワードが見つからない');
  }

  // 5. NGワードチェック
  checks.noNGWords = !NG_WORDS.some(ngWord => combinedText.includes(ngWord));
  if (!checks.noNGWords) {
    reasons.push('NGワードを含む（詐欺、悪質表現など）');
  }

  // 6. ブログ vs 予想サイトの判定（より賢く）
  const blogKeywords = ['ブログ', 'blog', 'Blog', 'BLOG'];
  const hasBlogKeyword = blogKeywords.some(keyword => title.includes(keyword) || url.includes(keyword));

  // 有料予想サイトの特徴キーワード
  const paidSiteKeywords = [
    '会員', '有料', '情報会社', '予想会社', 'メルマガ', '登録',
    '無料予想', 'プラン', '料金', '情報料', '的中情報', 'コンサル',
    '買い目', '公式サイト', '申し込み', '入会',
    '特定商取引', '特商法', '特定商取引法', '運営会社', '会社概要'  // 追加: 有料サイトの必須表示
  ];
  const hasPaidFeature = paidSiteKeywords.some(keyword => combinedText.includes(keyword));

  // 判定: ブログキーワードがあっても、有料サイトの特徴があればOK
  const isBlog = hasBlogKeyword && !hasPaidFeature;
  checks.notBlog = !isBlog;

  if (isBlog) {
    reasons.push('個人ブログ（無料予想記事）のため対象外');
  }

  // スコア計算（6項目）
  const score = Object.values(checks).filter(v => v).length;

  // 判定
  let status = 'pending';  // Airtableのデフォルト（IsApproved: false）
  let quality = 'low';

  if (score >= 5) {
    // 6項目中5項目以上クリア → 承認
    status = 'approved';
    quality = 'high';
  } else if (score >= 4) {
    // 6項目中4項目クリア → 保留（手動確認が必要）
    status = 'pending';
    quality = 'medium';
  } else {
    // 6項目中3項目以下 → 却下
    status = 'rejected';
    quality = 'low';
  }

  return {
    status,    // approved / pending / rejected
    quality,   // high / medium / low
    score,     // 0-6
    checks,    // 各チェック項目の結果
    reasons,   // 却下理由
  };
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

    if (response.error) {
      console.error(`❌ SerpAPIエラー (${query}):`, response.error);
      return [];
    }

    return response.organic_results || [];
  } catch (error) {
    console.error(`❌ 検索エラー (${query}):`, error);
    if (error.json) {
      console.error(`   詳細:`, error.json);
    }
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
      // IsApprovedを省略してAirtableのデフォルト値（Unchecked）を使用
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
 * 重複URLチェック（完全一致）
 */
async function checkDuplicateUrl(url) {
  try {
    // URLを正規化（クエリパラメータを除去）
    const urlObj = new URL(url);
    const normalizedUrl = urlObj.origin + urlObj.pathname;

    const encodedUrl = encodeURIComponent(normalizedUrl);
    const response = await fetch(
      `${AIRTABLE_API_URL}/Sites?filterByFormula=URL='${encodedUrl}'`,
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
  // デモモード（環境変数で制限可能）
  const maxQueries = process.env.MAX_QUERIES ? parseInt(process.env.MAX_QUERIES) : SEARCH_QUERIES.length;
  const searchQueries = SEARCH_QUERIES.slice(0, maxQueries);

  console.log('🚀 競馬予想サイト自動取得を開始します (SerpAPI版 - 強化版)\n');
  console.log('📝 SerpAPI: Google検索結果を取得します');
  console.log('📝 検索キーワード数: ' + searchQueries.length + '個' + (maxQueries < SEARCH_QUERIES.length ? ' (デモモード)' : ''));
  console.log('📝 1検索あたり: 最大100件 × 1ページ = 100件');
  console.log('📝 理論上の最大取得数: ' + (searchQueries.length * 100) + '件');
  console.log('📝 無料枠: 月5,000クエリ\n');

  const allSites = [];
  const seenUrls = new Set();
  const seenSlugs = new Set(); // Slugベースの重複チェック
  let totalSearched = 0;

  // 各検索クエリで検索
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`\n[${i + 1}/${searchQueries.length}] 検索中: "${query}"`);

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

      // 重複URLチェック（完全一致）
      const duplicateUrl = await checkDuplicateUrl(siteInfo.URL);
      if (duplicateUrl) {
        console.log(`  ⚠️  重複URL: ${siteInfo.Name} - ${siteInfo.URL}`);
        continue;
      }

      // Phase 1: 品質チェック
      const qualityCheck = await checkSiteQuality(siteInfo.URL, siteInfo.Name, siteInfo.Description);

      // 却下されたサイトはスキップ
      if (qualityCheck.status === 'rejected') {
        console.log(`  ❌ 却下: ${siteInfo.Name}`);
        console.log(`     理由: ${qualityCheck.reasons.join(', ')}`);
        console.log(`     スコア: ${qualityCheck.score}/5`);
        continue;
      }

      // 保留または承認されたサイトは登録
      allSites.push({
        ...siteInfo,
        qualityCheck,  // 品質チェック結果を追加（ログ用）
      });

      const emoji = qualityCheck.status === 'approved' ? '✅' : '⚠️';
      console.log(`  ${emoji} 新規発見: ${siteInfo.Name} (${siteInfo.Category}) - スコア: ${qualityCheck.score}/5`);
      if (qualityCheck.reasons.length > 0) {
        console.log(`     注意: ${qualityCheck.reasons.join(', ')}`);
      }
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 検索完了`);
  console.log(`  - 検索キーワード数: ${searchQueries.length}個`);
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
  let approvedCount = 0;
  let pendingCount = 0;

  for (const site of allSites) {
    const quality = site.qualityCheck;

    // qualityCheckプロパティを除去してAirtableに送信
    const { qualityCheck, ...siteData } = site;

    console.log(`📝 登録中: ${siteData.Name} (${siteData.Category})`);
    console.log(`   品質: ${quality.quality} (${quality.score}/5) - ${quality.status === 'approved' ? '自動承認' : '手動確認必要'}`);

    const result = await addSiteToAirtable(siteData);
    if (result) {
      added++;
      if (quality.status === 'approved') {
        approvedCount++;
      } else {
        pendingCount++;
      }
      console.log(`  ✅ 登録完了: ${siteData.URL}`);
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 完了: ${added}件のサイトを登録しました`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 品質チェック結果:`);
  console.log(`  ✅ 自動承認: ${approvedCount}件（高品質サイト）`);
  console.log(`  ⚠️  手動確認: ${pendingCount}件（中品質サイト）`);
  console.log(`\n💡 Phase 1 品質フィルター:`);
  console.log(`  1. SSL/HTTPS チェック`);
  console.log(`  2. タイトル長さチェック（3文字以上）`);
  console.log(`  3. 説明文長さチェック（20文字以上）`);
  console.log(`  4. 競馬関連キーワードチェック`);
  console.log(`  5. NGワード検出（詐欺、悪質表現など）`);
  console.log(`\n  スコア4-5/5: 自動承認`);
  console.log(`  スコア3/5: 手動確認が必要`);
  console.log(`  スコア0-2/5: 自動却下`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log('次のステップ:');
  console.log('1. 管理画面で確認: https://frabjous-taiyaki-460401.netlify.app/admin/pending-sites');
  console.log('2. 手動確認が必要なサイトを承認または却下');
  console.log('3. フロントエンドで確認: https://frabjous-taiyaki-460401.netlify.app/');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
