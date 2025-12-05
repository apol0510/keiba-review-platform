#!/usr/bin/env node

/**
 * u85.jp 口コミスクレイピング & 感情変換スクリプト
 *
 * 機能:
 * 1. u85.jpから実際の口コミを取得
 * 2. Airtableのサイト品質（悪質/通常/優良）に基づいて口コミのニュアンスを変換
 * 3. 変換した口コミをAirtableに投稿
 *
 * 使用方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/scrape-and-convert-reviews.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('使用方法:');
  console.error('AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/scrape-and-convert-reviews.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリスト
const maliciousSitesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'site-ratings.json'), 'utf-8')
);
const maliciousSites = maliciousSitesConfig.malicious;

// === 感情変換ルール ===

/**
 * ポジティブ表現をネガティブに変換
 */
const sentimentConversionRules = {
  // 的中に関する表現
  '的中': '外れ',
  '当たった': '外れた',
  '当たりました': '外れました',
  '当たる': '外れる',
  '的中した': '外れた',
  '的中しました': '外れました',
  '勝てた': '負けた',
  '勝った': '負けた',
  '利益': '損失',
  'プラス': 'マイナス',
  '回収': '損失',
  '儲かった': '損した',
  '儲けた': '損した',

  // 評価に関する表現
  '良い': '悪い',
  '良かった': '悪かった',
  'いい': '悪い',
  '素晴らしい': 'ひどい',
  '優れている': '劣っている',
  '優秀': '最悪',
  '信頼できる': '信頼できない',
  '満足': '不満',
  'おすすめ': 'おすすめしない',
  '推奨': '非推奨',

  // 感謝・ポジティブな感情
  'ありがと': '残念',
  '感謝': '後悔',
  '嬉しい': '悔しい',
  '期待': '失望',
  '安心': '不安',

  // サービス品質
  '丁寧': '雑',
  '親切': '不親切',
  '迅速': '遅い',
  '早い': '遅い',
  '高精度': '低精度',
  '正確': '不正確',
};

/**
 * 口コミのニュアンスを変換
 */
function convertSentiment(review, siteQuality) {
  // 優良サイト: そのまま使用
  if (siteQuality === 'excellent') {
    return review;
  }

  // 通常サイト: 軽くネガティブに
  if (siteQuality === 'normal') {
    let converted = review;

    // 一部の表現のみ変換（50%の確率）
    for (const [positive, negative] of Object.entries(sentimentConversionRules)) {
      if (Math.random() < 0.5) {
        converted = converted.replace(new RegExp(positive, 'g'), negative);
      }
    }

    return converted;
  }

  // 悪質サイト: 完全にネガティブに変換
  if (siteQuality === 'malicious') {
    let converted = review;

    // すべての表現を変換
    for (const [positive, negative] of Object.entries(sentimentConversionRules)) {
      converted = converted.replace(new RegExp(positive, 'g'), negative);
    }

    // さらにネガティブな接頭辞・接尾辞を追加
    const negativePrefix = [
      '残念ながら、',
      '正直、',
      'ハッキリ言って、',
      '率直に言うと、',
    ];

    const negativeSuffix = [
      '。二度と使いません。',
      '。おすすめできません。',
      '。期待外れでした。',
      '。お金の無駄でした。',
    ];

    // ランダムに接頭辞を追加（30%の確率）
    if (Math.random() < 0.3) {
      converted = randomChoice(negativePrefix) + converted;
    }

    // ランダムに接尾辞を追加（30%の確率）
    if (Math.random() < 0.3 && !converted.endsWith('。')) {
      converted = converted + randomChoice(negativeSuffix);
    }

    return converted;
  }

  return review;
}

/**
 * 評価スコアを変換
 */
function convertRating(originalRating, siteQuality) {
  if (siteQuality === 'excellent') {
    // 優良: 4-5星
    return Math.random() < 0.5 ? 4 : 5;
  } else if (siteQuality === 'normal') {
    // 通常: 3星
    return 3;
  } else {
    // 悪質: 1-2星
    return Math.random() < 0.6 ? 1 : 2;
  }
}

// === Puppeteerスクレイピング ===

/**
 * u85.jpから口コミを取得
 */
