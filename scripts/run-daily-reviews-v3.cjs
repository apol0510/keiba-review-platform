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
  excellent: 80,  // 優良サイト: 最大80件（人気サイトは口コミが多い）
  normal: 30,     // 通常サイト: 最大30件（適度な数で信頼性維持）
  malicious: 50   // 悪質サイト: 最大50件（多くの人が被害報告するのは自然）
};

// カテゴリ別のユーザー名プレフィックスは削除
// 新しいユーザー名生成ロジックでパターンベース生成を使用

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
 * 評価別の口コミファイルを読み込み（IDを付与）
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
    const reviews = loadReviewsFromFile(filePath);
    // 各口コミにユニークIDを付与
    allReviews[rating] = reviews.map((review, index) => ({
      ...review,
      id: `star${rating}-${index}`
    }));
    console.log(`  ⭐${rating}: ${allReviews[rating].length}件の口コミを読み込み`);
  }

  return allReviews;
}

/**
 * 投稿確率設定（Airtableの SiteQuality に基づく）
 */
const POSTING_FREQUENCY = {
  excellent: 1.0,   // 100% (毎日)
  normal: 0.33,     // 33% (約3日に1回)
  malicious: 0.2    // 20% (約5日に1回)
};

/**
 * サイトの評価を取得（Airtable SiteQuality フィールドから取得）
 */
