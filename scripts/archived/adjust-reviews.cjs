const fs = require('fs');

/**
 * 口コミテキストをリライトする関数
 *
 * リライトのポイント:
 * 1. 著作権を考慮した文章変換
 * 2. 誇大表現の削除
 * 3. トーン調整（優良/悪質サイトの判定）
 * 4. 自然な日本語に調整
 */
function rewriteReview(originalText, siteRating, siteName) {
  let rewritten = originalText;

  // 1. 誇大表現の削除・調整
  const exaggerations = [
    { pattern: /当たりまくり/g, replace: '的中することもある' },
    { pattern: /絶対/g, replace: 'ほぼ' },
    { pattern: /100%/g, replace: 'かなりの確率で' },
    { pattern: /確実に/g, replace: '高い確率で' },
    { pattern: /必ず/g, replace: '多くの場合' },
    { pattern: /最高/g, replace: '良い' },
    { pattern: /完璧/g, replace: '優れている' },
    { pattern: /神/g, replace: '優秀' },
    { pattern: /すごすぎる/g, replace: 'すごい' },
    { pattern: /マジで/g, replace: '本当に' },
    { pattern: /ヤバい/g, replace: 'すごい' },
  ];

  exaggerations.forEach(({ pattern, replace }) => {
    rewritten = rewritten.replace(pattern, replace);
  });

  // 2. 悪質サイト特有の表現を調整
  if (siteRating <= 2.5) {
    // 悪質サイトの場合、批判的なトーンに調整
    const maliciousAdjustments = [
      { pattern: /良かった/g, replace: '期待外れだった' },
      { pattern: /おすすめ/g, replace: 'おすすめしない' },
      { pattern: /満足/g, replace: '不満' },
      { pattern: /信頼できる/g, replace: '信頼性に欠ける' },
      { pattern: /当たった/g, replace: '外れた' },
      { pattern: /的中した/g, replace: '的中しなかった' },
    ];

    // 悪質サイト用の表現追加
    const negativeExpressions = [
      '情報料が高すぎる',
      '的中率が低い',
      'サポート対応が悪い',
      '期待したほどではなかった',
      '費用対効果が悪い',
    ];

    // ランダムに批判的表現を追加
    if (Math.random() > 0.7) {
      const randomNegative = negativeExpressions[Math.floor(Math.random() * negativeExpressions.length)];
      rewritten = rewritten + `。${randomNegative}と感じた。`;
    }
  }

  // 3. 通常サイトの場合、中立的なトーンに調整
  if (siteRating >= 2.5 && siteRating < 4.0) {
    const neutralAdjustments = [
      { pattern: /すごく良い/g, replace: 'まあまあ良い' },
      { pattern: /最高/g, replace: '普通' },
      { pattern: /完璧/g, replace: '可もなく不可もなく' },
    ];

    neutralAdjustments.forEach(({ pattern, replace }) => {
      rewritten = rewritten.replace(pattern, replace);
    });
  }

  // 4. サイト名の言及を調整
  rewritten = rewritten.replace(/このサイト/g, siteName);
  rewritten = rewritten.replace(/ここ/g, siteName);

  // 5. 文末の調整
  rewritten = rewritten.replace(/です。/g, 'だと思う。');
  rewritten = rewritten.replace(/ます。/g, 'る気がする。');

  // 6. 文字数調整（20〜500文字）
  if (rewritten.length < 20) {
    rewritten = rewritten + '個人的な感想です。';
  }
  if (rewritten.length > 500) {
    rewritten = rewritten.substring(0, 497) + '...';
  }

  return rewritten;
}

/**
 * タイトルを生成する関数
 */
function generateTitle(reviewContent, siteRating) {
  const titles = {
    bad: [
      '期待外れでした',
      '情報料が高すぎる',
      '的中率が低い',
      'おすすめできません',
      'サポート対応が悪い',
      '費用対効果が悪い',
      '信頼性に欠ける',
      '残念な結果に',
    ],
    neutral: [
      '可もなく不可もなく',
      '普通の予想サイト',
      'まあまあの精度',
      '期待通りではなかった',
      '平均的なサービス',
      '特に不満はないが',
      'それなりの結果',
    ],
    good: [
      'まあまあ良い',
      '悪くないと思う',
      'そこそこの精度',
      '使いやすい',
      '期待できる',
      '信頼できると思う',
    ]
  };

  let category = 'neutral';
  if (siteRating <= 2.5) {
    category = 'bad';
  } else if (siteRating >= 4.0) {
    category = 'good';
  }

  const categoryTitles = titles[category];
  return categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
}

/**
 * ユーザー名を生成する関数
 */
function generateUsername() {
  const prefixes = ['競馬', 'NANKAN', 'keiba', '南関', '地方競馬', '競馬ファン'];
  const suffixes = ['太郎', 'さん', 'ユーザー', '好き', 'マニア', '初心者', '中級者'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix}${suffix}`;
}

/**
 * 評価（星の数）を決定する関数
 */
function determineRating(averageRating, originalRating) {
  // u85.jpの3段階評価を5段階に変換
  if (averageRating <= 1.5) {
    return Math.random() > 0.5 ? 1 : 2; // 悪質サイト: 1-2星
  } else if (averageRating >= 2.5) {
    return 3; // 通常サイト: 3星
  } else {
    return Math.random() > 0.5 ? 2 : 3; // 中間: 2-3星
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔄 口コミ調整スクリプトを開始\n');

  // 収集した口コミデータを読み込み
  const inputPath = '/tmp/scraped-reviews-u85.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ ${inputPath} が見つかりません`);
    process.exit(1);
  }

  const scrapedData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  console.log(`📁 ${scrapedData.length}サイトのデータを読み込みました\n`);

  const adjustedReviews = [];

  scrapedData.forEach((siteData, index) => {
    console.log(`${index + 1}. ${siteData.siteName} (⭐${siteData.averageRating}/5.0)`);

    siteData.reviews.forEach((originalContent, reviewIndex) => {
      const rating = determineRating(siteData.averageRating);
      const title = generateTitle(originalContent, siteData.averageRating);
      const content = rewriteReview(originalContent, siteData.averageRating, siteData.siteName);
      const username = generateUsername();

      adjustedReviews.push({
        siteName: siteData.siteName,
        siteUrl: siteData.siteUrl,
        rating,
        title,
        content,
        username,
        source: siteData.source,
        originalContent: originalContent.substring(0, 100) + '...' // デバッグ用
      });

      console.log(`   ${reviewIndex + 1}. [${rating}★] ${title}`);
    });

    console.log('');
  });

  // 結果を保存
  const outputPath = '/tmp/adjusted-reviews.json';
  fs.writeFileSync(outputPath, JSON.stringify(adjustedReviews, null, 2));

  console.log(`✅ 調整完了: ${adjustedReviews.length}件の口コミ`);
  console.log(`📁 保存先: ${outputPath}\n`);

  // サマリー表示
  console.log('📊 評価分布:');
  const ratingDistribution = adjustedReviews.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {});

  Object.entries(ratingDistribution).forEach(([rating, count]) => {
    console.log(`  ${rating}★: ${count}件`);
  });
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { rewriteReview, generateTitle, generateUsername, determineRating };
