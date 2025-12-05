/**
 * 不適切な口コミを削除するスクリプト
 * 中央競馬カテゴリのサイトに「地方」というワードを含む口コミを削除
 */

const Airtable = require('airtable');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * 中央競馬カテゴリのサイトIDを取得
 */
async function getChuoSiteIds() {
  const sites = await base('Sites')
    .select({
      filterByFormula: "{Category} = 'chuo'",
      fields: ['Name', 'Category']
    })
    .all();

  return sites.map(site => ({ id: site.id, name: site.fields.Name }));
}

/**
 * 不適切なワードを含む口コミを検索
 */
async function findInappropriateReviews(siteIds, forbiddenWords) {
  const inappropriateReviews = [];

  console.log(`\n🔍 ${siteIds.length}件の中央競馬サイトをチェック中...\n`);

  for (const site of siteIds) {
    const reviews = await base('Reviews')
      .select({
        filterByFormula: `FIND('${site.id}', ARRAYJOIN({Site}))`,
        fields: ['Title', 'Content', 'Site', 'Rating', 'CreatedAt']
      })
      .all();

    for (const review of reviews) {
      const content = review.fields.Content || '';
      const title = review.fields.Title || '';
      const fullText = title + content;

      for (const word of forbiddenWords) {
        if (fullText.includes(word)) {
          inappropriateReviews.push({
            reviewId: review.id,
            siteName: site.name,
            siteId: site.id,
            title: title.substring(0, 30),
            content: content.substring(0, 50),
            forbiddenWord: word,
            rating: review.fields.Rating
          });
          break; // 1つでも見つかったらループを抜ける
        }
      }
    }
  }

  return inappropriateReviews;
}

/**
 * 口コミを削除
 */
async function deleteReviews(reviewIds) {
  console.log(`\n🗑️  ${reviewIds.length}件の口コミを削除中...\n`);

  let deletedCount = 0;

  for (const reviewId of reviewIds) {
    try {
      await base('Reviews').destroy(reviewId);
      deletedCount++;
      console.log(`  ✅ 削除完了: ${reviewId}`);

      // レート制限対策（200ms待機）
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ 削除失敗: ${reviewId}`, error.message);
    }
  }

  return deletedCount;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 不適切な口コミ削除スクリプトを開始します\n');
  console.log('対象: 中央競馬カテゴリのサイトで「地方」を含む口コミ\n');

  // 禁止ワードリスト
  const forbiddenWords = ['地方'];

  try {
    // 1. 中央競馬サイトを取得
    const chuoSites = await getChuoSiteIds();
    console.log(`✅ 中央競馬サイト: ${chuoSites.length}件\n`);

    // 2. 不適切な口コミを検索
    const inappropriateReviews = await findInappropriateReviews(chuoSites, forbiddenWords);

    if (inappropriateReviews.length === 0) {
      console.log('✅ 不適切な口コミは見つかりませんでした');
      return;
    }

    console.log(`\n⚠️  ${inappropriateReviews.length}件の不適切な口コミが見つかりました:\n`);

    // 詳細表示
    inappropriateReviews.forEach((review, index) => {
      console.log(`${index + 1}. サイト: ${review.siteName}`);
      console.log(`   タイトル: ${review.title}...`);
      console.log(`   本文: ${review.content}...`);
      console.log(`   禁止ワード: "${review.forbiddenWord}"`);
      console.log(`   評価: ⭐${review.rating}`);
      console.log('');
    });

    // 3. 削除確認（自動実行の場合はスキップ）
    const reviewIds = inappropriateReviews.map(r => r.reviewId);
    const deletedCount = await deleteReviews(reviewIds);

    console.log(`\n✅ 完了: ${deletedCount}件の口コミを削除しました\n`);

    // サマリー
    console.log('📊 サマリー:');
    console.log(`   チェックしたサイト: ${chuoSites.length}件`);
    console.log(`   見つかった不適切な口コミ: ${inappropriateReviews.length}件`);
    console.log(`   削除した口コミ: ${deletedCount}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