function getSiteRating(siteQuality) {
  // Airtableの SiteQuality フィールドから品質を判定
  const quality = siteQuality || 'normal'; // デフォルトは通常

  if (quality === 'excellent') {
    return {
      type: 'excellent',
      starRange: [3, 4],
      weighted: true,
      probability: POSTING_FREQUENCY.excellent
    };
  }

  if (quality === 'malicious') {
    return {
      type: 'malicious',
      starRange: [1, 3],
      probability: POSTING_FREQUENCY.malicious
    };
  }

  // 通常サイト（デフォルト）
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
async function getUsedReviewIds(siteName) {
  try {
    const sites = await base('Sites').select({
      filterByFormula: `{Name} = "${siteName}"`,
      fields: ['UsedReviewIDs']
    }).all();

    if (sites.length === 0) {
      return [];
    }

    const usedIdsField = sites[0].get('UsedReviewIDs');
    if (!usedIdsField) {
      return [];
    }

    // 形式: "star3-15|2024-12-04,star2-42|2024-12-03"
    const entries = usedIdsField.split(',');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 30日以内のIDのみを返す
    return entries
      .map(entry => {
        const [id, dateStr] = entry.split('|');
        return { id, date: new Date(dateStr) };
      })
      .filter(({ date }) => date >= thirtyDaysAgo)
      .map(({ id }) => id);
  } catch (error) {
    console.error('使用済みID取得エラー:', error);
    return [];
  }
}

/**
 * 使用済み口コミIDを記録
 */
async function recordUsedReviewId(siteName, reviewId) {
  try {
    const sites = await base('Sites').select({
      filterByFormula: `{Name} = "${siteName}"`,
      fields: ['UsedReviewIDs']
    }).all();

    if (sites.length === 0) {
      console.warn(`⚠️  サイト「${siteName}」が見つかりません`);
      return;
    }

    const siteRecord = sites[0];
    const usedIdsField = siteRecord.get('UsedReviewIDs') || '';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 新しいIDを追加
    const newEntry = `${reviewId}|${today}`;
    const updatedIds = usedIdsField ? `${usedIdsField},${newEntry}` : newEntry;

    // Airtableに保存
    await base('Sites').update(siteRecord.id, {
      UsedReviewIDs: updatedIds
    });

    console.log(`    💾 使用済みID記録: ${reviewId}`);
  } catch (error) {
    console.error('使用済みID記録エラー:', error);
  }
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
    // 通常サイト用の重み付け選択（平均2.8〜3.2を目指す）
    const TARGET_MIN = 2.8; // 目標最小値
    const TARGET_MAX = 3.2; // 目標最大値
    const TARGET_AVERAGE = 3.0; // 目標中央値

    if (existing.count >= 3) {
      // 既存口コミが3件以上ある場合、目標平均に近づける
      const currentAverage = existing.average;

      if (currentAverage > TARGET_MAX) {
        // 平均が高すぎる（3.2超） → ⭐2か⭐3で下げる
        stars = Math.random() < 0.7 ? 2 : 3;
        console.log(`    📊 平均調整: ${currentAverage.toFixed(2)} > ${TARGET_MAX} → 低評価を投稿 (⭐${stars})`);
      } else if (currentAverage < TARGET_MIN) {
        // 平均が低すぎる（2.8未満） → ⭐3か⭐4で上げる
        stars = Math.random() < 0.6 ? 3 : 4;
        console.log(`    📊 平均調整: ${currentAverage.toFixed(2)} < ${TARGET_MIN} → 高評価を投稿 (⭐${stars})`);
      } else {
        // 平均が目標範囲内（2.8〜3.2） → ランダムだが⭐3を多めに
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

  // 使用済み口コミIDを取得
  const usedReviewIds = await getUsedReviewIds(siteName);

  // カテゴリに適した口コミを探す（最大20回試行）
  let selectedReview = null;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const candidate = reviewList[Math.floor(Math.random() * reviewList.length)];
    const fullText = candidate.title + ' ' + candidate.content;

    // 重複チェック（30日以内に使用したIDは除外）
    if (usedReviewIds.includes(candidate.id)) {
      attempts++;
      continue;
    }

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

  // より自然なユーザー名パターンを複数用意
  const usernamePatterns = [
    // パターン1: 実在しそうなフルネーム（15%）
    () => {
      const firstNames = ['太郎', '浩介', '健太', '翔太', '大輔', '拓也', '裕也', '和也', '隆', '誠', '優', '陽介', '幸一', '修', '勇'];
      const lastNames = ['佐々木', '田中', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '山田', '中島', '吉田', '斎藤'];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      return `${lastName}${firstName}`;
    },

    // パターン2: 名字のみ（10%）
    () => {
      const lastNames = ['佐々木', '田中', '佐藤', '鈴木', '高橋', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '山田', '中島', '吉田', '斎藤', '松本', '井上', '木村', '林', '清水'];
      return lastNames[Math.floor(Math.random() * lastNames.length)];
    },

    // パターン3: 名前のみ（10%）
    () => {
      const firstNames = ['太郎', '次郎', '三郎', '健太', '浩介', '翔太', '大輔', '拓也', '裕也', '和也', '隆', '誠', '優', '花子', '愛', '凛', '葵', '蓮', '陽菜', '結衣'];
      return firstNames[Math.floor(Math.random() * firstNames.length)];
    },

    // パターン4: 匿名系（10%）
    () => {
      const anonymous = ['匿名', '匿名希望', '名無し', '通りすがり', 'ななし', '名無しさん'];
      return anonymous[Math.floor(Math.random() * anonymous.length)];
    },

    // パターン5: 年代・職業（15%）
    () => {
      const patterns = [
        '20代会社員', '30代会社員', '40代会社員', '50代会社員', '60代男性',
        '30代男性', '40代男性', '50代男性', '20代男性',
        '30代サラリーマン', '40代サラリーマン', '50代サラリーマン',
        '30代OL', '40代主婦', '50代自営業', '60代自営業',
        '20代学生', '大学生', '社会人1年目', '新社会人'
      ];
      return patterns[Math.floor(Math.random() * patterns.length)];
    },

    // パターン6: 地域（10%）
    () => {
      const regions = [
        '東京在住', '大阪在住', '神奈川在住', '埼玉在住', '千葉在住',
        '関東人', '関西人', '九州人', '北海道民', '東北人',
        '東京の会社員', '大阪の会社員', '名古屋人', '福岡人'
      ];
      return regions[Math.floor(Math.random() * regions.length)];
    },

    // パターン7: 趣味・経験年数（15%）
    () => {
      const hobbies = [
        '週末の競馬ファン', '競馬歴10年', '競馬歴5年', '競馬歴20年',
        'ベテラン馬券師', '競馬初心者', '競馬好き', '馬券生活',
        '週末ギャンブラー', '競馬ファン歴3年', '10年目のベテラン',
        '競馬一筋', '毎週競馬場', '馬券研究家', '予想好き'
      ];
      return hobbies[Math.floor(Math.random() * hobbies.length)];
    },

    // パターン8: シンプルなニックネーム（15%）
    () => {
      const nicknames = [
        'うまうま', 'ウマ好き', 'ターフの達人', 'うまっち', 'うまきち',
        'ケイバ男', 'ケイバ女', 'うま子', 'けいば好き', 'ウマ太',
        '競馬ファン', '馬券好き', '本命党', '穴党', 'ベテランさん',
        '初心者くん', 'ラッキーボーイ', '週末の戦士', 'サラリーマン'
      ];
      return nicknames[Math.floor(Math.random() * nicknames.length)];
    }
  ];

  let username = '';
  let usernameAttempts = 0;
  const maxUsernameAttempts = 50;

  // 重複しないユーザー名を生成（最大50回試行）
  while (usernameAttempts < maxUsernameAttempts) {
    // パターンをランダムに選択（重み付け: 合計100%）
    const rand = Math.random();
    let patternIndex;
    if (rand < 0.15) patternIndex = 0;        // 15% - 実在しそうなフルネーム
    else if (rand < 0.25) patternIndex = 1;   // 10% - 名字のみ
    else if (rand < 0.35) patternIndex = 2;   // 10% - 名前のみ
    else if (rand < 0.45) patternIndex = 3;   // 10% - 匿名系
    else if (rand < 0.60) patternIndex = 4;   // 15% - 年代・職業
    else if (rand < 0.70) patternIndex = 5;   // 10% - 地域
    else if (rand < 0.85) patternIndex = 6;   // 15% - 趣味・経験年数
    else patternIndex = 7;                     // 15% - シンプルなニックネーム

    const candidate = usernamePatterns[patternIndex]();

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

  // 50回試行して見つからない場合はタイムスタンプベース
  if (!username) {
    username = `ユーザー${Date.now() % 100000}`;
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
async function selectSitesToPost(maxSites = 5) {
  console.log('📊 投稿対象サイトを選択中...\n');

  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'Category', 'Reviews', 'SiteQuality']
  }).all();

  const sitesWithReviewCount = await Promise.all(
    allSites.map(async (siteRecord) => {
      const reviews = siteRecord.fields.Reviews || [];
      const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

      // AirtableのSiteQualityフィールドから品質を取得
      const siteQuality = siteRecord.fields.SiteQuality;
      const rating = getSiteRating(siteQuality);

      return {
        id: siteRecord.id,
        name: siteRecord.fields.Name,
        category: siteRecord.fields.Category || 'other',
        reviewCount,
        rating,
        siteQuality: siteQuality || 'normal'
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

  // 投稿確率でフィルタリング（優良: 100%, 通常: 33%, 悪質: 20%）
  const sitesPassingProbability = sitesUnderLimit.filter(site => {
    const probability = site.rating.probability || 1.0;
    const shouldPost = Math.random() < probability;

    if (!shouldPost) {
      const frequencyLabel =
        probability >= 1.0 ? '毎日' :
        probability >= 0.5 ? '2日に1回' :
        probability >= 0.3 ? '3日に1回' :
        '5日に1回';
      console.log(`  ⏭️  ${site.name}: 投稿確率 ${(probability * 100).toFixed(0)}% (${frequencyLabel}) - スキップ`);
    }

    return shouldPost;
  });

  const sitesWithPriority = sitesPassingProbability.map(site => {
    const maxReviews = MAX_REVIEWS_PER_SITE[site.rating.type] || MAX_REVIEWS_PER_SITE.normal;

    // 環境変数で投稿件数を制御（デフォルト: 1件）
    const reviewsPerSite = parseInt(process.env.REVIEWS_PER_SITE || '1', 10);
    const remainingSlots = maxReviews - site.reviewCount;
    const reviewsToPost = Math.min(reviewsPerSite, remainingSlots);

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

  // maxSitesが0の場合は全サイト対象
  return maxSites > 0 ? sitesWithPriority.slice(0, maxSites) : sitesWithPriority;
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

  // 投稿頻度設定を表示
  console.log(`📊 投稿頻度設定: 優良 ${(POSTING_FREQUENCY.excellent * 100).toFixed(0)}%, 通常 ${(POSTING_FREQUENCY.normal * 100).toFixed(0)}%, 悪質 ${(POSTING_FREQUENCY.malicious * 100).toFixed(0)}%\n`);

  // 環境変数でラウンド数を制御（デフォルト: 1ラウンド）
  const rounds = parseInt(process.env.REVIEW_ROUNDS || '1', 10);

  let grandTotalReviews = 0;
  let grandSuccessCount = 0;

  for (let round = 1; round <= rounds; round++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 ラウンド ${round}/${rounds} を開始`);
    console.log('='.repeat(60) + '\n');

    // 投稿対象サイトを選択（0 = 全サイト対象）
    const targetSites = await selectSitesToPost(0);

    console.log(`📝 ${targetSites.length}サイトに口コミを投稿します:\n`);
    targetSites.forEach((site, i) => {
      const typeLabel = site.rating.type === 'excellent' ? '✅優良' :
                        site.rating.type === 'malicious' ? '❌悪質' : '⚪通常';
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

          // 使用済みIDを記録（重複防止）
          if (review.id) {
            await recordUsedReviewId(site.name, review.id);
          }
        } else {
          console.log(`    ❌ 登録失敗`);
        }

        totalReviews++;

        // レート制限を避けるため待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    grandTotalReviews += totalReviews;
    grandSuccessCount += successCount;

    console.log(`\n✅ ラウンド ${round}/${rounds} 完了`);
    console.log(`📊 ラウンド結果:`);
    console.log(`  対象サイト: ${targetSites.length}サイト`);
    console.log(`  投稿口コミ: ${totalReviews}件`);
    console.log(`  成功: ${successCount}件`);
    console.log(`  失敗: ${totalReviews - successCount}件`);

    // 次のラウンドまで待機（最後のラウンドは待機不要）
    if (round < rounds) {
      const waitSeconds = 10;
      console.log(`\n⏳ 次のラウンドまで${waitSeconds}秒待機...\n`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('✅ 全ラウンドの口コミ投稿完了');
  console.log('='.repeat(60));
  console.log('\n📊 最終結果サマリー:');
  console.log(`  実行ラウンド: ${rounds}回`);
  console.log(`  総投稿口コミ: ${grandTotalReviews}件`);
  console.log(`  総成功: ${grandSuccessCount}件`);
  console.log(`  総失敗: ${grandTotalReviews - grandSuccessCount}件`);
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateReviewByRating, selectSitesToPost, loadAllReviews };
