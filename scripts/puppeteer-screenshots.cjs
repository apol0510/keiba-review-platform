/**
 * 全サイトのスクリーンショットを自動取得
 */

const puppeteer = require('puppeteer');
const Airtable = require('airtable');
const fs = require('fs').promises;
const path = require('path');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

async function captureScreenshot(browser, url, slug) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${slug}.png`),
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });
    console.log(`✅ ${slug}: ${url}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ ${slug}: ${error.message}`);
    return { success: false };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 スクリーンショット取得開始\n');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
  }).all();
  
  const sites = records.map(r => ({
    slug: r.fields.Slug,
    url: r.fields.URL,
  }));
  
  const browser = await puppeteer.launch({ headless: true });
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < sites.length; i += 3) {
    const batch = sites.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(s => captureScreenshot(browser, s.url, s.slug))
    );
    batchResults.forEach(r => r.success ? results.success++ : results.failed++);
    console.log(`進捗: ${i + 3}/${sites.length}`);
  }
  
  await browser.close();
  console.log(`\n✅ 成功: ${results.success}, ❌ 失敗: ${results.failed}`);
}

main().catch(console.error);
