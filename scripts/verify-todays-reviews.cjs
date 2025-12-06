const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function main() {
  console.log('\n🔍 本日投稿された口コミを確認中...\n');

  // 今日の日付 (JST)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`📅 検索対象日: ${todayStr}\n`);

  // 全ての口コミを取得（CreatedAt順）
  const allReviews = await base('Reviews').select({
    sort: [{ field: 'CreatedAt', direction: 'desc' }],
    maxRecords: 200 // 最新200件を取得
  }).all();

  console.log(`📊 最新200件の口コミを取得しました\n`);

  // 今日の口コミをフィルター
  const todaysReviews = allReviews.filter(r => {
    const createdAt = r.fields.CreatedAt;
    if (!createdAt) return false;
    const createdDate = new Date(createdAt).toISOString().split('T')[0];
    return createdDate === todayStr;
  });

  console.log(`✅ 今日投稿された口コミ: ${todaysReviews.length}件\n`);

  if (todaysReviews.length === 0) {
    console.log('❌ 今日の口コミは見つかりませんでした');
    console.log('\n📋 最新10件の口コミ:');
    allReviews.slice(0, 10).forEach((r, i) => {
      const createdAt = r.fields.CreatedAt;
      console.log(`  ${i + 1}. ${r.fields.Title} [⭐${r.fields.Rating}] - ${createdAt}`);
    });
    return;
  }

  // サイト別に集計
  const bySite = {};
  for (const review of todaysReviews) {
    const siteIds = review.fields.Site || [];
    if (siteIds.length === 0) continue;

    const siteId = siteIds[0];

    // サイト情報を取得
    const siteRecord = await base('Sites').find(siteId);
    const siteName = siteRecord.fields.Name;

    if (!bySite[siteName]) {
      bySite[siteName] = [];
    }

    bySite[siteName].push({
      id: review.id,
      title: review.fields.Title,
      rating: review.fields.Rating,
      username: review.fields.UserName,
      created: review.fields.CreatedAt
    });
  }

  // サイトごとに表示
  console.log('📝 サイト別口コミ内訳:\n');
  for (const [siteName, reviews] of Object.entries(bySite)) {
    console.log(`\n🎯 ${siteName} (${reviews.length}件)`);
    reviews.forEach((r, i) => {
      console.log(`  ${i + 1}. [⭐${r.rating}] ${r.title.substring(0, 40)}...`);
      console.log(`     投稿者: ${r.username}`);
      console.log(`     作成: ${r.created}`);
    });
  }

  // 🏆南関競馬な日々🏆を特別に確認
  console.log('\n\n🔍 特別確認: 🏆南関競馬な日々🏆');
  const nankanReviews = todaysReviews.filter(r => {
    const siteIds = r.fields.Site || [];
    if (siteIds.length === 0) return false;
    // サイト名が「南関競馬な日々」を含むかチェック（後でサイトIDから取得）
    return bySite[Object.keys(bySite).find(name => name.includes('南関競馬な日々'))]?.some(rev => rev.id === r.id);
  });

  if (nankanReviews.length > 0) {
    console.log(`✅ ${nankanReviews.length}件の口コミが見つかりました`);
  } else {
    console.log('❌ 口コミが見つかりませんでした');
  }
}

main().catch(console.error);
