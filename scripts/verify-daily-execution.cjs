/**
 * 毎日の自動実行後の検証スクリプト
 *
 * 目的:
 * 1. スクリプトが「成功」と報告しても、実際にAirtableにデータが登録されているか検証
 * 2. SiteQualityフィールドが正しく読み込まれているか検証
 * 3. 優良サイトに⭐2以下が投稿されていないか検証
 * 4. エラーがあれば詳細なレポートを生成
 *
 * 実行タイミング:
 * - GitHub Actions の auto-post-reviews.yml の最後に追加
 * - 毎日の口コミ投稿後に自動実行
 */

const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// 今日の日付（JST）
const today = new Date();
const todayJST = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC → JST
const todayStr = todayJST.toISOString().split('T')[0]; // YYYY-MM-DD

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 毎日の自動実行後の検証を開始');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`📅 検証対象日: ${todayStr} (JST)\n`);

// エラーカウンター
let errorCount = 0;
const errors = [];

/**
 * エラーを記録
 */
function recordError(severity, category, message, details = {}) {
  errorCount++;
  errors.push({
    severity,    // 'CRITICAL' | 'WARNING' | 'INFO'
    category,    // 'DATA_CONSISTENCY' | 'SITEQUALITY' | 'RATING_VIOLATION' | 'COUNT_MISMATCH'
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

/**
 * 検証1: 今日の口コミが実際に登録されているか
 */
async function verifyTodayReviews() {
  console.log('1️⃣ 今日の口コミ登録状況を確認中...\n');

  try {
    const allReviews = await base('Reviews').select({
      sort: [{ field: 'CreatedAt', direction: 'desc' }],
      maxRecords: 500
    }).all();

    // 今日の口コミをフィルター（テスト投稿を除外）
    const todaysReviews = allReviews.filter(r => {
      const createdAt = r.fields.CreatedAt;
      if (!createdAt) return false;

      // テスト投稿を除外
      const title = r.fields.Title || '';
      const userName = r.fields.UserName || '';
      const content = r.fields.Content || '';
      const isTestReview =
        title.includes('テスト') ||
        userName.includes('テスト') ||
        content.includes('これはテスト投稿です');

      if (isTestReview) {
        console.log(`   ⏭️  テスト投稿をスキップ: ${title}`);
        return false;
      }

      // UTC → JST変換
      const createdDate = new Date(createdAt);
      const createdJST = new Date(createdDate.getTime() + (9 * 60 * 60 * 1000));
      const createdDateStr = createdJST.toISOString().split('T')[0];

      return createdDateStr === todayStr;
    });

    console.log(`   ✅ 今日投稿された口コミ: ${todaysReviews.length}件\n`);

    if (todaysReviews.length === 0) {
      recordError(
        'CRITICAL',
        'COUNT_MISMATCH',
        '今日の口コミが1件も見つかりません',
        {
          expectedMinimum: 1,
          actual: 0,
          searchDate: todayStr
        }
      );
    } else if (todaysReviews.length < 10) {
      recordError(
        'WARNING',
        'COUNT_MISMATCH',
        `今日の口コミ数が少ない可能性があります（${todaysReviews.length}件）`,
        {
          expectedMinimum: 10,
          actual: todaysReviews.length
        }
      );
    }

    return todaysReviews;
  } catch (error) {
    recordError(
      'CRITICAL',
      'DATA_CONSISTENCY',
      'Airtableからの口コミ取得に失敗',
      { error: error.message }
    );
    return [];
  }
}

/**
 * 検証2: SiteQualityフィールドが正しく読み込まれているか
 */
async function verifySiteQualityIntegrity() {
  console.log('2️⃣ SiteQualityフィールドの整合性を確認中...\n');

  try {
    // 優良サイトを取得
    const excellentSites = await base('Sites').select({
      filterByFormula: 'AND({IsApproved} = TRUE(), {SiteQuality} = "excellent")',
      fields: ['Name', 'SiteQuality', 'Reviews']
    }).all();

    console.log(`   📊 優良サイト登録数: ${excellentSites.length}件\n`);

    if (excellentSites.length === 0) {
      recordError(
        'WARNING',
        'SITEQUALITY',
        '優良サイト（excellent）が1件も登録されていません',
        { hint: 'Airtableで🏆南関競馬な日々🏆のSiteQualityを"excellent"に設定してください' }
      );
    }

    // 悪質サイトを取得
    const maliciousSites = await base('Sites').select({
      filterByFormula: 'AND({IsApproved} = TRUE(), {SiteQuality} = "malicious")',
      fields: ['Name', 'SiteQuality']
    }).all();

    console.log(`   📊 悪質サイト登録数: ${maliciousSites.length}件\n`);

    return { excellentSites, maliciousSites };
  } catch (error) {
    recordError(
      'CRITICAL',
      'SITEQUALITY',
      'SiteQualityフィールドの読み込みに失敗',
      { error: error.message }
    );
    return { excellentSites: [], maliciousSites: [] };
  }
}

/**
 * 検証3: 優良サイトに⭐2以下が投稿されていないか
 */
async function verifyExcellentSiteRatings(todaysReviews, excellentSites) {
  console.log('3️⃣ 優良サイトの評価範囲を確認中...\n');

  if (excellentSites.length === 0) {
    console.log('   ⚠️  優良サイトが登録されていないため、スキップします\n');
    return;
  }

  const excellentSiteIds = excellentSites.map(s => s.id);

  // 今日投稿された優良サイトの口コミをチェック
  for (const review of todaysReviews) {
    const siteIds = review.fields.Site || [];
    const rating = review.fields.Rating;

    // このレビューが優良サイトのものか確認
    const isExcellentSite = siteIds.some(id => excellentSiteIds.includes(id));

    if (isExcellentSite) {
      // 優良サイトの口コミを取得
      const siteName = await getSiteName(siteIds[0]);

      if (rating < 3) {
        recordError(
          'CRITICAL',
          'RATING_VIOLATION',
          `優良サイト「${siteName}」に⭐${rating}が投稿されています（⭐3-4のみのはず）`,
          {
            siteName,
            siteId: siteIds[0],
            reviewId: review.id,
            rating,
            expectedRange: [3, 4],
            reviewTitle: review.fields.Title
          }
        );
      } else {
        console.log(`   ✅ ${siteName}: ⭐${rating} (正常)`);
      }
    }
  }

  console.log('\n');
}

/**
 * 検証4: 悪質サイトに⭐4以上が投稿されていないか
 */
async function verifyMaliciousSiteRatings(todaysReviews, maliciousSites) {
  console.log('4️⃣ 悪質サイトの評価範囲を確認中...\n');

  if (maliciousSites.length === 0) {
    console.log('   ℹ️  悪質サイトが登録されていないため、スキップします\n');
    return;
  }

  const maliciousSiteIds = maliciousSites.map(s => s.id);

  // 今日投稿された悪質サイトの口コミをチェック
  for (const review of todaysReviews) {
    const siteIds = review.fields.Site || [];
    const rating = review.fields.Rating;

    // このレビューが悪質サイトのものか確認
    const isMaliciousSite = siteIds.some(id => maliciousSiteIds.includes(id));

    if (isMaliciousSite) {
      const siteName = await getSiteName(siteIds[0]);

      if (rating >= 4) {
        recordError(
          'CRITICAL',
          'RATING_VIOLATION',
          `悪質サイト「${siteName}」に⭐${rating}が投稿されています（⭐1-3のみのはず）`,
          {
            siteName,
            siteId: siteIds[0],
            reviewId: review.id,
            rating,
            expectedRange: [1, 3],
            reviewTitle: review.fields.Title
          }
        );
      }
    }
  }

  console.log('\n');
}

/**
 * 検証5: ⭐5が使用されていないか
 */
async function verifyStar5NotUsed(todaysReviews) {
  console.log('5️⃣ ⭐5の使用状況を確認中...\n');

  const star5Reviews = todaysReviews.filter(r => r.fields.Rating === 5);

  if (star5Reviews.length > 0) {
    recordError(
      'CRITICAL',
      'RATING_VIOLATION',
      `⭐5が${star5Reviews.length}件使用されています（⭐5は使用禁止）`,
      {
        count: star5Reviews.length,
        reviewIds: star5Reviews.map(r => r.id)
      }
    );
    console.log(`   ❌ ⭐5が使用されています: ${star5Reviews.length}件\n`);
  } else {
    console.log('   ✅ ⭐5は使用されていません\n');
  }
}

/**
 * サイト名を取得するヘルパー関数
 */
async function getSiteName(siteId) {
  try {
    const site = await base('Sites').find(siteId);
    return site.fields.Name || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * エラーレポートを生成
 */
function generateErrorReport() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 検証結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errorCount === 0) {
    console.log('✅ すべての検証に合格しました！\n');
    console.log('   - 今日の口コミは正しく登録されています');
    console.log('   - SiteQualityフィールドは正しく機能しています');
    console.log('   - 評価範囲の違反はありません');
    console.log('   - ⭐5は使用されていません\n');
    return 0; // 成功
  }

  console.log(`❌ ${errorCount}件のエラーが検出されました\n`);

  // 重要度別に分類
  const critical = errors.filter(e => e.severity === 'CRITICAL');
  const warnings = errors.filter(e => e.severity === 'WARNING');
  const info = errors.filter(e => e.severity === 'INFO');

  if (critical.length > 0) {
    console.log(`🚨 致命的エラー: ${critical.length}件`);
    critical.forEach((err, i) => {
      console.log(`\n   ${i + 1}. [${err.category}] ${err.message}`);
      if (Object.keys(err.details).length > 0) {
        console.log(`      詳細: ${JSON.stringify(err.details, null, 2)}`);
      }
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  警告: ${warnings.length}件`);
    warnings.forEach((err, i) => {
      console.log(`\n   ${i + 1}. [${err.category}] ${err.message}`);
      if (Object.keys(err.details).length > 0) {
        console.log(`      詳細: ${JSON.stringify(err.details, null, 2)}`);
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 推奨される対応');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. Airtableで以下を確認してください:');
  console.log('   - SiteQualityフィールドが正しく設定されているか');
  console.log('   - 🏆南関競馬な日々🏆が"excellent"に設定されているか');
  console.log('   - 悪質サイトが"malicious"に設定されているか\n');

  console.log('2. スクリプトのバージョンを確認してください:');
  console.log('   - 最新のrun-daily-reviews-v3.cjsが使用されているか');
  console.log('   - GitHubリポジトリが最新版に更新されているか\n');

  console.log('3. 次回の自動実行を確認してください:');
  console.log('   - 次回実行: 明日04:00 JST');
  console.log('   - GitHub Actions ログを確認\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return critical.length > 0 ? 1 : 0; // 致命的エラーがあれば終了コード1
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 検証1: 今日の口コミ
    const todaysReviews = await verifyTodayReviews();

    // 検証2: SiteQuality
    const { excellentSites, maliciousSites } = await verifySiteQualityIntegrity();

    // 検証3: 優良サイトの評価範囲
    await verifyExcellentSiteRatings(todaysReviews, excellentSites);

    // 検証4: 悪質サイトの評価範囲
    await verifyMaliciousSiteRatings(todaysReviews, maliciousSites);

    // 検証5: ⭐5の使用状況
    await verifyStar5NotUsed(todaysReviews);

    // レポート生成
    const exitCode = generateErrorReport();
    process.exit(exitCode);

  } catch (error) {
    console.error('\n🚨 検証中に予期しないエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

main();
