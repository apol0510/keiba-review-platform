/**
 * 予想サイトではないサイトを自動削除するスクリプト
 *
 * 削除対象：
 * - 公式サイト（JRA、NAR、各競馬場）
 * - ツール・計算サイト
 * - ランキング・まとめサイト
 * - EC・アプリストア
 * - SNS（YouTube、Twitter/X）
 * - データベース
 */

import Airtable from 'airtable';

// 環境変数から取得
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID が必要です');
  process.exit(1);
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

// 削除すべきURLパターン（公式サイト、ツール等）
const EXCLUDE_URL_PATTERNS = [
  // 公式サイト
  'jra.go.jp',
  'keiba.go.jp',
  'nankankeiba.com',
  'urawa-keiba.jp',
  'kawasaki-keiba.jp',
  'funabashi-keiba.jp',
  'f-keiba.com',          // 船橋競馬場
  'oi-keiba.jp',
  'tokyocitykeiba.com',   // 大井競馬場
  'sonoda-himeji.jp',
  'kanazawakeiba.com',
  'nagoyakeiba.com',
  'kochi-keiba.com',
  'sagakeiba.net',

  // SNS
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',

  // ツール・アプリ
  'apps.apple.com',
  'play.google.com',

  // EC
  'amazon.co.jp',
  'rakuten.co.jp',

  // 投票サイト
  'oddspark.com', // オッズパーク（投票サイト）
  'spat4.jp',     // SPAT4（投票サイト）
  'ipat.jra.go.jp', // IPAT（投票サイト）

  // その他
  'keibalab.jp',  // レース一覧のみ
  'jbis.or.jp',   // データベース
  'chiebukuro.yahoo.co.jp',  // Yahoo知恵袋
  'note.com',     // 個人note（予想サイトではない）
  'blogmura.com', // ブログランキング
  'blog.with2.net', // ブログランキング
];

// 削除すべきサイト名パターン
const EXCLUDE_NAME_PATTERNS = [
  /公式/,
  /Official/i,
  /ランキング/,
  /まとめ/,
  /おすすめ/,
  /計算/,
  /早見表/,
  /点数/,
  /組合せ/,
  /フォーメーション/,
  /はじめての方/,
  /アプリ/,
  /App Store/i,
  /Google Play/i,
  /楽天市場/,
  /Amazon/i,
  /通販/,
  /Yahoo/i,
  /知恵袋/,
  /にほんブログ村/,
  /ブログ村/,
  /ブログランキング/,
  /レース一覧/,
  /レース情報/,
  /開催日程/,
  /オッズ/,
  /出馬表/,
  /結果/,
  /SPAT4/i,
  /的中率.*平均/,
  /回収率.*計算/,
  /買い目.*計算/,
  /馬券.*種類/,
  /とは？/,
];

// 特定のドメインは承認（予想コンテンツがある）
const APPROVED_DOMAINS = [
  'netkeiba.com',
  'regimag.jp',
  'uma-x.jp',
  'k-ba.net',
  'kayochinkeiba.com',
  'keiba-gp.com',
  'yumeoi.horse',
  'nankankeiba.xyz',
  'keibagrant.jp',
  'kichiuma.net',
  'muryou-keiba-ai.jp',
  'aikba.net',
  'keibabook.co.jp',
  'keiba-tokai.jp',
  'kanazawakeiba-yoso.com',
  'fukuchan.net',
  'm-jockey.co.jp',
  'uma-katsu.net',
  'umatoku.hochi.co.jp',
  'freekeiba.com',
  'umabi.jp',
  't-tank.net',
  'bucchakeiba.com',
  'hikky-keiba.com',
  'bfkeiba.com',
  'daikaibou.com',
  'hibokorekeiba.com',
  'baken-seikatsu.com',
  'blog.cyber-mm.jp',
  'taro-k.com',
  'gekisokeiba.livedoor.biz',
  'keiba.joywork.jp',
  'fukakukeiba.com',
  'jra.k-ba.net',
  'jiro8.sakura.ne.jp',
  'umanity.jp',
  'fukuuma.net',
  'ai-shisu.com',
  'nikkansports.com',
  'e-printservice.net',
  'glassbd4723.blog.fc2.com',
  'spaia-keiba.com',
  'vuma.ai',
  'entameboy.com',
  'tospo-keiba.jp',
  'keibariron.com',
  'uma36.com',
  'dir.netkeiba.com',
  'yoso.netkeiba.com',
];

/**
 * URLが削除対象かチェック
 */
function shouldExclude(name, url) {
  // 承認ドメインに含まれる場合は除外しない
  for (const domain of APPROVED_DOMAINS) {
    if (url.includes(domain)) {
      return false;
    }
  }

  // 除外URLパターンチェック
  for (const pattern of EXCLUDE_URL_PATTERNS) {
    if (url.includes(pattern)) {
      return true;
    }
  }

  // 除外名前パターンチェック
  for (const pattern of EXCLUDE_NAME_PATTERNS) {
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
  console.log('🧹 予想サイトではないサイトのクリーンアップを開始します\n');

  try {
    // 未承認サイトを取得
    const records = await base('Sites')
      .select({
        filterByFormula: '{IsApproved} = FALSE()',
      })
      .all();

    console.log(`📊 未承認サイト数: ${records.length}件\n`);

    const toDelete = [];
    const toKeep = [];

    // 削除対象を判定
    for (const record of records) {
      const name = record.fields.Name || '';
      const url = record.fields.URL || '';

      if (shouldExclude(name, url)) {
        toDelete.push({ id: record.id, name, url });
      } else {
        toKeep.push({ id: record.id, name, url });
      }
    }

    console.log(`❌ 削除対象: ${toDelete.length}件`);
    console.log(`✅ 保持: ${toKeep.length}件\n`);

    // 削除対象を表示
    if (toDelete.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('削除対象サイト:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      toDelete.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name}`);
        console.log(`   URL: ${site.url}\n`);
      });
    }

    // 削除実行（10件ずつバッチ処理）
    if (toDelete.length > 0) {
      console.log('🗑️  削除を実行中...\n');

      for (let i = 0; i < toDelete.length; i += 10) {
        const batch = toDelete.slice(i, i + 10);
        await base('Sites').destroy(batch.map(s => s.id));
        console.log(`  ✓ ${i + 1}〜${Math.min(i + 10, toDelete.length)}件目を削除`);
      }

      console.log(`\n✅ ${toDelete.length}件のサイトを削除しました`);
    } else {
      console.log('削除対象のサイトはありませんでした');
    }

    // 保持サイトを表示
    if (toKeep.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('保持されたサイト（予想サイト候補）:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      toKeep.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name}`);
        console.log(`   URL: ${site.url}\n`);
      });

      console.log(`\n✅ ${toKeep.length}件のサイトが残りました`);
      console.log('\n次のステップ:');
      console.log('1. 管理画面で内容を確認: https://frabjous-taiyaki-460401.netlify.app/admin/pending-sites');
      console.log('2. 予想サイトとして適切なものを承認');
      console.log('3. 不要なものは手動で削除');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
