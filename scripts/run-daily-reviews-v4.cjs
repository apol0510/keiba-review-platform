/**
 * 毎日の口コミ自動投稿スクリプト v4（5タイプ対応）
 *
 * v4の変更点:
 * 1. SiteQuality を 3タイプ → 5タイプに拡張
 * 2. premium: ⭐3-5（毎日100%、南関アナリティクス専用）
 * 3. excellent: ⭐3-4（ほぼ毎日80%）
 * 4. normal: ⭐2-4（約5日に1回20%）
 * 5. poor: ⭐1-3（約7日に1回14%）
 * 6. malicious: ⭐1-2（約10日に1回10%）
 * 7. 口コミテンプレート500件に倍増対応
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

// 最近使用したユーザー名を記録（重複防止）
const recentUsernames = new Set();

/**
 * サイトタイプ別の口コミ上限設定
 */
const MAX_REVIEWS_PER_SITE = {
  premium: 100,    // 🌟 最高品質: 最大100件（南関アナリティクス専用）
  excellent: 80,   // ✅ 優良サイト: 最大80件
  normal: 30,      // ⚪ 通常サイト: 最大30件
  poor: 40,        // ⚠️ 低品質サイト: 最大40件
  malicious: 50    // ❌ 悪質サイト: 最大50件
};

/**
 * 投稿確率設定（Airtableの SiteQuality に基づく）
 */
const POSTING_FREQUENCY = {
  premium: 1.0,      // 100% (毎日)
  excellent: 0.8,    // 80% (ほぼ毎日、5日で4回)
  normal: 0.2,       // 20% (約5日に1回)
  poor: 0.14,        // 14% (約7日に1回)
  malicious: 0.1     // 10% (約10日に1回)
};

/**
 * カテゴリ別の禁止ワード
 */
const categoryForbiddenWords = {
  chuo: [
    'ナイター競馬', 'ナイター', '南関', 'NANKAN', '南関競馬',
    '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬',
    '大井', '川崎', '船橋', '浦和', 'TCK',
    '地方競馬', '地方', 'NAR', '園田', '金沢', '名古屋', '高知',
    '笠松', '門別', '盛岡', '水沢', 'ばんえい', 'ホッカイドウ競馬'
  ],
  nankan: [
    'G1', 'GⅠ', 'G2', 'GⅡ', 'G3', 'GⅢ',
    '有馬記念', '日本ダービー', '天皇賞', '宝塚記念',
    '菊花賞', '皐月賞', '桜花賞', 'オークス',
    '東京競馬場', '中山競馬場', '阪神競馬場', '京都競馬場',
    '中京競馬場', '新潟競馬場', '福島競馬場', '小倉競馬場'
  ],
  chihou: [
    'JRA', 'G1', 'GⅠ', '有馬記念', '日本ダービー',
    '南関', 'NANKAN', '南関競馬', 'TCK'
  ]
};

/**
 * 自動投稿専用のNGワード
 */
const autoPostForbiddenWords = [
  'サポート', '対応が遅い', '返信がない', '連絡が取れない', '問い合わせ',
  '詐欺', '騙された', '悪質', '詐欺サイト', '詐欺まがい',
  '最悪', 'ひどい', '金返せ', '返金', '被害',
  '訴える', '通報', '警察', '弁護士'
];

/**
 * 口コミに禁止ワードが含まれているかチェック
 */
function containsForbiddenWords(text, category) {
  const forbiddenWords = categoryForbiddenWords[category] || [];
  for (const word of forbiddenWords) {
    if (text.includes(word)) return true;
  }
  return false;
}

/**
 * 自動投稿用の禁止ワードチェック
 */
