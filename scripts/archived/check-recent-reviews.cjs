const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function checkRecent() {
  const reviews = [];

  await base('Reviews').select({
    view: 'Grid view',
    sort: [{ field: 'CreatedAt', direction: 'desc' }],
    maxRecords: 20
  }).eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      reviews.push({
        username: record.get('UserName'),
        rating: record.get('Rating'),
        title: record.get('Title'),
        created: record.get('CreatedAt')
      });
    });
    fetchNextPage();
  });

  console.log(`\n📊 最新の口コミ ${reviews.length}件:\n`);

  const forbiddenWords = ['ナイター', '地方競馬', '地方', 'NAR', '南関', 'NANKAN', 'TCK', 'G1'];

  reviews.forEach((r, i) => {
    const hasForbidden = forbiddenWords.some(word => r.username.includes(word));
    const emoji = hasForbidden ? '❌' : '✅';
    const star = '⭐'.repeat(r.rating);
    const titlePreview = r.title ? r.title.substring(0, 30) : '';
    console.log(`${i+1}. ${emoji} ${star} ${r.username} - ${titlePreview}...`);
    if (hasForbidden) {
      console.log(`   ⚠️  禁止ワードを含む！`);
    }
  });

  const star5 = reviews.filter(r => r.rating === 5);
  if (star5.length > 0) {
    console.log(`\n❌ ⭐5の口コミが ${star5.length}件 見つかりました！`);
  } else {
    console.log(`\n✅ ⭐5の口コミはありません`);
  }

  const withForbidden = reviews.filter(r =>
    forbiddenWords.some(word => r.username.includes(word))
  );

  if (withForbidden.length > 0) {
    console.log(`\n❌ 禁止ワードを含むユーザー名: ${withForbidden.length}件`);
  } else {
    console.log(`\n✅ 禁止ワードを含むユーザー名はありません`);
  }
}

checkRecent().catch(console.error);
