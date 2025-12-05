/**
 * 地方競馬新聞削除スクリプト
 *
 * 地方競馬の競馬新聞（専門紙）を削除します。
 * - 競馬東海スペシャル
 * - 福ちゃん出版社
 * - 金沢競馬専門紙協会
 * など
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

// 削除対象の地方競馬新聞URL
const LOCAL_NEWSPAPER_PATTERNS = [
  // 地方競馬新聞
  'keiba-tokai.jp',           // 競馬東海スペシャル
  'fukuchan.net',             // 福ちゃん出版社（高知）
  'kanazawakeiba-yoso.com',   // 金沢競馬専門紙協会
];

// 削除対象のサイト名パターン
const NEWSPAPER_NAME_PATTERNS = [
  /専門紙/,
  /競馬新聞/,
  /出版/,
  /スペシャル/,
];

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 地方競馬新聞の削除を開始します\n');

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

      // 地方競馬新聞のURLパターンに一致するかチェック
      const isLocalNewspaper = LOCAL_NEWSPAPER_PATTERNS.some(pattern =>
        url.toLowerCase().includes(pattern.toLowerCase())
      );

      // サイト名パターンでもチェック
      const hasNewspaperName = NEWSPAPER_NAME_PATTERNS.some(pattern =>
        pattern.test(name)
      );

      if (isLocalNewspaper || hasNewspaperName) {
        toDelete.push({
          id: record.id,
          name,
          url,
          isApproved,
        });
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ 削除対象の地方競馬新聞はありませんでした');
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

    console.log(`\n✅ ${toDelete.length}件の地方競馬新聞を削除しました`);
    console.log(`\n残りサイト数: ${records.length - toDelete.length}件`);

    console.log('\n理由:');
    console.log('地方競馬新聞（専門紙）は、ニュース・情報提供が主で予想コンテンツを提供していないため、');
    console.log('予想サイト口コミプラットフォームの対象外です。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