function containsAutoPostForbiddenWords(text) {
  for (const word of autoPostForbiddenWords) {
    if (text.includes(word)) return true;
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
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(line => line.trim());
    let startIndex = 0;

    if (lines[0] && /^\d+$/.test(lines[0].trim())) startIndex = 1;
    if (lines[startIndex] && lines[startIndex].includes('⭐')) startIndex++;

    if (lines.length > startIndex) {
      const title = lines[startIndex].substring(0, 30);
      const content = lines.slice(startIndex).join('');

      if (title && content && content.length >= 30) {
        reviews.push({ title, content });
      }
    }
  }

  return reviews;
}

/**
 * 全評価の口コミを読み込み
 */
function loadAllReviews() {
  const reviewsDir = path.join(__dirname, 'reviews-data');
  const allReviews = {
    1: loadReviewsFromFile(path.join(reviewsDir, '⭐1（辛口／クレーム寄り）.txt')),
    2: loadReviewsFromFile(path.join(reviewsDir, '⭐2（少し辛口寄り）.txt')),
    3: loadReviewsFromFile(path.join(reviewsDir, '⭐3（ニュートラル）.txt')),
    4: loadReviewsFromFile(path.join(reviewsDir, '⭐4（少しポジティブ寄り）.txt')),
    5: loadReviewsFromFile(path.join(reviewsDir, '⭐5（premium専用・高評価）.txt'))
  };

  console.log('📚 口コミテンプレート読み込み完了:');
  for (const [star, reviews] of Object.entries(allReviews)) {
    console.log(`  ⭐${star}: ${reviews.length}件`);
  }
  console.log('');

  return allReviews;
}

/**
 * サイトの評価を取得（Airtable SiteQuality フィールドから取得）
 *
 * v4: 5タイプ対応
 */
function getSiteRating(siteQuality) {
  const quality = siteQuality || 'normal';

  // 🌟 premium: ⭐3-5（毎日100%）
  if (quality === 'premium') {
    return {
      type: 'premium',
      starRange: [3, 5],
      starWeights: { 3: 0.25, 4: 0.55, 5: 0.20 }, // ⭐3(25%), ⭐4(55%), ⭐5(20%)
      weighted: true,
      probability: POSTING_FREQUENCY.premium
    };
  }

  // ✅ excellent: ⭐3-4（ほぼ毎日80%）
  if (quality === 'excellent') {
    return {
      type: 'excellent',
      starRange: [3, 4],
      weighted: true,
      probability: POSTING_FREQUENCY.excellent
    };
  }

  // ⚠️ poor: ⭐1-3（約7日に1回14%）
  if (quality === 'poor') {
    return {
      type: 'poor',
      starRange: [1, 3],
      weighted: false, // ランダム
      probability: POSTING_FREQUENCY.poor
    };
  }

  // ❌ malicious: ⭐1-2（約10日に1回10%）
  if (quality === 'malicious') {
    return {
      type: 'malicious',
      starRange: [1, 2],
      weighted: false, // ランダム
      probability: POSTING_FREQUENCY.malicious
    };
  }

  // ⚪ normal: ⭐2-4（約5日に1回20%）デフォルト
  return {
    type: 'normal',
    starRange: [2, 4],
    weighted: true,
    probability: POSTING_FREQUENCY.normal
  };
}

/**
 * 使用済み口コミIDを取得（30日以内）
 */
function getUsedReviewIds(usedReviewIdsField) {
  if (!usedReviewIdsField) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const entries = usedReviewIdsField.split(',').map(e => e.trim()).filter(Boolean);
  const validIds = [];

  for (const entry of entries) {
    const [id, dateStr] = entry.split('|');
    if (id && dateStr) {
      const usedDate = new Date(dateStr);
      if (usedDate >= thirtyDaysAgo) {
        validIds.push(id);
      }
    }
  }

  return validIds;
}

/**
 * 使用済み口コミIDを記録
 */
