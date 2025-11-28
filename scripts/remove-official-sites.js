/**
 * 公式サイト削除スクリプト
 *
 * JRA、NAR、競馬場公式サイト、データベースなど、
 * 予想サイトではない公式情報サイトを削除します。
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

// 削除対象の公式サイトURL
const OFFICIAL_SITE_PATTERNS = [
  // 中央競馬公式
  'jra.go.jp',

  // 地方競馬公式
  'keiba.go.jp', // NAR

  // 競馬場公式
  'kawasaki-keiba.jp',
  'tokyocitykeiba.com', // 大井
  'oi-keiba.jp', // 大井
  'funabashi-keiba.jp', // 船橋
  'f-keiba.com', // 船橋
  'urawa-keiba.jp',
  'nankankeiba.com', // 南関東4競馬
  'sonoda-himeji.jp', // 園田・姫路
  'kanazawakeiba.com', // 金沢
  'nagoyakeiba.com', // 名古屋
  'kochi-keiba.com', // 高知
  'sagakeiba.net', // 佐賀

  // データベース
  'jbis.or.jp', // JBIS-Search
  'keibalab.jp', // 競馬ラボ（レース一覧のみ）
];

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 公式サイトの削除を開始します\n');

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

      // 公式サイトのURLパターンに一致するかチェック
      const isOfficialSite = OFFICIAL_SITE_PATTERNS.some(pattern =>
        url.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isOfficialSite) {
        toDelete.push({
          id: record.id,
          name,
          url,
          isApproved,
        });
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ 削除対象の公式サイトはありませんでした');
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

    console.log(`\n✅ ${toDelete.length}件の公式サイトを削除しました`);
    console.log(`\n残りサイト数: ${records.length - toDelete.length}件`);

    console.log('\n理由:');
    console.log('JRA、NAR、競馬場公式サイト、データベースは予想コンテンツを提供していないため、');
    console.log('予想サイト口コミプラットフォームの対象外です。');
    console.log('これらのサイトは /resources/ ページで公式リンクとして紹介されています。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
