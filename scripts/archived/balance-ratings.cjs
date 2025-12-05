#!/usr/bin/env node

/**
 * 口コミ評価バランス調整スクリプト
 *
 * 平均3.2を超えるサイトに低評価（⭐2または⭐3）を追加投稿して
 * 全体平均を2.8~3.2の範囲に調整
 */

const Airtable = require('airtable');
const { uploadReview } = require('./upload-adjusted-reviews.cjs');
const fs = require('fs');
const path = require('path');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// 口コミデータ読み込み
function loadReviewsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = content.split('\n\n').filter(block => block.trim());

  return blocks.map(block => {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length >= 2) {
      return {
        title: lines[0].trim(),
        content: lines[1].trim()
      };
    }
    return null;
  }).filter(review => review !== null);
}

async function main() {
  console.log('🔄 口コミ評価バランス調整を開始\n');

  // 低評価口コミを読み込み
  const reviewsDir = path.join(__dirname, 'reviews-data');
  const star2Reviews = loadReviewsFromFile(path.join(reviewsDir, '⭐2（少し辛口寄り）.txt'));
  const star3Reviews = loadReviewsFromFile(path.join(reviewsDir, '⭐3（ニュートラル）.txt'));

  console.log(`✅ ⭐2口コミ: ${star2Reviews.length}件`);
  console.log(`✅ ⭐3口コミ: ${star3Reviews.length}件\n`);

  // 承認済みサイトを取得
  const sites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'Category']
  }).all();

  console.log(`📊 対象サイト: ${sites.length}件\n`);

  const highRatingSites = [];

  // 各サイトの平均評価を計算
  for (const site of sites) {
    const siteName = site.get('Name');
    const reviews = await base('Reviews').select({
      filterByFormula: `{Site} = "${siteName}"`,
      fields: ['Rating']
    }).all();

    if (reviews.length >= 3) {
      const ratings = reviews.map(r => r.get('Rating') || 0);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      if (avg > 3.2) {
        highRatingSites.push({
          id: site.id,
          name: siteName,
          category: site.get('Category') || 'chuo',
          avg,
          count: reviews.length
        });
      }
    }
  }

  highRatingSites.sort((a, b) => b.avg - a.avg);

  console.log(`🎯 平均3.2超のサイト: ${highRatingSites.length}件\n`);

  let posted = 0;

  for (const site of highRatingSites.slice(0, 20)) {
    console.log(`\n📝 ${site.name} (平均${site.avg.toFixed(2)})`);

    // 平均に応じて投稿数を決定
    const reviewsToPost = site.avg > 3.8 ? 2 : 1;

    for (let i = 0; i < reviewsToPost; i++) {
      // ⭐2か⭐3をランダム選択（70%の確率で⭐2）
      const rating = Math.random() < 0.7 ? 2 : 3;
      const reviewList = rating === 2 ? star2Reviews : star3Reviews;
      const review = reviewList[Math.floor(Math.random() * reviewList.length)];

      const username = `競馬ファン${Math.floor(Math.random() * 999)}`;

      const reviewData = {
        rating,
        title: review.title,
        content: review.content,
        username
      };

      console.log(`  ${i + 1}/${reviewsToPost}: ⭐${rating} - ${review.title.substring(0, 20)}...`);

      const reviewId = await uploadReview(reviewData, site.id, true);

      if (reviewId) {
        console.log(`    ✅ 投稿成功`);
        posted++;
      } else {
        console.log(`    ❌ 投稿失敗`);
      }

      // レート制限回避
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n🎉 完了: ${posted}件の低評価口コミを追加しました`);
}

main().catch(console.error);
