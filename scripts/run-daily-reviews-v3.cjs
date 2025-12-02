/**
 * 毎日の口コミ自動投稿スクリプト v3（カスタム口コミ対応）
 *
 * 改善点:
 * 1. テキストファイルから高品質な口コミを読み込み
 * 2. 評価別（⭐1〜5）に適切な口コミを選択
 * 3. 重複を避けるランダム選択
 * 4. より自然でリアルな口コミ投稿
 */

const { uploadReview } = require('./upload-adjusted-reviews.cjs');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// Airtable設定
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

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
 * カテゴリ別の禁止ワード
 */
const categoryForbiddenWords = {
  chuo: [
    // 南関競馬関連
    'ナイター競馬', 'ナイター', '南関', 'NANKAN', '南関競馬',
    '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬',
    '大井', '川崎', '船橋', '浦和',
    'TCK', // 東京シティ競馬（大井）

    // 地方競馬関連
    '地方競馬', 'NAR', '園田', '金沢', '名古屋', '高知',
    '笠松', '門別', '盛岡', '水沢', '浦和', '船橋',
    'ばんえい', 'ホッカイドウ競馬'
  ],
  nankan: [
    // 中央競馬関連（南関競馬に不要）
    'G1', 'GⅠ', 'G2', 'GⅡ', 'G3', 'GⅢ',
    '有馬記念', '日本ダービー', '天皇賞', '宝塚記念',
    '菊花賞', '皐月賞', '桜花賞', 'オークス',
    '東京競馬場', '中山競馬場', '阪神競馬場', '京都競馬場',
    '中京競馬場', '新潟競馬場', '福島競馬場', '小倉競馬場'
  ],
  chihou: [
    // 中央競馬関連
    'JRA', 'G1', 'GⅠ', '有馬記念', '日本ダービー',

    // 南関競馬関連（他の地方競馬に不要）
    '南関', 'NANKAN', '南関競馬', 'TCK'
  ]
};

/**
 * 自動投稿専用のNGワード（具体的なサービス批判を避ける）
 */
const autoPostForbiddenWords = [
  // サポート関連
  'サポート', '対応が遅い', '返信がない', '連絡が取れない', '問い合わせ',

  // 詐欺・悪質系
  '詐欺', '騙された', '悪質', '詐欺サイト', '詐欺まがい',

  // 具体的批判
  '最悪', 'ひどい', '金返せ', '返金', '被害',
  '訴える', '通報', '警察', '弁護士'
];

/**
 * 口コミに禁止ワードが含まれているかチェック
 */
function containsForbiddenWords(text, category) {
  const forbiddenWords = categoryForbiddenWords[category] || [];

  for (const word of forbiddenWords) {
    if (text.includes(word)) {
      return true;
    }
  }

  return false;
}

/**
 * 自動投稿用の禁止ワードチェック
 */
function containsAutoPostForbiddenWords(text) {
  for (const word of autoPostForbiddenWords) {
    if (text.includes(word)) {
      return true;
    }
  }
  return false;
}

/**
 * テキストファイルから口コミを読み込み
 */
function loadReviewsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ファイルが見つかりません: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const reviews = [];

  // 空行で区切られた口コミをパース
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(line => line.trim());

    // 最初の行が番号（001, 002等）の場合はスキップ
    let startIndex = 0;
    if (lines[0] && /^\d+$/.test(lines[0].trim())) {
      startIndex = 1;
    }

    // ヘッダー行（⭐5（ややポジティブ）等）もスキップ
    if (lines[startIndex] && lines[startIndex].includes('⭐')) {
      startIndex++;
    }

    if (lines.length > startIndex) {
      // 最初の行をタイトルとして扱う
      const title = lines[startIndex].substring(0, 30); // タイトルは最大30文字
      const content = lines.slice(startIndex).join(''); // すべてを本文として結合

      if (content.length >= 50) { // 最低50文字
        reviews.push({ title, content });
      }
    }
  }

  return reviews;
}

/**
 * 評価別の口コミファイルを読み込み
 * ⭐5は使用しない（過剰なポジティブ評価を避ける）
 */
function loadAllReviews() {
  const reviewsDir = path.join(__dirname, 'reviews-data');

  const reviewFiles = {
    1: path.join(reviewsDir, '⭐1（辛口／クレーム寄り）.txt'),
    2: path.join(reviewsDir, '⭐2（少し辛口寄り）.txt'),
    3: path.join(reviewsDir, '⭐3（ニュートラル）.txt'),
    4: path.join(reviewsDir, '⭐4（少しポジティブ寄り）.txt')
    // ⭐5は使用しない
  };

  const allReviews = {};

  for (const [rating, filePath] of Object.entries(reviewFiles)) {
    allReviews[rating] = loadReviewsFromFile(filePath);
    console.log(`  ⭐${rating}: ${allReviews[rating].length}件の口コミを読み込み`);
  }

  return allReviews;
}