function recordUsedReviewId(usedReviewIdsField, reviewId) {
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `${reviewId}|${today}`;

  const existingIds = getUsedReviewIds(usedReviewIdsField);
  const existingEntries = (usedReviewIdsField || '').split(',').map(e => e.trim()).filter(Boolean);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const validEntries = existingEntries.filter(entry => {
    const [, dateStr] = entry.split('|');
    if (!dateStr) return false;
    const usedDate = new Date(dateStr);
    return usedDate >= thirtyDaysAgo;
  });

  validEntries.push(newEntry);
  return validEntries.join(',');
}

/**
 * 評価を選択（premium用の重み付き選択対応）
 */
function selectStars(starRange, weighted, type, currentAvg, reviewCount, starWeights) {
  // premiumの場合は固定の重み付け
  if (type === 'premium' && starWeights) {
    const rand = Math.random();
    let cumulative = 0;

    for (const [star, weight] of Object.entries(starWeights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return parseInt(star);
      }
    }
    return 4; // フォールバック
  }

  // その他のタイプの選択ロジック（v3と同じ）
  if (starRange[0] === starRange[1]) {
    return starRange[0];
  }

  if (weighted && type === 'normal') {
    // 通常サイト用の重み付け選択
    const TARGET_MIN = 2.8;
    const TARGET_MAX = 3.2;

    if (reviewCount >= 3) {
      if (currentAvg > TARGET_MAX) {
        return Math.random() < 0.7 ? 2 : 3;
      } else if (currentAvg < TARGET_MIN) {
        return Math.random() < 0.6 ? 3 : 4;
      } else {
        const rand = Math.random();
        if (rand < 0.25) return 2;
        if (rand < 0.85) return 3;
        return 4;
      }
    } else {
      const rand = Math.random();
      if (rand < 0.30) return 2;
      if (rand < 0.85) return 3;
      return 4;
    }
  }

  if (weighted && type === 'excellent') {
    // excellentサイト用の重み付け選択
    return Math.random() < 0.6 ? 4 : 3;
  }

  // デフォルト: ランダム選択
  const min = starRange[0];
  const max = starRange[1];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ユーザー名生成
 */
function generateUsername(category) {
  const baseNames = [
    '競馬太郎', '馬券師', '予想家', '競馬ファン', '南関ファン',
    '投資家', 'ギャンブラー', '週末の戦士', 'データ分析家', 'AI信者',
    '馬券研究家', '競馬歴10年', '三郎', '花子', '匿名'
  ];
  const suffixes = ['', 'マン', '神', '王', 'さん'];
  const number = Math.floor(Math.random() * 1000);

  let username;
  let attempts = 0;

  do {
    const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    username = `${baseName}${suffix}${number + attempts}`;
    attempts++;
  } while (recentUsernames.has(username) && attempts < 10);

  recentUsernames.add(username);
  if (recentUsernames.size > 100) {
    const firstUsername = Array.from(recentUsernames)[0];
    recentUsernames.delete(firstUsername);
  }

  return username;
}

/**
 * 投稿対象サイトを選択
 */
async function selectSitesToPost(maxSites = 5) {
  console.log('📊 投稿対象サイトを選択中...\n');

  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'Category', 'Reviews', 'SiteQuality', 'UsedReviewIDs']
  }).all();

  const sitesWithReviewCount = await Promise.all(
    allSites.map(async (siteRecord) => {
      const reviews = siteRecord.fields.Reviews || [];
      const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

      const siteQuality = siteRecord.fields.SiteQuality || 'normal';
      const rating = getSiteRating(siteQuality);

      return {
        id: siteRecord.id,
        name: siteRecord.fields.Name,
        category: siteRecord.fields.Category || 'other',
        reviewCount,
        rating,
        siteQuality,
        usedReviewIds: siteRecord.fields.UsedReviewIDs || ''
      };
    })
  );

  // Filter out sites with invalid IDs
  const validSites = sitesWithReviewCount.filter(site => {
    if (!site.id || site.id === null || site.id === 'null') {
      console.log(`  ⚠️  ${site.name}: 無効なレコードIDのためスキップ`);
      return false;
    }
    return true;
  });

  const candidates = validSites.filter(site => {
    const maxReviews = MAX_REVIEWS_PER_SITE[site.rating.type] || 30;
    if (site.reviewCount >= maxReviews) {
      console.log(`  ⏭️  ${site.name}: 上限到達 (${site.reviewCount}/${maxReviews})`);
      return false;
    }

    const shouldPost = Math.random() < site.rating.probability;
    if (!shouldPost) {
      console.log(`  🎲 ${site.name}: 今日は投稿なし (確率: ${(site.rating.probability * 100).toFixed(0)}%)`);
      return false;
    }

    console.log(`  ✅ ${site.name}: 投稿対象 (${site.siteQuality}, ${site.reviewCount}/${maxReviews})`);
    return true;
  });

  console.log(`\n📊 投稿対象: ${candidates.length}サイト\n`);

  return candidates.slice(0, maxSites);
}

