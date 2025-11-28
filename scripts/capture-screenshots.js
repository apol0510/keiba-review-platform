#!/usr/bin/env node

/**
 * スクリーンショットURL更新スクリプト
 *
 * Airtableの全サイトのスクリーンショットURLを外部サービスのURLに更新
 *
 * 使用方法:
 * AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/capture-screenshots.js
 */

import fetch from 'node-fetch';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('必要な環境変数: AIRTABLE_API_KEY, AIRTABLE_BASE_ID');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

/**
 * スクリーンショットURLを生成
 * S-shot.ru を使用（無料、登録不要、URLエンコード不要）
 */
function generateScreenshotUrl(siteUrl) {
  if (!siteUrl) {
    console.error('Site URL is empty');
    return '';
  }

  // URLが http:// または https:// で始まっていない場合は https:// を追加
  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
    console.log(`  ℹ️  Added https:// prefix to URL: ${normalizedUrl}`);
  }

  // S-shot.ru: 無料、登録不要、日本語サイト対応
  return `https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/?${normalizedUrl}`;
}

/**
 * Airtableから全サイトを取得
 */
async function getAllSites() {
  try {
    const response = await fetch(`${API_URL}/Sites`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('❌ サイト取得エラー:', error.message);
    return [];
  }
}

/**
 * AirtableのスクリーンショットURLを更新
 */
async function updateScreenshotUrl(recordId, screenshotUrl, siteName) {
  try {
    console.log(`  📤 Airtable更新中: ${siteName}`);

    const response = await fetch(`${API_URL}/Sites/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          ScreenshotURL: screenshotUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable更新エラー: ${response.status}\n${error}`);
    }

    console.log(`  ✅ 更新完了: ${screenshotUrl}`);
    return true;
  } catch (error) {
    console.error(`  ❌ 更新エラー: ${error.message}`);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 スクリーンショットURL更新を開始します\n');
  console.log('📝 使用サービス: S-shot.ru (無料、登録不要、日本語対応)\n');

  // 全サイトを取得
  const sites = await getAllSites();
  console.log(`📊 取得したサイト数: ${sites.length}件\n`);

  if (sites.length === 0) {
    console.log('⚠️  サイトが見つかりませんでした');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 各サイトのスクリーンショットURLを更新
  for (const site of sites) {
    const fields = site.fields;
    const siteName = fields.Name || 'unknown';
    const siteUrl = fields.URL;
    const recordId = site.id;

    console.log(`\n🌐 処理中: ${siteName}`);
    console.log(`  URL: ${siteUrl}`);

    if (!siteUrl) {
      console.log(`  ⏭️  スキップ: URLが設定されていません`);
      failCount++;
      continue;
    }

    // スクリーンショットURLを生成
    const screenshotUrl = generateScreenshotUrl(siteUrl);

    // AirtableにURLを設定
    const updated = await updateScreenshotUrl(recordId, screenshotUrl, siteName);

    if (updated) {
      successCount++;
    } else {
      failCount++;
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n🎉 処理完了');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${failCount}件`);
  console.log('\n📌 注意:');
  console.log('- S-shot.ruは無料サービスで、日本語サイトにも対応しています');
  console.log('- スクリーンショットは初回アクセス時に生成されるため、表示まで数秒かかる場合があります');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
