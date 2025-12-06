/**
 * 単一の口コミ投稿をテストして、実際にAirtableに登録されるか確認
 */

const { uploadReview } = require('./upload-adjusted-reviews.cjs');
const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function testSingleReviewUpload() {
  console.log('\n🧪 単一口コミ投稿テスト開始\n');

  // テスト用のサイトIDを取得（🏆南関競馬な日々🏆）
  console.log('1️⃣ テスト対象サイトを検索中...');
  const sites = await base('Sites').select({
    filterByFormula: 'SEARCH("南関競馬な日々", {Name})',
    maxRecords: 1
  }).all();

  if (sites.length === 0) {
    console.error('❌ テスト対象サイトが見つかりません');
    return;
  }

  const testSite = sites[0];
  console.log(`✅ テストサイト: ${testSite.fields.Name}`);
  console.log(`   サイトID: ${testSite.id}`);

  // 投稿前の口コミ数を確認
  console.log('\n2️⃣ 投稿前の口コミ数を確認中...');
  const reviewsBefore = await base('Reviews').select({
    filterByFormula: `SEARCH("${testSite.id}", ARRAYJOIN({Site}))`
  }).all();
  console.log(`   現在の口コミ数: ${reviewsBefore.length}件`);

  // テスト口コミを作成
  const testReview = {
    username: 'テストユーザー123',
    rating: 3,
    title: 'テスト投稿 - 削除してください',
    content: 'これは uploadReview() 関数のテスト投稿です。問題なければ削除してください。',
    id: 'test-review-001'
  };

  console.log('\n3️⃣ テスト口コミを投稿中...');
  console.log(`   ユーザー名: ${testReview.username}`);
  console.log(`   評価: ⭐${testReview.rating}`);
  console.log(`   タイトル: ${testReview.title}`);

  try {
    const reviewId = await uploadReview(testReview, testSite.id, true);

    if (reviewId) {
      console.log(`\n✅ uploadReview() は成功IDを返しました: ${reviewId}`);
    } else {
      console.log('\n❌ uploadReview() は null を返しました（失敗）');
      return;
    }

    // 投稿後の口コミ数を確認
    console.log('\n4️⃣ 投稿後の口コミ数を確認中...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機

    const reviewsAfter = await base('Reviews').select({
      filterByFormula: `SEARCH("${testSite.id}", ARRAYJOIN({Site}))`
    }).all();
    console.log(`   現在の口コミ数: ${reviewsAfter.length}件`);

    if (reviewsAfter.length > reviewsBefore.length) {
      console.log('\n🎉 成功！口コミが実際に登録されました！');
      console.log(`   増加数: ${reviewsAfter.length - reviewsBefore.length}件`);

      // 投稿されたレビューを確認
      const newReview = reviewsAfter.find(r => r.id === reviewId);
      if (newReview) {
        console.log('\n📝 投稿された口コミの詳細:');
        console.log(`   ID: ${newReview.id}`);
        console.log(`   タイトル: ${newReview.fields.Title}`);
        console.log(`   評価: ⭐${newReview.fields.Rating}`);
        console.log(`   承認状態: ${newReview.fields.IsApproved ? '承認済み' : '未承認'}`);
        console.log(`   作成日時: ${newReview.fields.CreatedAt}`);
      }
    } else {
      console.log('\n❌ 失敗！口コミが実際には登録されていません！');
      console.log('   uploadReview() は成功IDを返しましたが、Airtableには存在しません。');
      console.log('\n🔍 考えられる原因:');
      console.log('   1. 環境変数（AIRTABLE_API_KEY/BASE_ID）が間違っている');
      console.log('   2. 別のAirtableベースに書き込まれている');
      console.log('   3. Airtable APIのレスポンスがエラーだが、エラーハンドリングが不適切');
      console.log('   4. レビューが作成されたが、すぐに削除された');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error);
  }
}

testSingleReviewUpload().catch(console.error);
