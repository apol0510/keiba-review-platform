/**
 * 不適切なワードを含む口コミを検索するスクリプト
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function findInappropriateWords() {
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
          rating: review.fields.Rating,
          siteId: review.fields.Site ? review.fields.Site[0] : 'N/A'
        });
        break;
      }
    }
  }

  if (inappropriateReviews.length === 0) {
    console.log('✅ 不適切なワードは見つかりませんでした');
    return;
  }

  console.log(`⚠️  ${inappropriateReviews.length}件の不適切な口コミが見つかりました:\n`);

  inappropriateReviews.forEach((review, index) => {
    console.log(`${index + 1}. 禁止ワード: "${review.forbiddenWord}"`);
    console.log(`   タイトル: ${review.title}...`);
    console.log(`   本文: ${review.content}...`);
    console.log(`   評価: ⭐${review.rating}`);
    console.log(`   レビューID: ${review.reviewId}`);
    console.log('');
  });

  console.log('\n📊 サマリー:');
  console.log(`   総口コミ数: ${allReviews.length}件`);
  console.log(`   不適切な口コミ: ${inappropriateReviews.length}件`);

  const byWord = {};
  inappropriateReviews.forEach(r => {
    byWord[r.forbiddenWord] = (byWord[r.forbiddenWord] || 0) + 1;
  });

  console.log('\n   ワード別内訳:');
  for (const [word, count] of Object.entries(byWord)) {
    console.log(`     "${word}": ${count}件`);
  }
}

findInappropriateWords().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
