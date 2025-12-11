const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function checkDuplicateWords() {
  console.log('🔍 Airtableの口コミで「競馬競馬」誤字をチェック中...\n');

  const reviews = await base('Reviews')
    .select({ filterByFormula: '{IsApproved} = TRUE()' })
    .all();

  const problematicReviews = reviews.filter(review => {
    const content = review.fields.Content || '';
    return content.includes('競馬競馬');
  });

  if (problematicReviews.length === 0) {
    console.log('✅ 誤字は見つかりませんでした。すべて正常です。');
  } else {
    console.log(`⚠️  ${problematicReviews.length}件の口コミで誤字を発見:\n`);
    problematicReviews.forEach(review => {
      const siteId = review.fields.Site ? review.fields.Site[0] : '不明';
      console.log(`ID: ${review.id}`);
      console.log(`サイト: ${siteId}`);
      console.log(`内容: ${review.fields.Content.substring(0, 100)}...`);
      console.log('---');
    });
  }
}

checkDuplicateWords().catch(console.error);
