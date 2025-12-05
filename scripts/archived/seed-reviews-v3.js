#!/usr/bin/env node

/**
 * 口コミ自動投稿スクリプト v3 (精度向上版)
 *
 * 改善点:
 * - より多様でリアルな投稿者名生成
 * - 具体的な数値・日付・レース名を含む口コミ
 * - 投稿日時の自然な分散
 * - ランダムなダミーメール生成
 *
 * 使用方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/seed-reviews-v3.js
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
  console.error('AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/seed-reviews-v3.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリストを読み込み
const maliciousSitesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'site-ratings.json'), 'utf-8')
);
const maliciousSites = maliciousSitesConfig.malicious;

// === ユーザー名生成システム（リアルで多様性のある名前） ===

const firstNames = [
  '太郎', '次郎', '三郎', '健二', '誠', '隆', '大輔', '翔太', '拓也', '和也',
  '裕介', '直樹', '智也', '浩二', '明', '淳', '剛', '徹', '悟', '学',
  '花子', '美咲', '陽子', '恵', '香織', '舞', '彩', '愛', '優', '結衣',
];

const prefixes = [
  '競馬', '南関', '地方', 'JRA', '馬券', '予想', 'ナイター', '重賞', 'G1',
];

const suffixes = [
  'ファン', '好き', 'マニア', 'ラバー', '応援団', '信者', '歴10年', '初心者',
  '師', '王', '達人', '研究家', 'マスター', '職人', '愛好家',
];

const handleStyles = [
  'keiba_lover', 'uma_fan', 'nankan_pro', 'yosou_king', 'turf_master',
  'race_watcher', 'betting_pro', 'horse_racing', 'night_race',
];

const numbers = ['1', '2', '3', '7', '77', '123', '2024', '2025', '999'];

/**
 * リアルで多様なユーザー名を生成
 */
function generateUserName() {
  const style = Math.random();

  if (style < 0.2) {
    // スタイル1: 「太郎」「花子」などシンプルな名前
    return randomChoice(firstNames);
  } else if (style < 0.4) {
    // スタイル2: 「競馬太郎」「馬券花子」など
    return randomChoice(prefixes) + randomChoice(firstNames);
  } else if (style < 0.6) {
    // スタイル3: 「競馬ファン」「南関好き」など
    return randomChoice(prefixes) + randomChoice(suffixes);
  } else if (style < 0.8) {
    // スタイル4: 「keiba_lover77」「uma_fan123」ハンドルネーム風
    return randomChoice(handleStyles) + randomChoice(numbers);
  } else {
    // スタイル5: 「競馬太郎77」「南関ファン2024」など複合
    return randomChoice(prefixes) + randomChoice(suffixes) + randomChoice(numbers);
  }
}

/**
 * ダミーメールアドレスを生成
 */
function generateEmail(userName) {
  const domains = ['gmail.com', 'yahoo.co.jp', 'outlook.jp', 'icloud.com', 'docomo.ne.jp'];
  const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomNum = Math.floor(Math.random() * 9999);
  return `${cleanName}${randomNum}@${randomChoice(domains)}`;
}

/**
 * 過去1〜180日のランダムな日付を生成（投稿日時の分散）
 */
function generateRandomPastDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 180) + 1; // 1-180日前
  const randomDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  // ランダムな時刻を追加（9:00-23:00）
  const hour = Math.floor(Math.random() * 14) + 9;
  const minute = Math.floor(Math.random() * 60);
  randomDate.setHours(hour, minute, 0, 0);

  return randomDate.toISOString();
}

// === 口コミテンプレート（より具体的でリアルな内容） ===

// 悪質サイト用（1-2星）
const maliciousReviewTemplates = {
  1: [
    {
      titles: ['完全に詐欺です', '時間とお金の無駄', '絶対におすすめしません', '最悪のサイト'],
      templates: [
        '{month}月から{period}利用しましたが、的中率{low_rate}で全く当たりません。{amount}円も使って回収ゼロ。{issue}で、完全に詐欺だと思います。',
        '{race}の予想を買いましたが、{result}で大損しました。{issue}し、サポートも無視。二度と使いません。',
        '情報料{amount}円払って{period}試しましたが、予想が全て外れ。{issue}で、信用できません。他のサイトを探します。',
        '{month}月に登録して{result}。{issue}し、的中率も{low_rate}程度。完全にお金をドブに捨てました。',
      ],
    },
  ],
  2: [
    {
      titles: ['期待外れ', 'コスパ最悪', '的中率が低すぎる', 'やめた方がいい'],
      templates: [
        '{period}使いましたが、的中率{low_rate}で期待外れ。{race}で{result}し、{amount}円の損失。{issue}も問題です。',
        '{month}月から利用中ですが、予想の質が低い。{issue}で不信感があります。料金も{amount}円と高すぎます。',
        '{race}の予想を{period}買いましたが、{result}ばかり。{issue}し、サポート対応も最悪でした。',
        '的中率{low_rate}程度で、{amount}円払う価値なし。{issue}で、リピートは絶対にありません。',
      ],
    },
  ],
};

// 通常サイト用（3星）
const normalReviewTemplates = {
  3: [
    {
      titles: ['可もなく不可もなく', '普通のサイト', 'まあまあ使える', '平均的な印象'],
      templates: [
        '{period}利用中ですが、的中率は{normal_rate}くらいで普通です。{race}の予想を参考にしていますが、{issue}が改善されればもっと良くなると思います。',
        '{month}月から使っていますが、特別優れているわけではありません。{result}することもあれば外れることも。料金は月額{amount}円で標準的です。',
        '的中精度は{normal_rate}程度で可もなく不可もなく。{race}はそこそこ参考になりますが、{issue}がネックです。',
        '{period}試していますが、予想の質は平均的。{result}したこともあるので、完全にダメというわけではないです。ただ{issue}が気になります。',
        '{month}月に登録して{period}経過。的中率{normal_rate}で、{amount}円の情報料としては妥当かな。{issue}が改善されれば継続するかも。',
      ],
    },
  ],
};

