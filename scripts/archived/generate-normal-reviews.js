#!/usr/bin/env node

/**
 * 通常サイト口コミ生成スクリプト
 *
 * 機能:
 * - 通常サイト（悪質ではないサイト）のみを対象
 * - 3星の中立的な評価
 * - リアルな日本語口コミ（具体的な金額は避ける）
 * - 多様なユーザー名生成
 *
 * 使用方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/generate-normal-reviews.js
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
  console.error('AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/generate-normal-reviews.js');
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

// === 口コミテンプレート（通常サイト用、3星のみ） ===

const normalReviewTemplates = [
  {
    titles: ['可もなく不可もなく', '普通のサイト', 'そこそこ使える', '平均的な印象'],
    templates: [
      '{period}利用していますが、的中率は{normal_rate}くらいで普通です。{race}の予想を参考にしていますが、{issue}。利用料としては妥当な範囲かと思います。',
      '{month}月から使っていますが、特別優れているわけではありません。{result}することもあれば外れることも。{issue}が改善されれば、もう少し評価が上がるかもしれません。',
      '的中精度は{normal_rate}程度で可もなく不可もなく。{race}の予想はそこそこ参考になりますが、{issue}がネックです。サポート対応は普通です。',
      '{period}試していますが、予想の質は平均的。{result}したこともあるので完全にダメというわけではないです。ただ{issue}で、長期利用は迷っています。',
      '{month}月に登録して{period}経過。的中率{normal_rate}で、情報料としては標準的。{issue}が少し気になりますが、詐欺サイトではないと思います。',
    ],
  },
  {
    titles: ['まあまあ使える', '悪くはない', '参考程度に', '一般的なサービス'],
    templates: [
      '無料で使える範囲で試していますが、{race}の情報は{normal_rate}くらいの精度。{issue}ですが、無料なので文句は言えません。',
      '{period}ほど利用中。{result}することもあるので、完全に当てにならないわけではないです。{issue}が改善されれば良いサイトになると思います。',
      '{month}月から見ていますが、ブログ形式で読みやすい。的中率は{normal_rate}程度で、{issue}のが残念。でも無料なので参考程度には使えます。',
      '予想の根拠は一応示されていて、{normal_rate}の確率で当たります。{issue}が気になりますが、有料サイトほど期待しなければ使えるかと。',
      '{race}の予想を{period}見ていますが、{result}したことも数回あり。ただ{issue}で、メインの情報源にはしていません。補助的に使う分には良いです。',
    ],
  },
  {
    titles: ['ほどほどに使える', '標準的な内容', '期待しすぎなければ', '補助的に使用'],
    templates: [
      'AIを使った予想とのことですが、精度は{normal_rate}程度。{issue}で、過度な期待は禁物です。{month}月から{period}使っていますが、無料の範囲では普通かと。',
      '{race}のデータ分析サイトとして{period}利用中。{result}する確率は半々くらい。{issue}がマイナスポイントですが、無料で使えるので文句は言えません。',
      '競馬ブログとして{month}月から読んでいます。的中率{normal_rate}で、{issue}。ただ、考察は面白いので娯楽として見るのはアリです。',
      '{period}ほど参考にしていますが、{result}したのは数回程度。{issue}が改善されると良いのですが。無料サービスなので期待値は低めに設定しています。',
      '個人運営のサイトのようで、{normal_rate}くらいの的中率。{issue}がネックですが、{race}の予想を補助的に見る分には使えます。',
    ],
  },
];

// === 置換用変数 ===

const periods = ['1ヶ月', '2ヶ月', '3ヶ月', '4ヶ月', '半年'];
const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const races = [
  '南関競馬', '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬',
  '地方競馬', '中央競馬', 'JRAレース', '重賞レース', 'ナイター競馬',
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
  '広告が多くて見づらいこと',
  'スマホ対応が不十分なこと',
  'データの更新頻度が低いこと',
  '過去データの分析が浅いこと',
];

// 通常サイト用の結果表現
const normalResults = [
  '小額配当を獲得', '3連単が的中', 'トントンの収支', '2回に1回は的中',
  'たまに高配当が出る', '的中はするが薄い配当が多い', 'プラス収支になった',
  '予想が当たった', '参考になった', '役に立った',
];

const normalRates = ['5割前後', '5〜6割', '6割程度', '半分くらい', '4〜5割'];

// === ヘルパー関数 ===

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isMaliciousSite(siteName) {
  return maliciousSites.some(malicious => siteName.includes(malicious));
}

function generateReview() {
  const template = randomChoice(normalReviewTemplates);
  const title = randomChoice(template.titles);
  const contentTemplate = randomChoice(template.templates);

  const content = contentTemplate
    .replace('{period}', randomChoice(periods))
    .replace('{month}', randomChoice(months))
    .replace('{race}', randomChoice(races))
    .replace('{issue}', randomChoice(normalIssues))
    .replace('{result}', randomChoice(normalResults))
    .replace('{normal_rate}', randomChoice(normalRates));

  return { title, content };
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
  console.log('🚀 通常サイト口コミ生成スクリプト 開始\n');

  console.log('📊 承認済みサイトを取得中...');
  const sites = await getAllSites();

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  // 通常サイトのみをフィルタリング
  const normalSiteRecords = sites.filter(site => {
    const siteName = site.fields.Name;
    const airtableSiteQuality = site.fields.SiteQuality;
    const isMalicious = airtableSiteQuality === 'malicious' || isMaliciousSite(siteName);
    return !isMalicious && (airtableSiteQuality === 'normal' || !airtableSiteQuality);
  });

  console.log(`🎯 通常サイト ${normalSiteRecords.length}件を処理対象にします\n`);

  if (normalSiteRecords.length === 0) {
    console.log('⚠️  処理対象の通常サイトがありませんでした');
    return;
  }

  const allReviews = [];

  for (const site of normalSiteRecords) {
    const siteName = site.fields.Name;
    const siteId = [site.id];
    const reviewCount = Math.floor(Math.random() * 4) + 4; // 4-7件

    console.log(`📝 "${siteName}" に${reviewCount}件の口コミを生成中...`);

    for (let i = 0; i < reviewCount; i++) {
      const { title, content } = generateReview();
      const userName = generateUserName();
      const userEmail = generateEmail(userName);

      allReviews.push({
        Site: siteId,
        UserName: userName,
        UserEmail: userEmail,
        Rating: 3, // 通常サイトは全て3星
        Title: title,
        Content: content,
        IsApproved: true,
        // CreatedAtは自動生成されるため省略
      });
    }
  }

  console.log(`\n📤 合計${allReviews.length}件の口コミをAirtableに投稿中...\n`);

  const created = await createReviews(allReviews);

  console.log(`\n✨ 完了！${created}件の口コミを作成しました`);
  console.log('\n💡 特徴:');
  console.log('   ✅ 通常サイトのみを対象（悪質サイトは除外）');
  console.log('   ✅ 全て3星の中立的な評価');
  console.log('   ✅ 具体的な金額表現を避けた現実的な口コミ');
  console.log('   ✅ 多様なユーザー名パターン（20種類以上）');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
