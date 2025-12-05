const puppeteer = require('puppeteer');
const Airtable = require('airtable');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

// u85.jpから口コミを収集する関数
async function scrapeReviewsFromU85(siteUrl) {
  console.log(`\n🔍 ${siteUrl} から口コミを収集中...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(siteUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // ページタイトルからサイト名を取得
    const siteName = await page.evaluate(() => {
      const titleElement = document.querySelector('h1.entry-title');
      return titleElement ? titleElement.textContent.trim() : '';
    });

    console.log(`  📝 サイト名: ${siteName}`);

    // 平均評価を取得
    const averageRating = await page.evaluate(() => {
      const ratingText = document.body.textContent.match(/平均([\d.]+)\/3/);
      if (ratingText) {
        const rating = parseFloat(ratingText[1]);
        // 3段階評価を5段階に変換
        return Math.round((rating / 3) * 5 * 10) / 10;
      }
      return 3.0; // デフォルト値
    });

    console.log(`  ⭐ 平均評価: ${averageRating}/5.0`);

    // 口コミを収集
    const reviews = await page.evaluate(() => {
      const reviewElements = [];

      // メインコンテンツエリアから口コミを探す
      const contentDiv = document.querySelector('.entry-content');
      if (!contentDiv) return [];

      // すべてのpタグを取得（口コミ本文の可能性）
      const paragraphs = contentDiv.querySelectorAll('p');
      const reviewList = [];

      paragraphs.forEach((p, index) => {
        const text = p.textContent.trim();

        // 口コミらしいテキストを判定
        // - 50文字以上
        // - URLを含まない
        // - 「投稿日」「最新投稿日」を含まない
        if (text.length >= 50 &&
            text.length <= 500 &&
            !text.includes('http') &&
            !text.includes('投稿日') &&
            !text.includes('最新投稿日') &&
            !text.includes('匿名で投稿') &&
            !text.includes('件のコメント') &&
            !text.includes('メールアドレス')) {

          reviewList.push({
            content: text,
            index: index
          });
        }
      });

      return reviewList.slice(0, 10); // 最大10件
    });

    console.log(`  ✅ ${reviews.length}件の口コミを収集しました`);

    return {
      siteName,
      siteUrl,
      averageRating,
      reviews: reviews.map(r => r.content),
      source: 'u85.jp'
    };

  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

// メイン関数
async function main() {
  console.log('🚀 u85.jpから口コミを収集開始\n');

  // 収集対象のURL（例）
  const targetUrls = [
    'https://u85.jp/umasera-com/',
    'https://u85.jp/turfvision/',
    'https://u85.jp/keiba-hikaku-com/',
    'https://u85.jp/keiba-best/',
    'https://u85.jp/keibadouga/'
  ];

  const allScrapedData = [];

  for (const url of targetUrls) {
    const data = await scrapeReviewsFromU85(url);
    if (data && data.reviews.length > 0) {
      allScrapedData.push(data);
    }

    // レート制限を避けるため待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 結果を保存
  const outputPath = '/tmp/scraped-reviews-u85.json';
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(allScrapedData, null, 2));

  console.log(`\n✅ 収集完了: ${allScrapedData.length}サイト、合計${allScrapedData.reduce((sum, d) => sum + d.reviews.length, 0)}件の口コミ`);
  console.log(`📁 保存先: ${outputPath}`);

  // サマリー表示
  console.log('\n📊 収集サマリー:');
  allScrapedData.forEach(data => {
    console.log(`  - ${data.siteName}: ${data.reviews.length}件 (⭐${data.averageRating}/5.0)`);
  });
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { scrapeReviewsFromU85 };
