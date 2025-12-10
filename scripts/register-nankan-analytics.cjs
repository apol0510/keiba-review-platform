const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

(async () => {
  try {
    console.log('🚀 南関アナリティクスをAirtableに登録します\n');

    const siteData = {
      Name: '南関アナリティクス',
      Slug: 'nankan-analytics',
      URL: 'https://nankan-analytics.keiba.link/',
      Category: 'nankan',
      Description: 'AI競馬予想で投資効率を最大化。XGBoost・LSTM・ニューラルネットワークによる高精度分析で的中率87%、回収率156%を実現。従来の感覚的予想から、データサイエンスによる科学的投資へ。AIが24時間365日、南関競馬を分析し続けています。',
      IsApproved: true,
      SiteQuality: 'excellent'
    };

    console.log('📝 登録データ:');
    console.log(JSON.stringify(siteData, null, 2));
    console.log('');

    // 重複チェック
    const existingSites = await base('Sites').select({
      filterByFormula: `OR({Slug} = "nankan-analytics", {URL} = "https://nankan-analytics.keiba.link/")`
    }).all();

    if (existingSites.length > 0) {
      console.log('⚠️ すでに登録されています:');
      existingSites.forEach(site => {
        console.log(`  - ${site.fields.Name} (${site.id})`);
        console.log(`    Slug: ${site.fields.Slug}`);
        console.log(`    IsApproved: ${site.fields.IsApproved}`);
        console.log(`    SiteQuality: ${site.fields.SiteQuality || 'normal'}`);
      });
      console.log('\n✅ 既存のサイトを使用します');
      return;
    }

    // 新規登録
    const record = await base('Sites').create(siteData);

    console.log('✅ 登録完了！');
    console.log(`  Site ID: ${record.id}`);
    console.log(`  Name: ${record.fields.Name}`);
    console.log(`  Slug: ${record.fields.Slug}`);
    console.log(`  URL: ${record.fields.URL}`);
    console.log(`  Category: ${record.fields.Category}`);
    console.log(`  IsApproved: ${record.fields.IsApproved}`);
    console.log(`  SiteQuality: ${record.fields.SiteQuality}`);
    console.log('');

    console.log('🎉 次のステップ:');
    console.log('  1. 初回口コミを投稿: node scripts/post-initial-reviews.cjs');
    console.log('  2. ランキング確認: node scripts/check-nankan-ranking.cjs');
    console.log('  3. サイトでの表示確認: https://keiba-review.jp/keiba-yosou/nankan-analytics/');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
})();
