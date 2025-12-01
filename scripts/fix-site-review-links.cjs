/**
 * サイトとレビューのリンク修復スクリプト
 *
 * 問題: サイトのReviewsフィールドに件数が表示されているが、
 *      実際のReviewsテーブルにそのサイトIDでデータが見つからない
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function diagnoseAndFix() {
  console.log('🔍 サイトとレビューのリンク状況を診断\n');

  // 1. すべての承認済みサイトを取得
  const sites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    maxRecords: 5
  }).all();

  console.log(`✅ ${sites.length}件のサイトを確認\n`);

  for (const site of sites) {
    const siteId = site.id;
    const siteName = site.fields.Name;
    const slug = site.fields.Slug;
    const reviewsLinked = site.fields.Reviews || [];

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 サイト: ${siteName}`);
    console.log(`   Site ID: ${siteId}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Reviews (Linked): ${reviewsLinked.length}件`);

    // 2. このサイトIDでレビューを検索（Siteフィールドで）
    try {
      const reviewsBySiteField = await base('Reviews').select({
        filterByFormula: `SEARCH('${siteId}', ARRAYJOIN({Site}))`
      }).all();

      console.log(`   Reviews (by Site field): ${reviewsBySiteField.length}件`);

      if (reviewsLinked.length > 0 && reviewsBySiteField.length === 0) {
        console.log('   ⚠️  警告: Reviewsリンクはあるが、実際のレビューが見つからない！');

        // Reviewsフィールドに含まれているレビューIDを確認
        if (reviewsLinked.length > 0) {
          console.log(`\n   Reviewsフィールドに含まれるレビューID: ${reviewsLinked.slice(0, 3).join(', ')}`);

          // 実際にそのレビューIDが存在するか確認
          for (const reviewId of reviewsLinked.slice(0, 3)) {
            try {
              const review = await base('Reviews').find(reviewId);
              const reviewSiteField = review.fields.Site;
              const reviewSiteId = Array.isArray(reviewSiteField) ? reviewSiteField[0] : reviewSiteField;

              console.log(`\n   Review ID: ${reviewId}`);
              console.log(`     - Title: ${review.fields.Title}`);
              console.log(`     - Site field: ${reviewSiteId}`);
              console.log(`     - IsApproved: ${review.fields.IsApproved}`);

              if (reviewSiteId !== siteId) {
                console.log(`     ⚠️  Site fieldが一致しません! (expected: ${siteId}, actual: ${reviewSiteId})`);
              }
            } catch (err) {
              console.log(`   ❌ Review ID ${reviewId} が見つかりません（削除済み？）`);
            }
          }
        }
      }

      // 承認済みレビューのみカウント
      const approvedReviews = reviewsBySiteField.filter(r => r.fields.IsApproved === true);
      console.log(`   承認済みレビュー: ${approvedReviews.length}件`);

    } catch (error) {
      console.error(`   ❌ エラー: ${error.message}`);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 診断完了\n');
}

diagnoseAndFix().catch(console.error);
