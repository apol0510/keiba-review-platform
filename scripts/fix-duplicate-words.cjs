const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function fixDuplicateWords() {
  console.log('🔧 Airtableの口コミで「競馬競馬」誤字を修正中...\n');

  const reviews = await base('Reviews')
    .select({ filterByFormula: '{IsApproved} = TRUE()' })
    .all();

  const problematicReviews = reviews.filter(review => {
    const content = review.fields.Content || '';
    return content.includes('競馬競馬');
  });

  if (problematicReviews.length === 0) {
    console.log('✅ 誤字は見つかりませんでした。すべて正常です。');
    return;
  }

  console.log(`📝 ${problematicReviews.length}件の口コミを修正します:\n`);

  for (const review of problematicReviews) {
    const originalContent = review.fields.Content;
    const fixedContent = originalContent.replace(/競馬競馬/g, '競馬');

    console.log(`ID: ${review.id}`);
    console.log(`修正前: ${originalContent.substring(0, 80)}...`);
    console.log(`修正後: ${fixedContent.substring(0, 80)}...`);

    await base('Reviews').update(review.id, {
      Content: fixedContent
    });

    console.log('✅ 修正完了\n');
  }

  console.log('🎉 すべての誤字を修正しました！');
}

fixDuplicateWords().catch(console.error);
