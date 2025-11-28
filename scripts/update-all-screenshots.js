/**
 * 全サイトのスクリーンショットURL更新スクリプト
 *
 * 承認済み・未承認問わず、全サイトのスクリーンショットURLを
 * thum.ioを使って生成・更新します。
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

/**
 * スクリーンショットURLを生成
 * shot.screenshotapi.net を使用（無料、登録不要、高速）
 */
function generateScreenshotUrl(siteUrl) {
  if (!siteUrl) {
    console.error('Site URL is empty');
    return '';
  }

  // URLを正規化
  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const encodedUrl = encodeURIComponent(normalizedUrl);

  // shot.screenshotapi.net: 無料、登録不要、高速CDN
  // width=1200: 表示幅
  // output=image: 画像として出力
  // file_type=png: PNG形式（品質が良い）
  // wait_for_event=load: ページ読み込み完了を待つ
  const screenshotUrl = `https://shot.screenshotapi.net/screenshot?token=NRTY0JN-EE16VKV-PYJXGMP-4GV3C1T&url=${encodedUrl}&width=1200&output=image&file_type=png&wait_for_event=load`;

  return screenshotUrl;
}

/**
 * メイン処理
 */
async function main() {
  console.log('📸 全サイトのスクリーンショット更新を開始します\n');

  try {
    // 全サイトを取得
    const records = await base('Sites')
      .select({
        // すべてのサイトを対象
      })
      .all();

    console.log(`📊 総サイト数: ${records.length}件\n`);

    const toUpdate = [];
    const skipped = [];

    // スクリーンショットURLを生成
    for (const record of records) {
      const name = record.fields.Name || '名前なし';
      const url = record.fields.URL || '';
      const currentScreenshot = record.fields.ScreenshotURL || '';
      const isApproved = record.fields.IsApproved || false;

      if (!url) {
        console.warn(`⚠️  スキップ: ${name} (URLなし)`);
        skipped.push({ name, reason: 'URLなし' });
        continue;
      }

      const screenshotUrl = generateScreenshotUrl(url);

      if (!screenshotUrl) {
        console.warn(`⚠️  スキップ: ${name} (スクリーンショットURL生成失敗)`);
        skipped.push({ name, reason: 'URL生成失敗' });
        continue;
      }

      toUpdate.push({
        id: record.id,
        name,
        url,
        screenshotUrl,
        isApproved,
        currentScreenshot,
      });
    }

    console.log(`✅ 更新対象: ${toUpdate.length}件`);
    console.log(`⚠️  スキップ: ${skipped.length}件\n`);

    if (toUpdate.length === 0) {
      console.log('更新対象のサイトがありません');
      return;
    }

    // スクリーンショットURL更新（10件ずつバッチ処理）
    console.log('📸 スクリーンショットURLを更新中...\n');

    let updatedCount = 0;

    for (let i = 0; i < toUpdate.length; i += 10) {
      const batch = toUpdate.slice(i, i + 10);

      // Airtableのバッチ更新
      const updates = batch.map(site => ({
        id: site.id,
        fields: {
          ScreenshotURL: site.screenshotUrl,
        },
      }));

      await base('Sites').update(updates);

      updatedCount += batch.length;
      console.log(`  ✓ ${i + 1}〜${Math.min(i + 10, toUpdate.length)}件目を更新`);

      // 各サイトの情報を表示
      batch.forEach(site => {
        const status = site.isApproved ? '✅ 承認済み' : '⏳ 未承認';
        const changed = site.currentScreenshot !== site.screenshotUrl ? '🔄 変更' : '✨ 新規';
        console.log(`    ${changed} ${status} ${site.name}`);
        console.log(`       ${site.screenshotUrl}`);
      });
      console.log('');
    }

    console.log(`\n✅ ${updatedCount}件のスクリーンショットURLを更新しました`);

    // スキップしたサイトの詳細
    if (skipped.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('スキップされたサイト:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      skipped.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name} (理由: ${site.reason})`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ 更新: ${updatedCount}件`);
    console.log(`⚠️  スキップ: ${skipped.length}件`);
    console.log(`\nスクリーンショットは https://image.thum.io で自動生成されます。`);
    console.log(`サイトページをリロードすると画像が表示されます。`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