// 置換用変数（より具体的でリアルな要素）
const periods = ['1ヶ月', '2ヶ月', '3ヶ月', '4ヶ月', '半年'];
const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const amounts = ['5,000', '10,000', '15,000', '20,000', '30,000', '50,000'];

const races = [
  '南関競馬', '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬',
  '地方競馬', '中央競馬', 'JRAレース', '重賞レース', 'ナイター競馬',
  'G1レース', 'G2レース', 'G3レース', '平日レース', '週末レース',
];

// 悪質サイト用のネガティブな問題点（より具体的）
const maliciousIssues = [
  '高額プランを強引に勧められ',
  'サポートに問い合わせても返信が一切なく',
  '的中実績が完全に捏造されており',
  '解約しようとしたら引き止められ',
  '予想の根拠が全く示されず',
  '広告の的中率と実際が全然違い',
  '個人情報の扱いが不安で',
  '追加料金を次々と請求され',
];

// 悪質サイト用の結果表現
const maliciousResults = [
  '全レース不的中', '10レース全て外れ', '的中ゼロ', '全敗',
  '大穴狙いで全滅', '5連敗', '8連敗', '全く当たらず',
];

// 通常サイト用の改善点
const normalIssues = [
  '情報更新が遅めなこと',
  'レース直前の予想変更があること',
  '買い目の点数が多すぎること',
  '無料予想の精度がイマイチなこと',
  'サポート対応が遅いこと',
  '予想の根拠が不明確なこと',
  '人気馬に偏りがちなこと',
  '提供レース数が少ないこと',
];

// 通常サイト用の結果表現
const normalResults = [
  '小額配当を獲得', '3連単が的中', 'プラス収支になった', '2回に1回は的中',
  'トリガミが多い', 'たまに高配当が出る', '的中はするが薄い配当',
];

const lowRates = ['1〜2割', '2割前後', '2〜3割', '3割未満'];
const normalRates = ['5割前後', '5〜6割', '6割程度', '半分くらい'];

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
 */
function determineRating(siteName) {
  if (isMaliciousSite(siteName)) {
    // 悪質サイト: 1-2星（1星=60%, 2星=40%）
    return Math.random() < 0.6 ? 1 : 2;
  } else {
    // 通常サイト: 3星
    return 3;
  }
}

/**
 * リアルな口コミテキストを生成
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
      .replace('{month}', randomChoice(months))
      .replace('{race}', randomChoice(races))
      .replace('{issue}', randomChoice(maliciousIssues))
      .replace('{result}', randomChoice(maliciousResults))
      .replace('{amount}', randomChoice(amounts))
      .replace('{low_rate}', randomChoice(lowRates));

    return { title, content };
  } else {
    // 通常サイト用の中立的な口コミ
    template = randomChoice(normalReviewTemplates[3]);
    title = randomChoice(template.titles);
    contentTemplate = randomChoice(template.templates);

    const content = contentTemplate
      .replace('{period}', randomChoice(periods))
      .replace('{month}', randomChoice(months))
      .replace('{race}', randomChoice(races))
      .replace('{issue}', randomChoice(normalIssues))
      .replace('{result}', randomChoice(normalResults))
      .replace('{amount}', randomChoice(amounts))
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
        throw new Error(`API Error: ${response.status}`);
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
 * 口コミをAirtableに投稿（10件ずつバッチ処理）
 */
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
          records: batch.map(review => ({
            fields: review,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status}\n${errorText}`);
      }

      createdCount += batch.length;
      console.log(`✅ ${createdCount}/${reviews.length}件の口コミを作成しました`);

      // API制限対策：少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return createdCount;
  } catch (error) {
    console.error('❌ 口コミ作成エラー:', error.message);
    return 0;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 口コミ自動投稿スクリプト v3 開始\n');

  // 承認済みサイトを取得
  console.log('📊 承認済みサイトを取得中...');
  const sites = await getAllSites();

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  // 各サイトに4〜7件の口コミを生成
  const allReviews = [];

  for (const site of sites) {
    const siteName = site.fields.Name;
    const siteId = [site.id]; // Airtableのリンクフィールド形式
    const reviewCount = Math.floor(Math.random() * 4) + 4; // 4-7件

    console.log(`📝 "${siteName}" に${reviewCount}件の口コミを生成中...`);

    for (let i = 0; i < reviewCount; i++) {
      const rating = determineRating(siteName);
      const { title, content } = generateReview(rating, siteName);
      const userName = generateUserName();
      const userEmail = generateEmail(userName);
      const createdAt = generateRandomPastDate();

      allReviews.push({
        Site: siteId,
        UserName: userName,
        UserEmail: userEmail,
        Rating: rating,
        Title: title,
        Content: content,
        IsApproved: true, // 承認済みとして作成
        CreatedAt: createdAt,
      });
    }
  }

  console.log(`\n📤 合計${allReviews.length}件の口コミをAirtableに投稿中...\n`);

  // 口コミを作成
  const created = await createReviews(allReviews);

  console.log(`\n✨ 完了！${created}件の口コミを作成しました`);
  console.log('\n💡 Tips:');
  console.log('   - 投稿者名は20種類以上のパターンで生成されます');
  console.log('   - 口コミ内容に具体的な数値・日付・レース名が含まれます');
  console.log('   - 投稿日時は過去1〜180日に分散されます');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
