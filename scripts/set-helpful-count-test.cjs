/**
 * 最新のレビューにHelpfulCount = 1を設定してテスト
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function setTestHelpfulCount() {
  console.log('🔍 最新のレビューを取得しています...\n');

  try {
    // 最新のレコードを1件取得
    const records = await base('Reviews').select({
      maxRecords: 1,
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();

    if (records.length === 0) {
      console.log('⚠️  Reviews テーブルにレコードが存在しません');
      return;
    }

    const record = records[0];
    console.log(`📝 レコードID: ${record.id}`);
    console.log(`   タイトル: ${record.fields.Title}`);
    console.log();

    // HelpfulCount を 1 に設定
    console.log('✍️  HelpfulCount を 1 に設定しています...');

    await base('Reviews').update(record.id, {
      HelpfulCount: 1
    });

    console.log('✅ 更新完了！');
    console.log();

    // 更新後のレコードを再取得して確認
    console.log('🔍 更新後のレコードを確認しています...');
    const updatedRecord = await base('Reviews').find(record.id);

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 更新後のフィールド一覧');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    Object.keys(updatedRecord.fields).forEach(field => {
      const value = updatedRecord.fields[field];
      console.log(`✓ ${field}: ${JSON.stringify(value)}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (updatedRecord.fields.HelpfulCount !== undefined) {
      console.log('\n✅ HelpfulCount フィールドが正常に取得できました！');
      console.log(`   値: ${updatedRecord.fields.HelpfulCount}`);
    } else {
      console.log('\n❌ まだHelpfulCount フィールドが取得できません');
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function main() {
  console.log('🚀 HelpfulCount テスト値設定を開始\n');
  await setTestHelpfulCount();
  console.log('\n✅ 完了');
}

main();
