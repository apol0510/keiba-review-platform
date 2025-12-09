/**
 * スクリーンショット自動取得 + Cloudinaryアップロード + Airtable更新
 *
 * 環境変数:
 * - AIRTABLE_API_KEY: Airtable APIキー
 * - AIRTABLE_BASE_ID: AirtableベースID
 * - CLOUDINARY_CLOUD_NAME: Cloudinaryクラウド名
 * - CLOUDINARY_API_KEY: Cloudinary APIキー
 * - CLOUDINARY_API_SECRET: Cloudinary APIシークレット
 */

const puppeteer = require('puppeteer');
const Airtable = require('airtable');
const cloudinary = require('cloudinary').v2;

// 環境変数
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Airtable接続
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Cloudinary設定
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

/**
 * スクリーンショットを取得してCloudinaryにアップロード
 */
async function captureAndUpload(browser, recordId, url, slug) {
  const page = await browser.newPage();

  try {
    console.log(`📸 ${slug}: ${url}`);

    // スクリーンショット取得
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });

    // Cloudinaryにアップロード
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'keiba-review-screenshots',
          public_id: slug,
          overwrite: true,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(screenshotBuffer);
    });

    console.log(`  ✅ Cloudinaryにアップロード: ${uploadResult.secure_url}`);

    // AirtableのScreenshotURLフィールドを更新
    await base('Sites').update(recordId, {
      ScreenshotURL: uploadResult.secure_url
    });

    console.log(`  ✅ Airtable更新完了`);

    return {
      success: true,
      url: uploadResult.secure_url,
      slug
    };

  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      slug
    };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 スクリーンショット自動取得を開始\n');

  // Cloudinary設定チェック
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary環境変数が設定されていません');
    console.log('必要な環境変数:');
    console.log('  - CLOUDINARY_CLOUD_NAME');
    console.log('  - CLOUDINARY_API_KEY');
    console.log('  - CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  // 承認済みサイトを取得（ScreenshotURLが空のものを優先）
  console.log('📊 承認済みサイトを取得中...\n');
  const records = await base('Sites').select({
    filterByFormula: 'AND({IsApproved} = TRUE(), {ScreenshotURL} = BLANK())',
    maxRecords: 20, // 一度に最大20サイトまで
  }).all();

  if (records.length === 0) {
    console.log('✅ スクリーンショットが未取得のサイトはありません');
    return;
  }

  console.log(`📝 ${records.length}サイトのスクリーンショットを取得します\n`);

  const sites = records.map(r => ({
    recordId: r.id,
    slug: r.fields.Slug,
    url: r.fields.URL,
  }));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = { success: 0, failed: 0, details: [] };

  // 3サイトずつ並行処理
  for (let i = 0; i < sites.length; i += 3) {
    const batch = sites.slice(i, i + 3);
    console.log(`\n【バッチ ${Math.floor(i / 3) + 1}】`);

    const batchResults = await Promise.all(
      batch.map(s => captureAndUpload(browser, s.recordId, s.url, s.slug))
    );

    batchResults.forEach(r => {
      if (r.success) {
        results.success++;
      } else {
        results.failed++;
      }
      results.details.push(r);
    });

    console.log(`\n進捗: ${Math.min(i + 3, sites.length)}/${sites.length}`);
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 実行結果');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success}件`);
  console.log(`❌ 失敗: ${results.failed}件`);

  if (results.failed > 0) {
    console.log('\n失敗したサイト:');
    results.details
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.slug}: ${r.error}`));
  }

  console.log('\n✨ 完了');
}

main().catch(error => {
  console.error('❌ 致命的なエラー:', error);
  process.exit(1);
});