/**
 * 口コミを投稿
 */
async function postReview(site, allReviews) {
  const { starRange, weighted, type, starWeights } = site.rating;

  // 既存レビューの平均評価を計算
  const reviews = site.reviews || [];
  const currentAvg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // 星の数を決定
  const stars = selectStars(starRange, weighted, type, currentAvg, site.reviewCount, starWeights);

  // 使用済みIDを確認
  const usedIds = getUsedReviewIds(site.usedReviewIds);

  // 口コミをランダム選択（使用済みを除外）
  const reviewCandidates = allReviews[stars] || [];
  const availableReviews = reviewCandidates
    .map((r, index) => ({ ...r, id: `star${stars}-${index}` }))
    .filter(r => !usedIds.includes(r.id))
    .filter(r => !containsForbiddenWords(r.title + r.content, site.category))
    .filter(r => !containsAutoPostForbiddenWords(r.title + r.content));

  if (availableReviews.length === 0) {
    console.log(`  ⚠️  ${site.name}: 使用可能な⭐${stars}口コミがありません`);
    return null;
  }

  const selectedReview = availableReviews[Math.floor(Math.random() * availableReviews.length)];

  // ユーザー名生成
  const username = generateUsername(site.category);

  // 口コミを投稿（v3と同じ形式）
  const review = {
    username,
    rating: stars,
    title: selectedReview.title,
    content: selectedReview.content
  };

  const reviewId = await uploadReview(review, site.id, true);

  if (reviewId) {
    // 使用済みIDを記録
    const newUsedReviewIds = recordUsedReviewId(site.usedReviewIds, selectedReview.id);
    await base('Sites').update(site.id, {
      UsedReviewIDs: newUsedReviewIds
    });

    console.log(`  ✅ ${site.name}: ⭐${stars} 投稿成功`);
    console.log(`     タイトル: ${selectedReview.title}`);
  } else {
    console.log(`  ❌ ${site.name}: 投稿失敗`);
  }

  return reviewId;
}

/**
 * メイン処理
 */
(async () => {
  console.log('🚀 口コミ自動投稿スクリプト v4 開始\n');
  console.log('📊 5タイプ対応:');
  console.log('  🌟 premium: ⭐3-5 (毎日100%)');
  console.log('  ✅ excellent: ⭐3-4 (ほぼ毎日80%)');
  console.log('  ⚪ normal: ⭐2-4 (約5日に1回20%)');
  console.log('  ⚠️ poor: ⭐1-3 (約7日に1回14%)');
  console.log('  ❌ malicious: ⭐1-2 (約10日に1回10%)\n');

  const allReviews = loadAllReviews();
  const sitesToPost = await selectSitesToPost(5);

  if (sitesToPost.length === 0) {
    console.log('📭 本日投稿する対象サイトがありません');
    return;
  }

  console.log('📝 口コミ投稿開始\n');

  for (const site of sitesToPost) {
    await postReview(site, allReviews);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ 口コミ自動投稿完了\n');
})();
