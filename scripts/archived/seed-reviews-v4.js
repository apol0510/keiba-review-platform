#!/usr/bin/env node

/**
 * 口コミ自動投稿スクリプト v4 (リアリティ重視版)
 *
 * 改善点:
 * - 実際のビジネスモデルに即した問題点
 * - サポート対応は基本的にあるが、質や内容に問題がある表現
 * - 的中率の誇大表示、高額プランへの誘導など現実的な不満
 * - 悪質サイトでも最低限の運営体制は整っている前提
 *
 * 使用方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/seed-reviews-v4.js
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
  console.error('AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/seed-reviews-v4.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリストを読み込み
const maliciousSitesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'site-ratings.json'), 'utf-8')
);
const maliciousSites = maliciousSitesConfig.malicious;

// === ユーザー名生成システム ===

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

function generateUserName() {
  const style = Math.random();
  if (style < 0.2) return randomChoice(firstNames);
  else if (style < 0.4) return randomChoice(prefixes) + randomChoice(firstNames);
  else if (style < 0.6) return randomChoice(prefixes) + randomChoice(suffixes);
  else if (style < 0.8) return randomChoice(handleStyles) + randomChoice(numbers);
  else return randomChoice(prefixes) + randomChoice(suffixes) + randomChoice(numbers);
}

function generateEmail(userName) {
  const domains = ['gmail.com', 'yahoo.co.jp', 'outlook.jp', 'icloud.com', 'docomo.ne.jp'];
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

// === 口コミテンプレート（リアリティ重視） ===

// 悪質サイト用（1-2星）- 実際のビジネスモデルに即した問題点
const maliciousReviewTemplates = {
  1: [
    {
      titles: ['的中率が誇大広告', '高額プランへの誘導がひどい', '実績データが信用できない', '予想の質が低すぎる'],
      templates: [
        '{month}月から{period}利用しましたが、{issue}。的中率は{low_rate}程度で、広告の「的中率80%」とは程遠いです。{amount}円も払いましたが、ほとんど当たりませんでした。',
        '{race}の予想を{period}買いましたが、{result}。{issue}し、サポートに相談したら「上位プランなら的中率が上がる」と高額プランを勧められました。信用できません。',
        '無料予想で釣って、有料プランに誘導する典型的なパターンです。{issue}で、{period}で{amount}円使いましたが回収率は3割以下。もう使いません。',
        '{month}月に登録して{period}経過。{issue}。サポートは丁寧ですが、肝心の予想が当たらないので意味がありません。的中率{low_rate}では話になりません。',
      ],
    },
  ],
  2: [
    {
      titles: ['期待外れでした', 'コスパが悪い', '的中率が低い', '高額プランの勧誘が多い'],
      templates: [
        '{period}使いましたが、的中率{low_rate}で期待外れ。{issue}で、サポートに問い合わせても「プラン変更を検討してください」と営業トークばかり。',
        '{race}の予想を参考にしていましたが、{result}ことが多く不満です。{issue}し、月額{amount}円は高すぎると感じました。',
        '予想の根拠は一応示されますが、精度が低い。{issue}で、{period}続けましたが改善の兆しなし。サポートの返信は早いものの、内容が薄いです。',
        '{month}月から利用中ですが、{issue}。的中率{low_rate}程度で、料金{amount}円に見合った価値を感じられません。上位プランへの誘導メールも頻繁に来ます。',
      ],
    },
  ],
};

// 通常サイト用（3星）- 可もなく不可もなく、現実的な評価
const normalReviewTemplates = {
  3: [
    {
      titles: ['可もなく不可もなく', '普通のサイト', 'そこそこ使える', '平均的な印象'],
      templates: [
        '{period}利用していますが、的中率は{normal_rate}くらいで普通です。{race}の予想を参考にしていますが、{issue}。月額{amount}円としては妥当な範囲かと思います。',
        '{month}月から使っていますが、特別優れているわけではありません。{result}することもあれば外れることも。{issue}が改善されれば、もう少し評価が上がるかもしれません。',
        '的中精度は{normal_rate}程度で可もなく不可もなく。{race}の予想はそこそこ参考になりますが、{issue}がネックです。サポート対応は普通です。',
        '{period}試していますが、予想の質は平均的。{result}したこともあるので完全にダメというわけではないです。ただ{issue}で、長期利用は迷っています。',
        '{month}月に登録して{period}経過。的中率{normal_rate}で、{amount}円の情報料としては標準的。{issue}が少し気になりますが、詐欺サイトではないと思います。',
      ],
    },
  ],
};

// === 置換用変数（リアリティ重視） ===

const periods = ['1ヶ月', '2ヶ月', '3ヶ月', '4ヶ月', '半年'];
const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// 金額表現（具体的な数値ではなく、一般的な表現）
const costExpressions = [
  '結構な金額',
  'かなりの費用',
  'それなりの料金',
  '安くない金額',
  '高めの料金',
];

const races = [
  '南関競馬', '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬',
  '地方競馬', '中央競馬', 'JRAレース', '重賞レース', 'ナイター競馬',
];

// 悪質サイト用の問題点（リアリティ重視）
// サポートは対応するが、内容や質に問題がある表現
const maliciousIssues = [
  '広告の的中率と実際の的中率が全く違い',
  '無料予想は当たるのに有料予想が外れまくり',
  '掲載されている実績データが古く、信憑性が疑わしく',
  '高額プランへの勧誘メールが頻繁に届き',
  '予想の根拠が曖昧で「AI分析」と言うだけ',
  '的中実績の掲載基準が不明確で',
  'サポートに相談すると必ず上位プランを勧められ',
  '退会手続きがわかりにくく、引き止められ',
];

// 悪質サイト用の結果表現
const maliciousResults = [
  '10レース中8レース外れ', '5連敗', '的中率2割以下', '全く当たらず',
  '大穴狙いで全滅', 'トリガミばかり', '3連単が1回も当たらず',
];

// 通常サイト用の改善点（現実的な不満）
const normalIssues = [
  '情報の更新タイミングが遅いこと',
  'レース直前に予想が変更されることがあること',
  '買い目の点数が多く、資金効率が悪いこと',
  '無料予想と有料予想の差があまり感じられないこと',
  'サポートの営業時間が平日のみで土日は対応がないこと',
  '予想の根拠説明が簡潔すぎること',
  '人気馬中心の予想が多く、高配当が狙いにくいこと',
  '提供レース数が少なめなこと',
];

// 通常サイト用の結果表現
const normalResults = [
  '小額配当を獲得', '3連単が的中', 'トントンの収支', '2回に1回は的中',
  'たまに高配当が出る', '的中はするが薄い配当が多い', 'プラス収支になった',
];

const lowRates = ['2〜3割', '3割前後', '3〜4割', '4割未満'];
const normalRates = ['5割前後', '5〜6割', '6割程度', '半分くらい'];

// === ヘルパー関数 ===

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isMaliciousSite(siteName) {
  return maliciousSites.some(malicious => siteName.includes(malicious));
}

function determineRating(siteName) {
  if (isMaliciousSite(siteName)) {
    return Math.random() < 0.6 ? 1 : 2;
  } else {
    return 3;
  }
}

function generateReview(rating, siteName) {
  const isMalicious = isMaliciousSite(siteName);
  let template, title, contentTemplate;

  if (isMalicious && (rating === 1 || rating === 2)) {
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

// === Airtable API関数 ===

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
  console.log('🚀 口コミ自動投稿スクリプト v4 (リアリティ重視版) 開始\n');

  console.log('📊 承認済みサイトを取得中...');
  const sites = await getAllSites();

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  const allReviews = [];

  for (const site of sites) {
    const siteName = site.fields.Name;
    const siteId = [site.id];
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
        IsApproved: true,
        CreatedAt: createdAt,
      });
    }
  }

  console.log(`\n📤 合計${allReviews.length}件の口コミをAirtableに投稿中...\n`);

  const created = await createReviews(allReviews);

  console.log(`\n✨ 完了！${created}件の口コミを作成しました`);
  console.log('\n💡 v4の改善点:');
  console.log('   ✅ サポート対応は基本的にあるが、質や営業色が強い表現');
  console.log('   ✅ 的中率の誇大広告、高額プランへの誘導など現実的な不満');
  console.log('   ✅ 退会引き止め、頻繁な営業メールなど実際にありそうな問題');
  console.log('   ✅ 無料予想で釣って有料に誘導するビジネスモデルを反映');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