async function scrapeReviewsFromU85(siteName) {
  console.log(`🔍 u85.jpから「${siteName}」の口コミを検索中...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // User-Agentを設定
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // u85.jpのカテゴリページにアクセス
    await page.goto('https://u85.jp/category/yuryo/', { waitUntil: 'networkidle2', timeout: 30000 });

    // サイト名で検索（部分一致）
    const siteLinks = await page.evaluate((name) => {
      const links = Array.from(document.querySelectorAll('a'));
      const matching = links.filter(link => link.textContent.includes(name));
      return matching.map(link => link.href);
    }, siteName);

    if (siteLinks.length === 0) {
      console.log(`⚠️  u85.jpに「${siteName}」が見つかりませんでした`);
      return [];
    }

    const siteUrl = siteLinks[0];
    console.log(`✅ サイトURL発見: ${siteUrl}`);

    // サイト詳細ページにアクセス
    await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // 口コミを抽出
    const reviews = await page.evaluate(() => {
      const reviewElements = document.querySelectorAll('.comment-content, .review-text, p');
      const texts = Array.from(reviewElements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 20 && text.length < 500); // 20-500文字の口コミのみ

      // 重複を除去
      return [...new Set(texts)];
    });

    console.log(`📝 ${reviews.length}件の口コミを取得しました`);
    return reviews.slice(0, 10); // 最大10件まで

  } catch (error) {
    console.error(`❌ スクレイピングエラー:`, error.message);
    return [];
  } finally {
    await browser.close();
  }
}

// === ヘルパー関数 ===

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isMaliciousSite(siteName) {
  return maliciousSites.some(malicious => siteName.includes(malicious));
}

function determineSiteQuality(siteName, airtableSiteQuality) {
  // Airtableに品質データがあればそれを優先
  if (airtableSiteQuality) {
    return airtableSiteQuality;
  }

  // なければmaliciousリストから判定
  if (isMaliciousSite(siteName)) {
    return 'malicious';
  }

  return 'normal';
}

function generateUserName() {
  const firstNames = ['太郎', '次郎', '花子', '美咲', '誠', '健二'];
  const prefixes = ['競馬', '南関', '地方', 'JRA', '馬券'];
  const suffixes = ['ファン', '好き', 'マニア', 'ラバー'];
  const numbers = ['1', '2', '7', '77', '123', '999'];

  const style = Math.random();
  if (style < 0.3) return randomChoice(firstNames);
  else if (style < 0.6) return randomChoice(prefixes) + randomChoice(firstNames);
  else return randomChoice(prefixes) + randomChoice(suffixes) + randomChoice(numbers);
}

function generateEmail(userName) {
  const domains = ['gmail.com', 'yahoo.co.jp', 'outlook.jp'];
  const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomNum = Math.floor(Math.random() * 9999);
  return `${cleanName}${randomNum}@${randomChoice(domains)}`;
}

function generateRandomPastDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 180) + 1;
  const randomDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const hour = Math.floor(Math.random() * 14) + 9;
  const minute = Math.floor(Math.random() * 60);
  randomDate.setHours(hour, minute, 0, 0);
  return randomDate.toISOString();
}

// === Airtable API ===

async function getAllSites() {
  try {
    let allRecords = [];
    let offset = null;

    do {
      const url = offset
        ? `${API_URL}/Sites?filterByFormula={IsApproved}=TRUE()&offset=${offset}`
        : `${API_URL}/Sites?filterByFormula={IsApproved}=TRUE()`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    return allRecords;
  } catch (error) {
    console.error('❌ サイト取得エラー:', error.message);
    return [];
  }
}

async function createReviews(reviews) {
  try {
    const batchSize = 10;
    let createdCount = 0;

    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);

      const response = await fetch(`${API_URL}/Reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: batch.map(review => ({ fields: review })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status}\n${errorText}`);
      }

      createdCount += batch.length;
      console.log(`✅ ${createdCount}/${reviews.length}件の口コミを作成しました`);

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return createdCount;
  } catch (error) {
    console.error('❌ 口コミ作成エラー:', error.message);
    return 0;
  }
}

// === メイン処理 ===

async function main() {
  console.log('🚀 u85.jp 口コミスクレイピング & 感情変換スクリプト 開始\n');

  console.log('📊 Airtableから承認済みサイトを取得中...');
  const sites = await getAllSites();

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  const allReviews = [];

  // 通常サイトのみをフィルタリング
  const normalSiteRecords = sites.filter(site => {
    const siteName = site.fields.Name;
    const airtableSiteQuality = site.fields.SiteQuality;
    const isMalicious = airtableSiteQuality === 'malicious' || isMaliciousSite(siteName);
    return !isMalicious && (airtableSiteQuality === 'normal' || !airtableSiteQuality);
  });

  console.log(`🎯 通常サイト ${normalSiteRecords.length}件を処理対象にします\n`);

  for (const site of normalSiteRecords) {
    const siteName = site.fields.Name;
    const siteId = [site.id];
    const airtableSiteQuality = site.fields.SiteQuality;

    console.log(`\n📝 "${siteName}" の口コミを処理中...`);

    // u85.jpから口コミを取得
    const scrapedReviews = await scrapeReviewsFromU85(siteName);

    if (scrapedReviews.length === 0) {
      console.log(`⚠️  口コミが見つからなかったため、スキップします`);
      continue;
    }

    // サイト品質を判定
    const siteQuality = determineSiteQuality(siteName, airtableSiteQuality);
    console.log(`🏷️  サイト品質: ${siteQuality}`);

    // 各口コミを変換
    for (const originalReview of scrapedReviews) {
      const convertedContent = convertSentiment(originalReview, siteQuality);
      const rating = convertRating(3, siteQuality);
      const userName = generateUserName();
      const userEmail = generateEmail(userName);
      const createdAt = generateRandomPastDate();

      // タイトルを生成（本文の最初の20文字）
      const title = convertedContent.substring(0, 20) + (convertedContent.length > 20 ? '...' : '');

      allReviews.push({
        Site: siteId,
        UserName: userName,
        UserEmail: userEmail,
        Rating: rating,
        Title: title,
        Content: convertedContent,
        IsApproved: true,
        // CreatedAtは自動生成されるためコメントアウト
      });
    }

    console.log(`✅ ${scrapedReviews.length}件の口コミを変換しました`);

    // 連続リクエスト対策：少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (allReviews.length === 0) {
    console.log('\n⚠️  変換できる口コミがありませんでした');
    return;
  }

  console.log(`\n📤 合計${allReviews.length}件の口コミをAirtableに投稿中...\n`);

  const created = await createReviews(allReviews);

  console.log(`\n✨ 完了！${created}件の口コミを作成しました`);
  console.log('\n💡 特徴:');
  console.log('   ✅ u85.jpから実際の口コミを取得');
  console.log('   ✅ サイト品質に応じて感情を自動変換');
  console.log('   ✅ 金額・詳細情報はリアルなまま維持');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
