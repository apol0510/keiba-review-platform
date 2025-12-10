const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

(async () => {
  try {
    console.log('🔍 nankan-analytics サイトのレビュー調査\n');

    // 1. Site ID rec3k0Firefs0Hmjd のレビューを全て取得
    const reviews = await base('Reviews').select({
      filterByFormula: '{Site} = "rec3k0Firefs0Hmjd"',
      fields: ['Title', 'Rating', 'IsApproved', 'UserName', 'CreatedAt'],
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();

    console.log(`📊 Site ID rec3k0Firefs0Hmjd のレビュー数: ${reviews.length}件\n`);

    if (reviews.length > 0) {
      const approved = reviews.filter(r => r.fields.IsApproved === true);
      const pending = reviews.filter(r => r.fields.IsApproved === false || r.fields.IsApproved === undefined);

      console.log(`  ✅ 承認済み: ${approved.length}件`);
      console.log(`  ⏳ 未承認/未設定: ${pending.length}件\n`);

      console.log('📝 最新10件のレビュー:');
      reviews.slice(0, 10).forEach((r, i) => {
        const status = r.fields.IsApproved === true ? '✅承認済み' : '⏳未承認';
        console.log(`  ${i + 1}. [${status}] ⭐${r.fields.Rating} - ${r.fields.Title}`);
        console.log(`     ユーザー: ${r.fields.UserName || 'N/A'}, 投稿日: ${r.fields.CreatedAt || 'N/A'}`);
      });

      // 承認済みレビューの詳細
      if (approved.length > 0) {
        console.log('\n\n✅ 承認済みレビュー詳細:');
        approved.forEach((r, i) => {
          console.log(`  ${i + 1}. ⭐${r.fields.Rating} - ${r.fields.Title}`);
          console.log(`     ユーザー: ${r.fields.UserName}`);
          console.log(`     投稿日: ${r.fields.CreatedAt}`);
        });
      }
    } else {
      console.log('  ❌ レビューが1件も見つかりませんでした');
      console.log('\n🔍 別の方法でサイトを検索してみます...\n');

      // 2. Slugで検索し直す
      const sites = await base('Sites').select({
        filterByFormula: '{Slug} = "apolon-keibanahibi-com"',
        fields: ['Name', 'Slug']
      }).all();

      if (sites.length > 0) {
        console.log(`  ✅ サイトが見つかりました: ${sites[0].fields.Name}`);
        console.log(`  Site ID: ${sites[0].id}`);

        // このIDでレビュー検索
        const reviewsRetry = await base('Reviews').select({
          filterByFormula: `{Site} = "${sites[0].id}"`,
          fields: ['Title', 'Rating', 'IsApproved']
        }).all();

        console.log(`\n  📊 レビュー数: ${reviewsRetry.length}件`);
      } else {
        console.log('  ❌ Slugでもサイトが見つかりませんでした');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
})();