/**
 * 悪質サイトリストを読み込み
 */
function loadMaliciousSites() {
  const ratingPath = path.join(__dirname, 'config/site-ratings.json');

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
  const isMalicious = maliciousSites.some(maliciousName =>
    siteName.includes(maliciousName) || maliciousName.includes(siteName)
  );

  if (isMalicious) {
    return { type: 'malicious', starRange: [1, 3] }; // 1-3★（⭐4と⭐5は使用禁止）
  }

  // TODO: 優良サイト判定（将来実装）

  // 通常サイト（デフォルト）
  // ⭐2-4でランダム選択し、平均3程度になるように調整
  return { type: 'normal', starRange: [2, 4] }; // 2-4★（⭐5は使用禁止）
}

/**
 * 評価に基づいた口コミを生成
 */
function generateReviewByRating(siteName, rating, category, allReviews) {
  const { type, starRange } = rating;

  // 星の数を決定
  const stars = starRange[0] === starRange[1]
    ? starRange[0]
    : Math.floor(Math.random() * (starRange[1] - starRange[0] + 1)) + starRange[0];

  // 該当する評価の口コミリストを取得
  const reviewList = allReviews[stars];

  if (!reviewList || reviewList.length === 0) {
    console.warn(`⚠️  ⭐${stars}の口コミが見つかりません。デフォルトを使用します。`);
    return {
      rating: stars,
      title: '普通のサイト',
      content: '可もなく不可もなくといった印象です。',
      username: 'ユーザー' + Math.floor(Math.random() * 100)
    };
  }

  // カテゴリに適した口コミを探す（最大20回試行）
  let selectedReview = null;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const candidate = reviewList[Math.floor(Math.random() * reviewList.length)];
    const fullText = candidate.title + ' ' + candidate.content;

    // カテゴリ別禁止ワードチェック
    if (containsForbiddenWords(fullText, category)) {
      attempts++;
      continue;
    }

    // 自動投稿用禁止ワードチェック（サポート批判など）
    if (containsAutoPostForbiddenWords(fullText)) {
      attempts++;
      continue;
    }

    // 両方のチェックをパスした
    selectedReview = candidate;
    break;
  }

  // 適切な口コミが見つからない場合はデフォルト
  if (!selectedReview) {
    console.warn(`⚠️  カテゴリ「${category}」に適した⭐${stars}の口コミが見つかりませんでした。デフォルトを使用します。`);
    return {
      rating: stars,
      title: '普通のサイト',
      content: '可もなく不可もなくといった印象です。',
      username: 'ユーザー' + Math.floor(Math.random() * 100)
    };
  }

  // カテゴリに応じたユーザー名を生成
  const prefixes = categoryUsernamePrefixes[category] || categoryUsernamePrefixes.other;
  const usernamePrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const usernameSuffix = ['太郎', 'さん', 'ユーザー', '好き', 'マニア', '愛好家', '馬券師', 'ファン'];
  const username = `${usernamePrefix}${usernameSuffix[Math.floor(Math.random() * usernameSuffix.length)]}${Math.floor(Math.random() * 100)}`;

  return {
    rating: stars,
    title: selectedReview.title,
    content: selectedReview.content,
    username
  };
}

/**
 * 投稿すべきサイトを選択
 */
async function selectSitesToPost(maliciousSites, maxSites = 5) {
  console.log('📊 投稿対象サイトを選択中...\n');

  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

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

  sitesWithPriority.sort((a, b) => b.priority - a.priority);

  return sitesWithPriority.slice(0, maxSites);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 毎日の口コミ自動投稿を開始 (v3 - カスタム口コミ対応)\n');

  // カスタム口コミを読み込み
  console.log('📚 カスタム口コミを読み込み中...\n');
  const allReviews = loadAllReviews();

  const totalReviewsCount = Object.values(allReviews).reduce((sum, reviews) => sum + reviews.length, 0);
  console.log(`\n✅ 合計 ${totalReviewsCount}件の口コミを読み込みました\n`);

  // 悪質サイトリストを読み込み
  const maliciousSites = loadMaliciousSites();
  console.log(`✅ 悪質サイト: ${maliciousSites.length}件\n`);

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
    console.log(`   カテゴリ: ${site.category}, タイプ: ${site.rating.type}`);

    for (let i = 0; i < site.reviewsToPost; i++) {
      const review = generateReviewByRating(site.name, site.rating, site.category, allReviews);

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

module.exports = { generateReviewByRating, selectSitesToPost, loadAllReviews };
