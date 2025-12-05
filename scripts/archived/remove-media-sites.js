/**
 * 競馬新聞・メディア削除スクリプト
 *
 * 競馬新聞、メディアサイト、ランキングサイト、ツールサイトなど、
 * 予想サイトではないサイトを削除します。
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

// 削除対象のメディアサイトURL
const MEDIA_SITE_PATTERNS = [
  // 競馬新聞
  'nikkansports.com',   // 日刊スポーツ
  'sanspo.com',         // サンスポ
  'tospo-keiba.jp',     // 東スポ競馬
  'daily.co.jp',        // デイリースポーツ
  'keibabook.co.jp',    // 競馬ブック
  'hochi.co.jp',        // スポーツ報知

  // メディア
  'sports.yahoo.co.jp', // スポーツナビ
  'spaia-keiba.com',    // SPAIA競馬

  // ツール・ランキング
  'uma36.com',             // 馬三郎タイムズ
  'keiba.pa.land.to',      // 早見表
  'tom.tokyokeibajo.com',  // 買い目計算
  'apps.apple.com',        // App Store

  // ブログランキング
  'blogmura.com',
  'blog.with2.net',

  // その他ツール
  'jra-van.jp',  // JRA-VAN（ツール・データ提供）
  'jiro8.sakura.ne.jp',  // 競馬新聞
  'blog.cyber-mm.jp',    // ハイブリッド競馬新聞
];

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 競馬新聞・メディアサイトの削除を開始します\n');

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

      // メディアサイトのURLパターンに一致するかチェック
      const isMediaSite = MEDIA_SITE_PATTERNS.some(pattern =>
        url.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isMediaSite) {
        toDelete.push({
          id: record.id,
          name,
          url,
          isApproved,
        });
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ 削除対象の競馬新聞・メディアサイトはありませんでした');
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

    console.log(`\n✅ ${toDelete.length}件の競馬新聞・メディアサイトを削除しました`);
    console.log(`\n残りサイト数: ${records.length - toDelete.length}件`);

    console.log('\n理由:');
    console.log('競馬新聞、メディアサイト、ツール、ランキングサイトは予想コンテンツを提供していないため、');
    console.log('予想サイト口コミプラットフォームの対象外です。');
    console.log('一部のサイトは /resources/ ページで公式リンクとして紹介されています。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
