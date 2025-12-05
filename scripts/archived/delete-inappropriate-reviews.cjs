/**
 * 不適切なワードを含む口コミを削除するスクリプト
 * 「地方」「詐欺」を含む口コミを一括削除
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function findInappropriateReviews() {
  const forbiddenWords = ['地方', '詐欺'];

  console.log('🔍 全口コミから不適切なワードを検索中...\n');

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
  console.log('🚀 不適切な口コミ削除スクリプトを開始します\n');
  console.log('対象: 「地方」「詐欺」を含む全ての口コミ\n');

  try {
    // 1. 不適切な口コミを検索
    const inappropriateReviews = await findInappropriateReviews();

    if (inappropriateReviews.length === 0) {
      console.log('✅ 不適切な口コミは見つかりませんでした');
      return;
    }

    console.log(`⚠️  ${inappropriateReviews.length}件の不適切な口コミが見つかりました\n`);

    // ワード別の内訳を表示
    const byWord = {};
    inappropriateReviews.forEach(r => {
      byWord[r.forbiddenWord] = (byWord[r.forbiddenWord] || 0) + 1;
    });

    console.log('ワード別内訳:');
    for (const [word, count] of Object.entries(byWord)) {
      console.log(`  "${word}": ${count}件`);
    }

    // 2. 削除実行
    const reviewIds = inappropriateReviews.map(r => r.reviewId);
    const { deletedCount, failedCount } = await deleteReviews(reviewIds);

    console.log(`\n✅ 削除完了\n`);

    // サマリー
    console.log('📊 サマリー:');
    console.log(`   見つかった不適切な口コミ: ${inappropriateReviews.length}件`);
    console.log(`   削除成功: ${deletedCount}件`);
    console.log(`   削除失敗: ${failedCount}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
