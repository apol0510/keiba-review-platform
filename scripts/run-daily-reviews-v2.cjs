/**
 * 毎日の口コミ自動投稿スクリプト v2
 *
 * 改善点:
 * 1. u85.jpの評価データに基づいた口コミ生成
 * 2. サイトの評価に応じた投稿頻度の調整
 * 3. より精密なサイト選択ロジック
 */

const { uploadReview } = require('./upload-adjusted-reviews.cjs');
const Airtable = require('airtable');
const fs = require('fs');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * 悪質サイトリストを読み込み（既存のsite-ratings.jsonを使用）
 */
function loadMaliciousSites() {
  const ratingPath = __dirname + '/config/site-ratings.json';

  if (!fs.existsSync(ratingPath)) {
    console.warn('⚠️  site-ratings.jsonが見つかりません');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(ratingPath, 'utf-8'));
  return data.malicious || [];
}

/**
 * サイトの評価を取得（悪質/優良/不明）
 */
function getSiteRating(siteName, maliciousSites) {
  // 悪質サイトリストに含まれているか確認
  const isMalicious = maliciousSites.some(maliciousName =>
    siteName.includes(maliciousName) || maliciousName.includes(siteName)
  );

  if (isMalicious) {
    return { type: 'malicious', score: 1.5 }; // 1-2★
  }

  // 優良サイトの判定（今後追加予定）
  // TODO: 優良サイトリストを作成

  // 不明サイト（デフォルト）
  return { type: 'unknown', score: 3.0 }; // 3★
}

/**
 * 評価タイプに応じた口コミテンプレート
 */
const reviewTemplates = {
  malicious: {
    titles: [
      '期待外れでした',
      '情報料が高すぎる',
      '的中率が低い',
      'おすすめできません',
      'サポート対応が悪い',
      '費用対効果が悪い',
      '信頼性に欠ける',
      '残念な結果に',
      '詐欺まがい',
      '全く当たらない'
    ],
    contents: [
      '情報料が非常に高いのに、予想の質が最低です。的中率も期待したほどではなく、費用対効果が悪いと感じました。',
      'サポート対応が全く機能していないです。問い合わせても返信がなく、不信感しかありません。',
      '無料情報はそこそこだったが、有料情報の精度が低く期待外れでした。高額な料金を払う価値はないと思います。',
      '的中率が著しく低く、何度か利用したが利益を出すことができませんでした。おすすめしません。',
      '高額な情報料を払ったのに外れてばかり。費用対効果を考えると全く割に合いません。',
      '情報の質が低く、サポートも悪い。二度と利用したくないです。',
      '的中しないばかりか、サポートに問い合わせても適当な対応しかされませんでした。',
      '無料予想で釣って高額な有料情報を売りつけてくるパターン。当たらないのでお金の無駄です。',
      '予想の根拠が曖昧で、的中率も低い。信頼できるサイトとは言えません。',
      '初回だけ当たって、その後は全く当たらない。典型的な悪質サイトだと思います。'
    ]
  },
  legit: {
    titles: [
      'まあまあ良い',
      '悪くないと思う',
      'そこそこの精度',
      '使いやすい',
      '期待できる',
      '信頼できると思う',
      '的中率が高め',
      'コスパが良い'
    ],
    contents: [
      'まあまあ良いサイトだと思います。無料予想の精度がそこそこ高く、有料情報も悪くないです。',
      '使いやすいインターフェースで、初心者にも分かりやすい。的中率もまあまあで悪くないと思います。',
      'サポート対応が丁寧で、問い合わせにも迅速に対応してくれます。信頼できるサイトだと感じました。',
      'そこそこの精度で的中することもあります。費用対効果を考えると悪くないサイトだと思います。',
      '無料予想をいくつか試しましたが、まあまあ当たる印象です。期待できるサイトだと思います。',
      '的中率が比較的高く、情報料も適正価格だと思います。コスパが良いサイトです。',
      '予想の根拠がしっかりしていて、信頼性が高いと感じました。長期的に利用したいサイトです。',
      'サポートが親切で、初心者でも安心して利用できます。的中率もそこそこ高いです。'
    ]
  },
  unknown: {
    titles: [
      '可もなく不可もなく',
      '普通の予想サイト',
      'まあまあの精度',
      '期待通りではなかった',
      '平均的なサービス',
      '特に不満はないが',
      'それなりの結果'
    ],
    contents: [
      '可もなく不可もなくといった印象。的中精度はそこそこですが、特別すごいわけではありません。',
      '無料予想を何度か試しましたが、平均的な精度です。期待しすぎると肩透かしを食らうかもしれません。',
      '普通の予想サイトだと思います。特に不満はありませんが、特別良いとも感じませんでした。',
      'まあまあの精度だと思います。的中することもあれば外れることもある、普通のサイトです。',
      'サポート対応は普通。可もなく不可もなくといった感じで、特筆すべき点はありません。',
      '期待通りではありませんでしたが、詐欺とまでは言えないレベル。普通のサイトだと思います。',
      'それなりの結果は出ていますが、劇的に儲かるわけではありません。平均的なサイトです。'
    ]
  }
};

/**
 * カテゴリ別のユーザー名プレフィックス
 */
