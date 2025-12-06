/**
 * Airtable Reviews テーブルのすべてのフィールドを詳細確認
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function checkAllFields() {
  console.log('🔍 Airtable Reviews テーブルの全フィールドを確認しています...\n');

  try {
    // 最新のレコードを5件取得
    const records = await base('Reviews').select({
      maxRecords: 5,
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();

    if (records.length === 0) {
      console.log('⚠️  Reviews テーブルにレコードが存在しません');
      return;
    }

    console.log(`📊 取得レコード数: ${records.length}件\n`);

    // 最初のレコードのフィールドを詳細表示
    const firstRecord = records[0];
    const fields = Object.keys(firstRecord.fields);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 すべてのフィールド一覧（フィールド名と値のタイプ）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    fields.forEach(field => {
      const value = firstRecord.fields[field];
      const type = Array.isArray(value) ? 'Array' : typeof value;
      console.log(`✓ ${field}`);
      console.log(`  タイプ: ${type}`);
      console.log(`  値: ${JSON.stringify(value)}`);
      console.log();
    });

    // HelpfulCountまたは類似フィールドを検索
    const helpfulFields = fields.filter(f =>
      f.toLowerCase().includes('helpful') ||
      f.toLowerCase().includes('count') ||
      f.toLowerCase().includes('vote') ||
      f.toLowerCase().includes('like')
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 「helpful」「count」「vote」「like」を含むフィールド');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (helpfulFields.length > 0) {
      helpfulFields.forEach(field => {
        console.log(`✓ ${field}: ${JSON.stringify(firstRecord.fields[field])}`);
      });
    } else {
      console.log('❌ 該当するフィールドが見つかりませんでした');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function main() {
  console.log('🚀 Airtable Reviews テーブル全フィールドチェック開始\n');
  await checkAllFields();
  console.log('✅ 完了');
}

main();
