/**
 * 最終口コミサイト削除スクリプト
 *
 * 予想サイトのランキング・評価サイトを削除します。
 * これらは予想サイト本体ではなく、レビュープラットフォームです。
 */

import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID が必要です');
  process.exit(1);
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

// 削除対象のURLパターン（ランキング・評価サイト）
const REVIEW_SITE_PATTERNS = [
  'moukaru-keiba.com',  // 当たる競馬予想サイト（ランキング・評価サイト）
];

/**
 * 削除対象かチェック
 */
function shouldDelete(name, url) {
  // URLパターンチェック
  for (const pattern of REVIEW_SITE_PATTERNS) {
    if (url.toLowerCase().includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 ランキング・評価サイトの削除を開始します\n');

  try {
    // 未承認サイトを取得
    const records = await base('Sites')
      .select({
        filterByFormula: '{IsApproved} = FALSE()',
      })
      .all();

    console.log(`📊 未承認サイト数: ${records.length}件\n`);

    const toDelete = [];

    // 削除対象を判定
    for (const record of records) {
      const name = record.fields.Name || '名前なし';
      const url = record.fields.URL || '';

      if (shouldDelete(name, url)) {
        toDelete.push({
          id: record.id,
          name,
          url,
        });
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ 削除対象のサイトはありませんでした');
      return;
    }

    console.log(`❌ 削除対象: ${toDelete.length}件\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('削除対象サイト:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    toDelete.forEach((site, index) => {
      console.log(`${index + 1}. ${site.name}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   ID: ${site.id}\n`);
    });

    // 削除実行（10件ずつバッチ処理）
    console.log('🗑️  削除を実行中...\n');

    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10);
      await base('Sites').destroy(batch.map(s => s.id));
      console.log(`  ✓ ${i + 1}〜${Math.min(i + 10, toDelete.length)}件目を削除`);
    }

    console.log(`\n✅ ${toDelete.length}件のサイトを削除しました`);
    console.log(`\n残りサイト数: ${records.length - toDelete.length}件`);

    console.log('\n理由:');
    console.log('ランキング・評価サイトは、予想サイト本体ではなくレビュープラットフォームです。');
    console.log('予想サイト口コミプラットフォームの対象外です。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
