/**
 * Airtable Reviews テーブルに HelpfulCount フィールドを追加するスクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/add-helpful-count-field.cjs
 */

const Airtable = require('airtable');

// 環境変数の確認
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function checkHelpfulCountField() {
  console.log('🔍 Airtable Reviews テーブルの構造を確認しています...\n');

  try {
    // テーブルのレコードを1件取得してフィールド構造を確認
    const records = await base('Reviews').select({
      maxRecords: 1
    }).all();

    if (records.length === 0) {
      console.log('⚠️  Reviews テーブルにレコードが存在しません');
      return;
    }

    const record = records[0];
    const fields = Object.keys(record.fields);

    console.log('📋 既存のフィールド:');
    fields.forEach(field => {
      console.log(`   - ${field}`);
    });

    if (fields.includes('HelpfulCount')) {
      console.log('\n✅ HelpfulCount フィールドは既に存在します');

      // 既存の値を確認
      const helpfulCount = record.fields.HelpfulCount;
      console.log(`   現在の値: ${helpfulCount || 0}`);
    } else {
      console.log('\n❌ HelpfulCount フィールドが見つかりません');
      console.log('\n📝 手動でAirtableに追加してください:');
      console.log('   1. Airtable Reviews テーブルを開く: https://airtable.com/appwdYkA3Fptn9TtN');
      console.log('   2. 新しいフィールドを追加');
      console.log('   3. フィールド名: HelpfulCount');
      console.log('   4. フィールドタイプ: Number');
      console.log('   5. デフォルト値: 0');
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function main() {
  console.log('🚀 HelpfulCount フィールドチェックを開始\n');

  await checkHelpfulCountField();

  console.log('\n✅ 完了');
}

main();
