/**
 * レビュー表示問題の診断スクリプト
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function diagnose() {
  console.log('🔍 レビュー表示問題の診断を開始\n');

  // 1. サイト情報を取得
  console.log('📊 Step 1: サイト情報を取得中...\n');
  const sites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    maxRecords: 10,
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  console.log(`✅ ${sites.length}件の承認済みサイトを取得\n`);

  // 2. 各サイトのレビュー状況を確認
  for (const site of sites.slice(0, 5)) {
    const siteId = site.id;
    const siteName = site.fields.Name;
    const siteSlug = site.fields.Slug;
    const reviewsField = site.fields.Reviews || [];
    const reviewCountField = site.fields.ReviewCount || 0;
    const avgRatingField = site.fields.AverageRating || 0;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 サイト: ${siteName}`);
    console.log(`   Slug: ${siteSlug}`);
    console.log(`   Site ID: ${siteId}`);
    console.log(`   Reviews (Linked Field): ${reviewsField.length}件`);
    console.log(`   ReviewCount (Formula): ${reviewCountField}`);
    console.log(`   AverageRating (Formula): ${avgRatingField}`);

    // 3. このサイトに紐づく実際のレビューを取得
    const reviews = await base('Reviews').select({
      filterByFormula: `{Site} = '${siteId}'`
    }).all();

    console.log(`\n   実際のReviewsテーブルのデータ: ${reviews.length}件`);

    if (reviews.length === 0) {
      console.log('   ⚠️  レビューが1件もありません！');
    } else {
      console.log('\n   レビュー詳細:');
      reviews.forEach((review, i) => {
        const isApproved = review.fields.IsApproved || false;
        const rating = review.fields.Rating || 0;
        const title = review.fields.Title || '(タイトルなし)';
        const username = review.fields.UserName || '(名前なし)';

        console.log(`   ${i + 1}. [${isApproved ? '✅承認済み' : '❌未承認'}] ${rating}★ - ${title} (by ${username})`);
      });

      // 承認済みレビューのみカウント
      const approvedReviews = reviews.filter(r => r.fields.IsApproved === true);
      console.log(`\n   承認済みレビュー: ${approvedReviews.length}件`);

      if (approvedReviews.length === 0) {
        console.log('   ⚠️  承認済みレビューが0件です！すべて未承認状態です。');
      }

      if (approvedReviews.length > 0) {
        const avgRating = approvedReviews.reduce((sum, r) => sum + (r.fields.Rating || 0), 0) / approvedReviews.length;
        console.log(`   計算された平均評価: ${avgRating.toFixed(1)}★`);
      }
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 診断完了\n');
  console.log('💡 問題の可能性:');
  console.log('   1. レビューが未承認状態のまま（IsApproved = false）');
  console.log('   2. Site フィールドのリンクが正しく設定されていない');
  console.log('   3. フロントエンドが承認済みレビューのみ表示している');
}

diagnose().catch(console.error);
