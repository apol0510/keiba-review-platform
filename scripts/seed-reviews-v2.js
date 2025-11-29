#!/usr/bin/env node

/**
 * 口コミ自動投稿スクリプト v2 (品質ベース評価システム)
 *
 * サイトの種類に応じて適切な評価とリアルな口コミを生成
 * - 悪質サイト: 0.5-2.0星 (低評価・ネガティブな口コミ)
 * - 通常サイト: 2.5-3.5星 (中立的・現実的な口コミ)
 * - 優良サイト: 4.0-5.0星 (ユーザーが手動設定)
 *
 * 使用方法:
 * AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-reviews-v2.js
 */

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
  console.error('AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-reviews-v2.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリストを読み込み
const maliciousSitesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'site-ratings.json'), 'utf-8')
);
const maliciousSites = maliciousSitesConfig.malicious;

// 悪質サイト用の口コミテンプレート（1-2星）
const maliciousReviewTemplates = {
  1: [
    {
      titles: ['全く当たらない', '詐欺まがいのサイト', '時間とお金の無駄', 'おすすめできません'],
      templates: [
        '{period}利用しましたが、的中率が極めて低く失望しました。情報料も高額で、{issue}。完全にお金の無駄でした。',
        '予想がほとんど外れます。{issue}で、信頼性に大きな疑問を感じます。二度と利用しません。',
        '{period}試しましたが、{issue}。的中率も低く、まともな予想が提供されていない印象です。',
        '情報料が非常に高いのに、予想の質が最低です。{issue}で、詐欺まがいだと感じました。',
      ],
    },
  ],
  2: [
    {
      titles: ['期待外れでした', '的中率が低すぎる', 'コスパが悪い', '改善が必要'],
      templates: [
        '{period}使ってみましたが、的中率が{low_rate}程度で期待外れでした。{issue}も気になります。',
        '予想の根拠が不明確で、{issue}。料金に見合った価値を感じられませんでした。',
        '{race}の予想を参考にしていましたが、外れることが多く、{issue}。リピートは考えていません。',
        '的中精度が低く、情報料が割高に感じます。{issue}で、総合的に満足度は低いです。',
      ],
    },
  ],
};

// 通常サイト用の口コミテンプレート（3星）
const normalReviewTemplates = {
  3: [
    {
      titles: ['可もなく不可もなく', '普通のサイトです', 'まあまあかな', '平均的な印象'],
      templates: [
        '{period}利用していますが、的中精度はそこそこといった感じです。{race}の予想を参考にしていますが、特別優れているわけではありません。',
        '予想の質は平均的だと思います。{issue}が改善されれば、もう少し評価が上がるかもしれません。',
        '的中率は{normal_rate}くらいで、可もなく不可もなくといった印象です。料金も標準的な範囲内です。',
        '{period}使ってみましたが、特筆すべき点はありません。{race}はそこそこ参考になりますが、過度な期待は禁物です。',
        '悪くはないですが、飛び抜けて良いとも言えません。的中精度が普通で、{issue}が少し気になります。',
      ],
    },
  ],
};

// 置換用変数
const periods = ['1ヶ月', '2ヶ月', '3ヶ月', '半年'];
const races = ['南関競馬', '中央競馬', '地方競馬', '重賞レース', 'ナイター競馬'];

// 悪質サイト用のネガティブな問題点
const maliciousIssues = [
  '情報料が高すぎる',
  'サポート対応が全く機能していない',
  '的中率の表記が誇大広告',
  '解約手続きが分かりにくい',
  '予想の根拠が一切示されない',
  '高額プランを強引に勧められる',
  '実績データが信用できない',
  '問い合わせに返信がない',
];

// 通常サイト用の改善点
const normalIssues = [
  '情報の更新が遅いことがある',
  'サポートの対応が遅い',
  '無料予想の精度がイマイチ',
  '買い目の点数が多すぎることがある',
  '予想の根拠が不明確なことがある',
  '人気馬に偏りがち',
];

const lowRates = ['2〜3割', '3割前後', '3〜4割'];
const normalRates = ['5割前後', '5〜6割', '6割程度'];

// ユーザー名生成
const userNames = [
  '競馬太郎', '馬券師', '競馬ファン', 'うまうま', 'けいばマニア',
  '南関応援団', '地方競馬ラバー', 'JRA信者', '予想屋', '的中王',
  '競馬初心者', 'ベテラン馬券師', 'サラリーマン馬券', '主婦の競馬',
  '学生馬券', '競馬歴10年', '週末競馬', 'ナイター専門',
];

/**
 * ランダムな要素を選択
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * サイトが悪質サイトかどうかを判定
 */
function isMaliciousSite(siteName) {
  return maliciousSites.some(malicious => siteName.includes(malicious));
}

