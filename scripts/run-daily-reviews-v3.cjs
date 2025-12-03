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

// 最近使用したユーザー名を記録（重複防止）
const recentUsernames = new Set();

/**
 * サイトタイプ別の口コミ上限設定
 * これ以上口コミが増えないようにして、不自然さを回避
 */
const MAX_REVIEWS_PER_SITE = {
  malicious: 50,  // 悪質サイト: 最大50件（多くの人が被害報告するのは自然）
  normal: 30,     // 通常サイト: 最大30件（適度な数で信頼性維持）
  legit: 80       // 優良サイト: 最大80件（人気サイトは口コミが多い）※未実装
};

/**
 * カテゴリ別のユーザー名プレフィックス（大幅に増量）
 */
const categoryUsernamePrefixes = {
  nankan: [
    // 南関特有のワードは削除（中央競馬サイトで使われると不適切）
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  chuo: [
    'JRA', '中央', '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '中央競馬', 'JRAファン', '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン', 'JRA派',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン', '競馬依存',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  chihou: [
    // 地方競馬特有のワードは削除（中央競馬サイトで使われると不適切）
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬大好き', '馬券師', '競馬歴10年',
    '週末競馬', '競馬マニア', '競馬通', 'うま太郎', 'うまうま',
    'サラリーマン馬券', '競馬初心者', '競馬ベテラン',
    '予想屋', '競馬ラバー', '馬券生活', '的中師',
    '重賞ファン', '競馬愛好家', '馬券研究家',
    '週末ギャンブラー', '競馬道', 'ターフファン',
    '回収率追求', '本命党', '穴党', '三連単狙い'
  ],
  other: [
    '競馬', 'keiba', '競馬ファン', 'ベテラン', '初心者',
    '競馬好き', '馬券師', '予想屋', '競馬マニア'
  ]
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

    // 地方競馬関連（「地方」単体も追加）
    '地方競馬', '地方', 'NAR', '園田', '金沢', '名古屋', '高知',
    '笠松', '門別', '盛岡', '水沢',
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
  // 平均評価を3.0〜3.2に抑えるため、重み付けランダム選択
  return { type: 'normal', starRange: [2, 4], weighted: true }; // 2-4★（⭐5は使用禁止）
}

/**
 * 既存口コミの平均評価を取得
 */
async function getExistingAverageRating(siteName) {
  try {
    const reviews = await base('Reviews').select({
      filterByFormula: `{Site} = "${siteName}"`,
      fields: ['Rating']
    }).all();

    if (reviews.length === 0) {
      return { average: 0, count: 0, ratings: [] };
    }

    const ratings = reviews.map(r => r.get('Rating') || 0);
    const total = ratings.reduce((sum, r) => sum + r, 0);
    const average = total / ratings.length;

    return { average, count: ratings.length, ratings };
  } catch (error) {
    console.error('既存口コミ取得エラー:', error);
    return { average: 0, count: 0, ratings: [] };
  }
}

/**
 * 評価に基づいた口コミを生成（既存口コミを考慮）
 */
async function generateReviewByRating(siteName, rating, category, allReviews) {
  const { type, starRange, weighted } = rating;

  // 既存口コミの平均を取得
  const existing = await getExistingAverageRating(siteName);

  // 星の数を決定
  let stars;

  if (starRange[0] === starRange[1]) {
    stars = starRange[0];
  } else if (weighted && type === 'normal') {
    // 通常サイト用の重み付け選択（平均3.0〜3.2を目指す）
    const TARGET_AVERAGE = 3.1; // 目標平均

    if (existing.count >= 3) {
      // 既存口コミが3件以上ある場合、目標平均に近づける
      const currentAverage = existing.average;

      if (currentAverage > TARGET_AVERAGE + 0.3) {
        // 平均が高すぎる（3.4以上） → ⭐2か⭐3で下げる
        stars = Math.random() < 0.7 ? 2 : 3;
        console.log(`    📊 平均調整: ${currentAverage.toFixed(2)} → 低評価を投稿 (⭐${stars})`);
      } else if (currentAverage < TARGET_AVERAGE - 0.3) {
        // 平均が低すぎる（2.8以下） → ⭐3か⭐4で上げる
        stars = Math.random() < 0.6 ? 3 : 4;
        console.log(`    📊 平均調整: ${currentAverage.toFixed(2)} → 高評価を投稿 (⭐${stars})`);
      } else {
        // 平均が目標範囲内 → ランダムだが⭐3を多めに
        const rand = Math.random();
        if (rand < 0.25) {
          stars = 2; // 25%
        } else if (rand < 0.85) {
          stars = 3; // 60%
        } else {
          stars = 4; // 15%
        }
      }

      // 連続同評価を防ぐ（最新3件が同じ評価の場合、強制的に変える）
      const recent3 = existing.ratings.slice(-3);
      if (recent3.length >= 3 && recent3.every(r => r === stars)) {
        const alternatives = [2, 3, 4].filter(s => s !== stars);
        stars = alternatives[Math.floor(Math.random() * alternatives.length)];
        console.log(`    🔄 連続回避: 最新3件が⭐${recent3[0]} → ⭐${stars}に変更`);
      }
    } else {
      // 口コミが少ない場合は従来の重み付け
      const rand = Math.random();
      if (rand < 0.30) {
        stars = 2; // 30%
      } else if (rand < 0.85) {
        stars = 3; // 55%
      } else {
        stars = 4; // 15%
      }
    }
  } else {
    // 通常のランダム選択
    stars = Math.floor(Math.random() * (starRange[1] - starRange[0] + 1)) + starRange[0];
  }

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

  // カテゴリに応じたユーザー名を生成（重複防止機能付き）
  const prefixes = categoryUsernamePrefixes[category] || categoryUsernamePrefixes.other;
  const usernameSuffixes = [
    '太郎', 'さん', 'ユーザー', '好き', 'マニア', '愛好家', '馬券師', 'ファン',
    '次郎', '三郎', '四郎', '花子', '一郎', 'くん', 'ちゃん',
    '先生', '師匠', '野郎', '兄さん', '姉さん', 'おじさん',
    '親父', '野郎', '小僧', 'ボーイ', 'ガール', 'マン',
    '王', '神', 'キング', 'クイーン', 'プリンス', 'プリンセス',
    'マスター', '名人', '達人', '鉄人', '職人', '玄人',
    '素人', '見習い', '修行中', '研究家', '評論家', 'アナリスト'
  ];

  let username = '';
  let usernameAttempts = 0;
  const maxUsernameAttempts = 50;

  // 重複しないユーザー名を生成（最大50回試行）
  while (usernameAttempts < maxUsernameAttempts) {
    const usernamePrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const usernameSuffix = usernameSuffixes[Math.floor(Math.random() * usernameSuffixes.length)];
    const usernameNumber = Math.floor(Math.random() * 1000); // 0-999に拡大

    const candidate = `${usernamePrefix}${usernameSuffix}${usernameNumber}`;

    // 最近使用していないユーザー名であれば採用
    if (!recentUsernames.has(candidate)) {
      username = candidate;
      recentUsernames.add(candidate);

      // メモリ節約: 100件を超えたら古いものを削除
      if (recentUsernames.size > 100) {
        const firstItem = recentUsernames.values().next().value;
        recentUsernames.delete(firstItem);
      }

      break;
    }

    usernameAttempts++;
  }

  // 50回試行して見つからない場合はタイムスタンプを追加
  if (!username) {
    const usernamePrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const usernameSuffix = usernameSuffixes[Math.floor(Math.random() * usernameSuffixes.length)];
    username = `${usernamePrefix}${usernameSuffix}${Date.now() % 10000}`;
  }

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

  // 上限に達していないサイトのみをフィルタリング
  const sitesUnderLimit = sitesWithReviewCount.filter(site => {
    const maxReviews = MAX_REVIEWS_PER_SITE[site.rating.type] || MAX_REVIEWS_PER_SITE.normal;
    const isUnderLimit = site.reviewCount < maxReviews;

    if (!isUnderLimit) {
      console.log(`  ⚠️  ${site.name}: 上限到達 (${site.reviewCount}/${maxReviews}件) - スキップ`);
    }

    return isUnderLimit;
  });

  const sitesWithPriority = sitesUnderLimit.map(site => {
    const maxReviews = MAX_REVIEWS_PER_SITE[site.rating.type] || MAX_REVIEWS_PER_SITE.normal;

    // 連続投稿を避けるため、1サイト1件に制限
    const reviewsToPost = 1;

    // 優先度を計算（口コミが少ないサイトを優先）
    const priority = 1000 - site.reviewCount + Math.random() * 100;

    return {
      ...site,
      reviewsToPost,
      priority,
      maxReviews
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
    console.log(`  ${i + 1}. ${typeLabel} ${site.name} (${site.reviewCount}/${site.maxReviews}件 → +${site.reviewsToPost}件)`);
  });
  console.log('');

  let totalReviews = 0;
  let successCount = 0;

  for (const site of targetSites) {
    console.log(`\n🎯 ${site.name} に口コミを投稿中...`);
    console.log(`   カテゴリ: ${site.category}, タイプ: ${site.rating.type}`);

    for (let i = 0; i < site.reviewsToPost; i++) {
      const review = await generateReviewByRating(site.name, site.rating, site.category, allReviews);

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
