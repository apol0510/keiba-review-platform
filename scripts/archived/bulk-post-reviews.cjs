/**
 * 一括口コミ投稿スクリプト
 *
 * 全サイトに5件ずつ、過去1ヶ月間のランダムな日付で口コミを投稿
 */

const { uploadReview } = require('./upload-adjusted-reviews.cjs');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

// 悪質サイトリスト
const maliciousSites = require('./config/site-ratings.json').malicious_sites || [];

// カテゴリ別のユーザー名プレフィックス
const categoryUsernamePrefixes = {
  nankan: [
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  chuo: [
    'JRA', '中央', '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '中央競馬', 'JRAファン', '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン', 'JRA派',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン', '競馬依存',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  chihou: [
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  other: [
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬好き', '馬券師', '予想屋', '競馬マニア'
  ]
};

/**
 * 過去1ヶ月間のランダムな日付を生成
 */
function getRandomPastDate() {
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime = oneMonthAgo.getTime() + Math.random() * (now.getTime() - oneMonthAgo.getTime());
  return new Date(randomTime).toISOString();
}

/**
 * カスタム口コミを読み込み
 */
function loadCustomReviews() {
  const reviewsDir = path.join(__dirname, 'reviews-data');
  const reviews = { 1: [], 2: [], 3: [], 4: [] }; // ⭐5は除外

  for (let rating = 1; rating <= 4; rating++) {
    const files = fs.readdirSync(reviewsDir).filter(f => f.includes(`⭐${rating}`));

    files.forEach(file => {
      const content = fs.readFileSync(path.join(reviewsDir, file), 'utf-8');
      const blocks = content.split(/\n\n+/).filter(b => b.trim());

      blocks.forEach(block => {
        const lines = block.trim().split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          reviews[rating].push({
            title: lines[0].trim(),
            content: lines[1].trim()
          });
        }
      });
    });
  }

  console.log('📚 カスタム口コミを読み込み中...\n');
  for (let rating = 1; rating <= 4; rating++) {
    console.log(`  ⭐${rating}: ${reviews[rating].length}件の口コミを読み込み`);
  }
  console.log(`\n✅ 合計 ${Object.values(reviews).flat().length}件の口コミを読み込みました\n`);

  return reviews;
}

/**
 * ユニークなユーザー名を生成
 */
function generateUsername(category, usedNames) {
  const prefixes = categoryUsernamePrefixes[category] || categoryUsernamePrefixes.other;
  const suffixes = ['太郎', 'ボーイ', '好き', 'マン', 'さん', '職人', '修行中', '研究者'];

  let username;
  let attempts = 0;
  do {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 1000);
    username = `${prefix}${suffix}${number}`;
    attempts++;
  } while (usedNames.has(username) && attempts < 100);

  usedNames.add(username);
  return username;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 一括口コミ投稿を開始\n');
  console.log('📝 設定:');
  console.log('  - 各サイトに5件ずつ投稿');
  console.log('  - 日付: 過去1ヶ月間でランダム');
  console.log('  - ⭐5は除外（⭐1〜4のみ）\n');

  const customReviews = loadCustomReviews();
  const usedNames = new Set();

  console.log(`✅ 悪質サイト: ${maliciousSites.length}件\n`);

  // 全サイトを取得
  const sites = [];
  await base('Sites').select({
    view: 'Grid view',
    filterByFormula: 'IsApproved = TRUE()'
  }).eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      sites.push({
        id: record.id,
        name: record.get('Name'),
        category: record.get('Category') || 'other'
      });
    });
    fetchNextPage();
  });

  console.log(`📊 対象サイト: ${sites.length}件\n`);

  let totalPosted = 0;
  let successCount = 0;
  let errorCount = 0;

  // 各サイトに5件ずつ投稿
  for (const site of sites) {
    const isMalicious = maliciousSites.some(ms => site.name.includes(ms));
    const siteType = isMalicious ? '❌悪質' : '⚪通常';

    console.log(`\n🎯 ${site.name} (${siteType})`);

    for (let i = 0; i < 5; i++) {
      try {
        // 評価を決定
        let rating;
        if (isMalicious) {
          rating = Math.random() < 0.7 ? 1 : 2; // 悪質サイト: ⭐1-2
        } else {
          const rand = Math.random();
          if (rand < 0.2) rating = 2;
          else if (rand < 0.5) rating = 3;
          else rating = 4; // 通常サイト: ⭐2-4
        }

        // 口コミを選択
        const reviewPool = customReviews[rating];
        const review = reviewPool[Math.floor(Math.random() * reviewPool.length)];

        // ユーザー名生成
        const username = generateUsername(site.category, usedNames);

        // 投稿（CreatedAtは自動設定される）
        await base('Reviews').create({
          Site: [site.id],
          UserName: username,
          UserEmail: `${username.toLowerCase()}@example.com`,
          Rating: rating,
          Title: review.title,
          Content: review.content,
          IsApproved: true
        });

        console.log(`  ${i + 1}/5: [${rating}★] ${review.title.substring(0, 30)}...`);
        successCount++;
        totalPosted++;

        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n\n✅ 一括投稿完了\n`);
  console.log(`📊 結果サマリー:`);
  console.log(`  対象サイト: ${sites.length}サイト`);
  console.log(`  投稿口コミ: ${totalPosted}件`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${errorCount}件`);
}

main().catch(console.error);