/**
 * サイトの種類に応じた評価を決定
 *
 * Airtableは整数評価のみ対応のため、3星で統一し、
 * 口コミ文面で「3.0〜3.4」相当の表現を使用
 */
function determineRating(siteName) {
  if (isMaliciousSite(siteName)) {
    // 悪質サイト: 1-2星（1星=60%, 2星=40%）
    return Math.random() < 0.6 ? 1 : 2;
  } else {
    // 通常サイト: 3星 (3.0~3.4相当を口コミ文面で表現)
    return 3;
  }
}

/**
 * 口コミテキストを生成
 */
function generateReview(rating, siteName) {
  const isMalicious = isMaliciousSite(siteName);

  let template, title, contentTemplate;

  if (isMalicious && (rating === 1 || rating === 2)) {
    // 悪質サイト用のネガティブな口コミ
    template = randomChoice(maliciousReviewTemplates[rating]);
    title = randomChoice(template.titles);
    contentTemplate = randomChoice(template.templates);

    const content = contentTemplate
      .replace('{period}', randomChoice(periods))
      .replace('{race}', randomChoice(races))
      .replace('{issue}', randomChoice(maliciousIssues))
      .replace('{low_rate}', randomChoice(lowRates));

    return { title, content };
  } else {
    // 通常サイト用の中立的な口コミ
    template = randomChoice(normalReviewTemplates[3]);
    title = randomChoice(template.titles);
    contentTemplate = randomChoice(template.templates);

    const content = contentTemplate
      .replace('{period}', randomChoice(periods))
      .replace('{race}', randomChoice(races))
      .replace('{issue}', randomChoice(normalIssues))
      .replace('{normal_rate}', randomChoice(normalRates));

    return { title, content };
  }
}

/**
 * Airtableから承認済みサイトを取得
 */
async function getAllSites() {
  try {
    let allRecords = [];
    let offset = null;

    do {
      const url = offset
        ? `${API_URL}/Sites?filterByFormula={IsApproved}=TRUE()&offset=${offset}`
        : `${API_URL}/Sites?filterByFormula={IsApproved}=TRUE()`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API エラー: ${response.status}`);
      }

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

/**
 * 口コミをAirtableに投稿
 */
async function postReview(siteId, siteName, review) {
  try {
    const userName = randomChoice(userNames) + Math.floor(Math.random() * 100);
    const userEmail = `${userName.toLowerCase().replace(/\s+/g, '')}@example.com`;

    const response = await fetch(`${API_URL}/Reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Site: [siteId],
              UserName: userName,
              UserEmail: userEmail,
              Rating: review.rating,
              Title: review.title,
              Content: review.content,
              IsApproved: true,
              IsSpam: false,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
    }

    return true;
  } catch (error) {
    console.error(`  ❌ 投稿エラー:`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 口コミ自動投稿 v2 (品質ベース評価) を開始します\n');
  console.log(`📋 悪質サイト数: ${maliciousSites.length}件\n`);

  // 全サイトを取得
  const sites = await getAllSites();
  console.log(`📊 対象サイト数: ${sites.length}件\n`);

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  let totalReviews = 0;
  let successCount = 0;
  let failCount = 0;
  let maliciousCount = 0;
  let normalCount = 0;

  // 各サイトに4〜7件の口コミを投稿
  for (const site of sites) {
    const fields = site.fields;
    const siteName = fields.Name || 'unknown';
    const siteId = site.id;
    const isMalicious = isMaliciousSite(siteName);

    // ランダムな口コミ数（4〜7件）
    const reviewCount = Math.floor(Math.random() * 4) + 4;

    const siteType = isMalicious ? '🚫 悪質' : '📌 通常';
    console.log(`\n${siteType} ${siteName} に ${reviewCount} 件の口コミを投稿`);

    if (isMalicious) {
      maliciousCount++;
    } else {
      normalCount++;
    }

    for (let i = 0; i < reviewCount; i++) {
      // サイトの種類に応じて評価を決定
      const rating = determineRating(siteName);
      const review = generateReview(rating, siteName);
      review.rating = rating;

      const success = await postReview(siteId, siteName, review);

      if (success) {
        successCount++;
        console.log(`  ✅ ${review.title} (${rating}★)`);
      } else {
        failCount++;
      }

      totalReviews++;

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('\n\n🎉 処理完了');
  console.log('\n📊 サイト分類:');
  console.log(`  🚫 悪質サイト: ${maliciousCount}件`);
  console.log(`  📌 通常サイト: ${normalCount}件`);
  console.log('\n📝 投稿結果:');
  console.log(`  合計: ${totalReviews}件`);
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ❌ 失敗: ${failCount}件`);
  console.log('\n💡 次のステップ:');
  console.log('  1. Airtableで口コミを確認');
  console.log('  2. 優良サイトは手動で4.0-5.0星の口コミを追加');
  console.log('  3. npm run build && netlify deploy --prod');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
