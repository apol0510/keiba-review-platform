#!/usr/bin/env node

/**
 * 特定サイトのスクリーンショット更新スクリプト
 *
 * 使用方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/update-single-screenshot.js "サイト名"
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  process.exit(1);
}

const siteName = process.argv[2];
if (!siteName) {
  console.error('❌ エラー: サイト名を指定してください');
  console.error('使用方法: node scripts/update-single-screenshot.js "サイト名"');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

/**
 * スクリーンショットURL生成
 */
function generateScreenshotUrl(siteUrl) {
  if (!siteUrl) return '';

  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // S-shot.ru: 無料、登録不要
  return `https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/?${normalizedUrl}`;
}

/**
 * サイトを検索
 */
async function findSite(name) {
  try {
    const response = await fetch(`${API_URL}/Sites?filterByFormula=SEARCH("${name}", {Name})`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error('❌ サイト検索エラー:', error.message);
    return [];
  }
}

/**
 * スクリーンショットURLを更新
 */
async function updateScreenshot(recordId, screenshotUrl) {
  try {
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
      throw new Error(`API Error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('❌ 更新エラー:', error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log(`🔍 サイトを検索中: "${siteName}"\n`);

  const sites = await findSite(siteName);

  if (sites.length === 0) {
    console.log('⚠️  該当するサイトが見つかりませんでした');
    return;
  }

  console.log(`📊 ${sites.length}件のサイトが見つかりました:\n`);

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const fields = site.fields;

    console.log(`${i + 1}. ${fields.Name}`);
    console.log(`   URL: ${fields.URL}`);
    console.log(`   現在のスクショ: ${fields.ScreenshotURL || 'なし'}`);
  }

  // 複数ある場合は選択を求める
  let selectedSite;
  if (sites.length === 1) {
    selectedSite = sites[0];
  } else {
    console.log('\n複数のサイトが見つかりました。最初のサイトを更新します。');
    selectedSite = sites[0];
  }

  const fields = selectedSite.fields;
  console.log(`\n🎯 更新対象: ${fields.Name}`);

  if (!fields.URL) {
    console.log('❌ エラー: URLが設定されていません');
    return;
  }

  const newScreenshotUrl = generateScreenshotUrl(fields.URL);
  console.log(`📸 新しいスクショURL: ${newScreenshotUrl}`);

  console.log('\n更新中...');
  const success = await updateScreenshot(selectedSite.id, newScreenshotUrl);

  if (success) {
    console.log('✅ スクリーンショットURLを更新しました！');
    console.log('\n💡 画像が表示されるまで数分かかる場合があります。');
    console.log('   サイトをリロードして確認してください。');
  } else {
    console.log('❌ 更新に失敗しました');
  }
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
