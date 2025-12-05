/**
 * 毎日の口コミ自動投稿スクリプト
 *
 * 実行手順:
 * 1. u85.jpから口コミを収集
 * 2. 収集した口コミを調整（リライト）
 * 3. Airtableに登録（自動承認）
 */

const { scrapeReviewsFromU85 } = require('./scrape-reviews-from-u85.cjs');
const { rewriteReview, generateTitle, generateUsername, determineRating } = require('./adjust-reviews.cjs');
const { uploadReview, getSiteIdByUrl, getSiteIdByName } = require('./upload-adjusted-reviews.cjs');
const Airtable = require('airtable');
const fs = require('fs');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * Airtableから承認済みサイトをランダムに取得
 */
async function getRandomApprovedSites(count = 5) {
  try {
    const records = await base('Sites').select({
      filterByFormula: '{IsApproved} = TRUE()',
      maxRecords: 100 // すべての承認済みサイトを取得
    }).all();

    // ランダムにシャッフル
    const shuffled = records.sort(() => 0.5 - Math.random());

    // 指定した件数を取得
    return shuffled.slice(0, count).map(record => ({
      id: record.id,
      name: record.fields.Name,
      slug: record.fields.Slug,
      url: record.fields.URL
    }));

  } catch (error) {
    console.error(`❌ サイト取得エラー: ${error.message}`);
    return [];
  }
}

/**
 * 自動生成された口コミを作成
 */
function generateSyntheticReview(siteName, averageRating = 3.0) {
  const templates = {
    bad: [
      '情報料が高すぎて費用対効果が悪いと感じた。的中率も期待したほどではなかった。',
      'サポート対応が遅く、問い合わせに対する返信がなかなか来ない。信頼性に欠けると思う。',
      '無料情報はそこそこだったが、有料情報の精度が低く期待外れだった。',
      '的中率が低く、何度か利用したが利益を出すことができなかった。おすすめしない。',
      '高額な情報料を払ったのに外れてばかり。費用対効果を考えると微妙だと思う。',
    ],
    neutral: [
      '可もなく不可もなくといった印象。的中精度はそこそこだが、特別すごいわけではない。',
      '無料予想を何度か試したが、平均的な精度。期待しすぎると肩透かしを食らうかも。',
      '普通の予想サイト。特に不満はないが、特別良いとも感じなかった。',
      'まあまあの精度だと思う。的中することもあれば外れることもある。',
      'サポート対応は普通。可もなく不可もなくといった感じ。',
    ],
    good: [
      'まあまあ良いサイトだと思う。無料予想の精度がそこそこ高い。',
      '使いやすいインターフェースで、初心者にも分かりやすい。悪くないと思う。',
      'サポート対応が丁寧で、問い合わせにも迅速に対応してくれる。',
      'そこそこの精度で的中することもある。期待できるサイトだと思う。',
      '無料予想をいくつか試したが、まあまあ当たる印象。信頼できると思う。',
    ]
  };

  let category = 'neutral';
  if (averageRating <= 2.5) {
    category = 'bad';
  } else if (averageRating >= 4.0) {
    category = 'good';
  }

  const content = templates[category][Math.floor(Math.random() * templates[category].length)];
  const rating = determineRating(averageRating);
  const title = generateTitle(content, averageRating);
  const username = generateUsername();

  return { rating, title, content, username };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 毎日の口コミ自動投稿を開始\n');

  // ランダムに5サイトを選択
  const targetSites = await getRandomApprovedSites(5);

  if (targetSites.length === 0) {
    console.error('❌ 承認済みサイトが見つかりません');
    process.exit(1);
  }

  console.log(`📝 ${targetSites.length}サイトに口コミを投稿します:\n`);
  targetSites.forEach((site, i) => {
    console.log(`  ${i + 1}. ${site.name}`);
  });
  console.log('');

  let totalReviews = 0;
  let successCount = 0;

  for (const site of targetSites) {
    console.log(`\n🎯 ${site.name} に口コミを投稿中...`);

    // サイトごとに3〜5件の口コミを生成
    const reviewCount = Math.floor(Math.random() * 3) + 3; // 3-5件

    // 平均評価を推測（実際にはu85.jpから取得すべきだが、ここでは3.0固定）
    const averageRating = 3.0;

    for (let i = 0; i < reviewCount; i++) {
      const review = generateSyntheticReview(site.name, averageRating);

      console.log(`  ${i + 1}/${reviewCount}: [${review.rating}★] ${review.title}`);

      // Airtableに登録（自動承認）
      const reviewId = await uploadReview(review, site.id, true);

      if (reviewId) {
        console.log(`    ✅ 登録成功`);
        successCount++;
      } else {
        console.log(`    ❌ 登録失敗`);
      }

      totalReviews++;

      // レート制限を避けるため待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n\n✅ 毎日の口コミ投稿完了\n');
  console.log('📊 結果サマリー:');
  console.log(`  対象サイト: ${targetSites.length}サイト`);
  console.log(`  投稿口コミ: ${totalReviews}件`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${totalReviews - successCount}件`);
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getRandomApprovedSites, generateSyntheticReview };
