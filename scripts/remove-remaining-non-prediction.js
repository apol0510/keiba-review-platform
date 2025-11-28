/**
 * 残りの非予想サイト削除スクリプト
 *
 * まだ残っている公式サイト、データベース、メディアサイトを削除します。
 * - SPAT4（投票サイト）
 * - netkeiba系（データベース）
 * - regimag（ランキング/レビューサイト）
 * - uma-x.jp（データベース）
 * - YouTube公式チャンネル
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

// 削除対象のURL・ドメインパターン
const NON_PREDICTION_PATTERNS = [
  // データベース・情報サイト
  'netkeiba.com',       // netkeiba（予想サイトではなくデータベース）
  'uma-x.jp',           // uma-x.jp（データベース）
  'regimag.jp',         // regimag（ランキング/レビューサイト）

  // 投票サイト
  'spat4special.jp',    // SPAT4

  // YouTube公式チャンネル
  'youtube.com',        // YouTube

  // その他メディア
  'keiba-gp.com',       // 競馬予想GP
];

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 残りの非予想サイトの削除を開始します\n');

  try {
    // 全サイトを取得（承認済み含む）
    const records = await base('Sites')
      .select({
        // すべてのサイトを対象
      })
      .all();

    console.log(`📊 総サイト数: ${records.length}件\n`);

    const toDelete = [];

    // 削除対象を判定
    for (const record of records) {
      const url = record.fields.URL || '';
      const name = record.fields.Name || '名前なし';
      const isApproved = record.fields.IsApproved || false;

      // URLパターンに一致するかチェック
      const isNonPrediction = NON_PREDICTION_PATTERNS.some(pattern =>
        url.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isNonPrediction) {
        toDelete.push({
          id: record.id,
          name,
          url,
          isApproved,
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
      console.log(`${index + 1}. ${site.name} (${site.isApproved ? '承認済み' : '未承認'})`);
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
    console.log('データベース、情報サイト、ランキング/レビューサイト、投票サイト、YouTube公式チャンネルは');
    console.log('予想コンテンツを提供していないため、予想サイト口コミプラットフォームの対象外です。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
