const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// ランキングスコア計算関数（src/lib/airtable.ts:544-600と同じロジック）
function calculateRankingScore(reviewCount, avgRating) {
  let rankingScore = 0;

  if (reviewCount >= 3) {
    rankingScore = avgRating * Math.log10(reviewCount + 1) * 100;
  } else if (reviewCount > 0) {
    rankingScore = avgRating * reviewCount * 10;
  }

  return rankingScore;
}

(async () => {
  try {
    console.log('🏆 南関競馬カテゴリ ランキング分析\n');

    // 1. 全サイトを取得
    const allSitesRecords = await base('Sites').select({
      filterByFormula: 'AND({IsApproved} = TRUE(), {Category} = "nankan")',
      fields: ['Name', 'Slug', 'CreatedAt']
    }).all();

    console.log(`📊 南関競馬カテゴリの承認済みサイト数: ${allSitesRecords.length}件\n`);

    // 2. 全レビューを取得
    const allReviewsRecords = await base('Reviews').select({
      filterByFormula: '{IsApproved} = TRUE()',
      fields: ['Site', 'Rating']
    }).all();

    // 3. 各サイトのレビュー数と平均評価を計算
    const sitesWithStats = allSitesRecords.map(siteRecord => {
      const siteId = siteRecord.id;
      const siteName = siteRecord.fields.Name;
      const slug = siteRecord.fields.Slug;

      // このサイトのレビューをフィルター
      const siteReviews = allReviewsRecords.filter(reviewRecord => {
        const siteLinkField = reviewRecord.fields.Site;
        const linkedSiteId = Array.isArray(siteLinkField) ? siteLinkField[0] : siteLinkField;
        return linkedSiteId === siteId;
      });

      const reviewCount = siteReviews.length;
      const avgRating = reviewCount > 0
        ? siteReviews.reduce((sum, r) => sum + (r.fields.Rating || 0), 0) / reviewCount
        : 0;

      const rankingScore = calculateRankingScore(reviewCount, avgRating);

      return {
        id: siteId,
        name: siteName,
        slug,
        reviewCount,
        avgRating: avgRating.toFixed(2),
        rankingScore: rankingScore.toFixed(2),
        createdAt: siteRecord.fields.CreatedAt
      };
    });

    // 4. ランキングスコアでソート
    sitesWithStats.sort((a, b) => {
      const scoreDiff = parseFloat(b.rankingScore) - parseFloat(a.rankingScore);
      if (scoreDiff !== 0) return scoreDiff;

      const reviewDiff = b.reviewCount - a.reviewCount;
      if (reviewDiff !== 0) return reviewDiff;

      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    // 5. ランキング表示
    console.log('🏆 南関競馬カテゴリ ランキング TOP 10\n');
    console.log('順位 | サイト名 | 口コミ数 | 平均評価 | スコア');
    console.log('-'.repeat(80));

    sitesWithStats.slice(0, 10).forEach((site, index) => {
      const rank = index + 1;
      const isNankan = site.slug === 'apolon-keibanahibi-com';
      const marker = isNankan ? ' ⭐ nankan-analytics' : '';
      console.log(`${rank}位 | ${site.name}${marker}`);
      console.log(`     口コミ: ${site.reviewCount}件 | 平均: ${site.avgRating} | スコア: ${site.rankingScore}`);
    });

    // 6. nankan-analyticsの順位を探す
    const nankanIndex = sitesWithStats.findIndex(s => s.slug === 'apolon-keibanahibi-com');
    if (nankanIndex !== -1) {
      const nankanSite = sitesWithStats[nankanIndex];
      console.log('\n\n🎯 nankan-analytics (南関競馬な日々) の現在順位:\n');
      console.log(`  順位: ${nankanIndex + 1}位 / ${sitesWithStats.length}サイト中`);
      console.log(`  口コミ数: ${nankanSite.reviewCount}件`);
      console.log(`  平均評価: ${nankanSite.avgRating}`);
      console.log(`  ランキングスコア: ${nankanSite.rankingScore}`);

      if (nankanIndex > 0) {
        const topSite = sitesWithStats[0];
        console.log(`\n  🥇 1位のサイト: ${topSite.name}`);
        console.log(`     口コミ数: ${topSite.reviewCount}件`);
        console.log(`     平均評価: ${topSite.avgRating}`);
        console.log(`     ランキングスコア: ${topSite.rankingScore}`);

        const scoreDiff = parseFloat(topSite.rankingScore) - parseFloat(nankanSite.rankingScore);
        console.log(`\n  📊 1位との差: ${scoreDiff.toFixed(2)}ポイント`);
      } else {
        console.log('\n  🎉 すでに1位です！');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
})();
