const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

(async () => {
  try {
    console.log('🔍 nankan-analyticsサイトの全レビュー（承認状態問わず）調査\n');

    // 1. Site ID rec3k0Firefs0Hmjd の全レビューを取得（承認状態問わず）
    const allReviewsRecords = await base('Reviews').select({
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();

    console.log(`📊 全レビュー総数: ${allReviewsRecords.length}件\n`);

    // Site ID rec3k0Firefs0Hmjd でフィルター
    const nankanReviews = allReviewsRecords.filter(record => {
      const siteLinkField = record.fields.Site;
      const linkedSiteId = Array.isArray(siteLinkField) ? siteLinkField[0] : siteLinkField;
      return linkedSiteId === 'rec3k0Firefs0Hmjd';
    });

    console.log(`📊 nankan-analyticsのレビュー数: ${nankanReviews.length}件\n`);

    if (nankanReviews.length > 0) {
      const approved = nankanReviews.filter(r => r.fields.IsApproved === true);
      const pending = nankanReviews.filter(r => r.fields.IsApproved !== true);

      console.log(`  ✅ 承認済み: ${approved.length}件`);
      console.log(`  ⏳ 未承認: ${pending.length}件\n`);

      console.log('📝 全レビュー一覧:');
      nankanReviews.forEach((r, i) => {
        const status = r.fields.IsApproved === true ? '✅承認済み' : '❌未承認';
        console.log(`  ${i + 1}. [${status}] ⭐${r.fields.Rating} - ${r.fields.Title}`);
        console.log(`     ユーザー: ${r.fields.UserName || 'N/A'}`);
        console.log(`     投稿日: ${r.fields.CreatedAt || 'N/A'}`);
        console.log(`     Review ID: ${r.id}`);
        console.log('');
      });

      if (pending.length > 0) {
        console.log('⚠️ 【重要】未承認のレビューがあります！');
        console.log('Airtableで手動で承認するか、以下のコマンドで一括承認できます:\n');
        console.log('----------------------------------------');
        pending.forEach(r => {
          console.log(`# ${r.fields.Title}`);
          console.log(`node scripts/approve-review.cjs ${r.id}\n`);
        });
        console.log('----------------------------------------');
      }
    } else {
      console.log('  ❌ レビューが1件も見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
})();
