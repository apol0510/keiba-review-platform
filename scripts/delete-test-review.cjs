const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function deleteTestReview() {
  console.log('🔍 テスト投稿を検索中...\n');
  
  try {
    // テスト投稿を検索
    const records = await base('Reviews').select({
      filterByFormula: 'AND(SEARCH("テスト投稿 - 削除してください", {Title}), {UserName} = "テストユーザー123")',
      maxRecords: 10
    }).all();
    
    if (records.length === 0) {
      console.log('⚠️  テスト投稿が見つかりませんでした');
      return;
    }
    
    console.log(`📋 ${records.length}件のテスト投稿を発見:\n`);
    
    for (const record of records) {
      console.log(`   ID: ${record.id}`);
      console.log(`   タイトル: ${record.fields.Title}`);
      console.log(`   ユーザー名: ${record.fields.UserName}`);
      console.log(`   内容: ${record.fields.Content}`);
      console.log(`   作成日: ${record.fields.CreatedAt}\n`);
    }
    
    // 削除実行
    console.log('🗑️  削除中...\n');
    
    for (const record of records) {
      await base('Reviews').destroy(record.id);
      console.log(`   ✅ 削除完了: ${record.fields.Title} (ID: ${record.id})`);
    }
    
    console.log(`\n🎉 ${records.length}件のテスト投稿を削除しました`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

deleteTestReview();