const categoryUsernamePrefixes = {
  nankan: ['南関', 'NANKAN', '南関ファン', '大井', '川崎', '船橋', '浦和'],
  chuo: ['JRA', '中央', '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者'],
  chihou: ['地方競馬', 'NAR', '地方', '園田', '金沢', '名古屋', '高知'],
  other: ['競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者']
};

/**
 * 評価に基づいた口コミを生成
 */
function generateReviewByRating(siteName, rating, category = 'other') {
  const { type, score } = rating;
  const templates = reviewTemplates[type];

  // ランダムにタイトルと内容を選択
  const title = templates.titles[Math.floor(Math.random() * templates.titles.length)];
  const content = templates.contents[Math.floor(Math.random() * templates.contents.length)];

  // 星の数を決定
  let stars;
  if (type === 'malicious') {
    stars = Math.random() > 0.5 ? 1 : 2; // 1-2★
  } else if (type === 'legit') {
    stars = Math.random() > 0.5 ? 4 : 5; // 4-5★
  } else {
    stars = 3; // 3★
  }

  // カテゴリに応じたユーザー名を生成
  const prefixes = categoryUsernamePrefixes[category] || categoryUsernamePrefixes.other;
  const usernamePrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const usernameSuffix = ['太郎', 'さん', 'ユーザー', '好き', 'マニア', '愛好家', '馬券師'];
  const username = `${usernamePrefix}${usernameSuffix[Math.floor(Math.random() * usernameSuffix.length)]}${Math.floor(Math.random() * 100)}`;

  return {
    rating: stars,
    title,
    content,
    username
  };
}

/**
 * 投稿すべきサイトを選択
 */
async function selectSitesToPost(maliciousSites, maxSites = 5) {
  console.log('📊 投稿対象サイトを選択中...\n');

  // 全サイトを取得
  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

  // 各サイトの口コミ数を取得
  const sitesWithReviewCount = await Promise.all(
    allSites.map(async (siteRecord) => {
      const reviews = siteRecord.fields.Reviews || [];
      const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

      const rating = getSiteRating(siteRecord.fields.Name, maliciousSites);

      return {
        id: siteRecord.id,
        name: siteRecord.fields.Name,
        category: siteRecord.fields.Category || 'other',
        reviewCount,
        rating
      };
    })
  );

  // 投稿頻度を決定
  const sitesWithPriority = sitesWithReviewCount.map(site => {
    let reviewsToPost = 1;

    // 評価タイプに応じた投稿数
    if (site.rating.type === 'malicious') {
      reviewsToPost = Math.floor(Math.random() * 2) + 1; // 1-2件
    } else if (site.rating.type === 'legit') {
      reviewsToPost = Math.floor(Math.random() * 3) + 3; // 3-5件
    } else {
      reviewsToPost = Math.floor(Math.random() * 2) + 2; // 2-3件
    }

    // 優先度を計算（口コミが少ないサイトを優先）
    const priority = 1000 - site.reviewCount + Math.random() * 100;

    return {
      ...site,
      reviewsToPost,
      priority
    };
  });

  // 優先度順にソート
  sitesWithPriority.sort((a, b) => b.priority - a.priority);

  // 上位maxSites件を選択
  return sitesWithPriority.slice(0, maxSites);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 毎日の口コミ自動投稿を開始 (v2)\n');

  // 悪質サイトリストを読み込み
  const maliciousSites = loadMaliciousSites();

  console.log('✅ 悪質サイトリストを読み込みました');
  console.log(`  悪質サイト: ${maliciousSites.length}件\n`);

  // 投稿対象サイトを選択
  const targetSites = await selectSitesToPost(maliciousSites, 5);

  console.log(`📝 ${targetSites.length}サイトに口コミを投稿します:\n`);
  targetSites.forEach((site, i) => {
    const typeLabel = site.rating.type === 'malicious' ? '❌悪質' :
                      site.rating.type === 'legit' ? '✅優良' : '⚪不明';
    console.log(`  ${i + 1}. ${typeLabel} ${site.name} (現在${site.reviewCount}件 → +${site.reviewsToPost}件)`);
  });
  console.log('');

  let totalReviews = 0;
  let successCount = 0;

  for (const site of targetSites) {
    console.log(`\n🎯 ${site.name} に口コミを投稿中...`);
    console.log(`   カテゴリ: ${site.category}, タイプ: ${site.rating.type}, 評価スコア: ${site.rating.score}`);

    for (let i = 0; i < site.reviewsToPost; i++) {
      const review = generateReviewByRating(site.name, site.rating, site.category);

      console.log(`  ${i + 1}/${site.reviewsToPost}: [${review.rating}★] ${review.title}`);

      // Airtableに登録（自動承認）
      const reviewId = await uploadReview(review, site.id, true);

      if (reviewId) {
        console.log(`    ✅ 登録成功`);
        successCount++;
      } else {
        console.log(`    ❌ 登録失敗`);
      }

      totalReviews++;

      // レート制限を避けるため待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n\n✅ 毎日の口コミ投稿完了\n');
  console.log('📊 結果サマリー:');
  console.log(`  対象サイト: ${targetSites.length}サイト`);
  console.log(`  投稿口コミ: ${totalReviews}件`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${totalReviews - successCount}件`);
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateReviewByRating, selectSitesToPost };
