/**
 * 「ナイター」を含む口コミを削除するスクリプト
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function findNaiterReviews() {
  const forbiddenWords = ['ナイター'];

  console.log('🔍 全口コミから「ナイター」を検索中...\n');

  const allReviews = await base('Reviews')
    .select({
      fields: ['Site', 'Title', 'Content', 'Rating', 'CreatedAt']
    })
    .all();

  console.log(`📊 総口コミ数: ${allReviews.length}件\n`);

  const inappropriateReviews = [];

  for (const review of allReviews) {
    const content = review.fields.Content || '';
    const title = review.fields.Title || '';
    const fullText = title + content;

    for (const word of forbiddenWords) {
      if (fullText.includes(word)) {
        inappropriateReviews.push({
          reviewId: review.id,
          title: title.substring(0, 50),
          content: content.substring(0, 100),
          forbiddenWord: word,
          rating: review.fields.Rating
        });
        break;
      }
    }
  }

  return inappropriateReviews;
}

async function deleteReviews(reviewIds) {
  console.log(`\n🗑️  ${reviewIds.length}件の口コミを削除中...\n`);

  let deletedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < reviewIds.length; i++) {
    const reviewId = reviewIds[i];
    try {
      await base('Reviews').destroy(reviewId);
      deletedCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`  進捗: ${i + 1}/${reviewIds.length}件 処理完了`);
      }

      // レート制限対策（200ms待機）
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      failedCount++;
      console.error(`  ❌ 削除失敗: ${reviewId}`, error.message);
    }
  }

  return { deletedCount, failedCount };
}

async function main() {
  console.log('🚀 「ナイター」口コミ削除スクリプトを開始します\n');

  try {
    // 1. 不適切な口コミを検索
    const inappropriateReviews = await findNaiterReviews();

    if (inappropriateReviews.length === 0) {
      console.log('✅ 「ナイター」を含む口コミは見つかりませんでした');
      return;
    }

    console.log(`⚠️  ${inappropriateReviews.length}件の「ナイター」を含む口コミが見つかりました\n`);

    // 最初の5件を表示
    console.log('サンプル（最初の5件）:');
    inappropriateReviews.slice(0, 5).forEach((review, index) => {
      console.log(`${index + 1}. タイトル: ${review.title}`);
      console.log(`   本文: ${review.content}...`);
      console.log('');
    });

    // 2. 削除実行
    const reviewIds = inappropriateReviews.map(r => r.reviewId);
    const { deletedCount, failedCount } = await deleteReviews(reviewIds);

    console.log(`\n✅ 削除完了\n`);

    // サマリー
    console.log('📊 サマリー:');
    console.log(`   見つかった「ナイター」口コミ: ${inappropriateReviews.length}件`);
    console.log(`   削除成功: ${deletedCount}件`);
    console.log(`   削除失敗: ${failedCount}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
