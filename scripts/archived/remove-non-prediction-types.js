/**
 * 非予想サイト削除スクリプト
 *
 * Wikipedia、口コミサイト、法律相談、メルマガ、
 * 関東地方公営競馬協議会などを削除します。
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

// 削除対象のURLパターン
const NON_PREDICTION_PATTERNS = [
  // Wikipedia
  'wikipedia.org',

  // 口コミ・評判サイト（予想サイトではない）
  'kyounboat.com',         // ボートレース口コミ
  'keiba-jiku2.net',       // 競馬軸口コミ
  'gamblereview.net',      // ギャンブルレビュー
  'just-research.com',     // 調査サイト
  'minkeiba.com',          // 民競馬（口コミサイト）
  'u85.jp',                // u85（口コミサイト）

  // 法律・詐欺相談
  'adxportland.com',       // 詐欺情報サイト
  'ishida-legal.com',      // 法律事務所

  // 公的機関
  'kanchikyo.jp',          // 関東地方公営競馬協議会（公的機関）

  // メルマガ配信スタンド（予想サイトではない）
  'umameshi.com/info/merumaga',   // うまめしメルマガ
  'smart.umasq.jp/mailmagazine',  // うまスクメルマガ
  'mag2.com',                      // まぐまぐ
  'keiba.tv',                      // 競馬TV（メルマガスタンド）

  // 企業情報・会社案内ページ（予想サイトではない）
  'top-line.co.jp/company_profile', // トップライン会社案内
  'epaddock.co.jp',                 // eパドック（投票システム）

  // 料金ガイドサイト（予想サイトではない）
  'rooseveltcampusnetwork.org',    // 料金ガイド

  // データ分析サービス（ツール）
  'jra-van.jp',            // JRA-VAN（データ提供）
  'spaia-keiba.com/billing', // SPAIA（データ分析サービス）
];

// 削除対象のサイト名パターン
const NON_PREDICTION_NAME_PATTERNS = [
  /Wikipedia/i,
  /評判.*検証/,
  /口コミ.*検証/,
  /詐欺/,
  /弁護士/,
  /法律/,
  /騙され/,
  /協議会/,
  /会社案内/,
  /料金.*妥当/,
  /メールマガジン.*登録/,
  /メールマガジン.*配信/,
  /殿堂.*メルマガ/,
  /限定コンテンツ/,
  /eパドック/,
];

/**
 * 削除対象かチェック
 */
function shouldDelete(name, url) {
  // URLパターンチェック
  for (const pattern of NON_PREDICTION_PATTERNS) {
    if (url.toLowerCase().includes(pattern.toLowerCase())) {
      return true;
    }
  }

  // サイト名パターンチェック
  for (const pattern of NON_PREDICTION_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }

  return false;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 非予想サイトの削除を開始します\n');

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
    console.log('Wikipedia、口コミ・評判サイト、法律相談、メルマガ配信スタンド、公的機関は');
    console.log('予想コンテンツを提供していないため、予想サイト口コミプラットフォームの対象外です。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
