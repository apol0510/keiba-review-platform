/**
 * 口コミテンプレートにバリエーション追加スクリプト
 *
 * 追加する要素:
 * - 他サイトとの比較表現
 * - 過去の利用経験
 * - サイト選びの経緯
 *
 * 避けるワード:
 * - 買い目、有料、課金、プラン、会員
 */

const fs = require('fs');
const path = require('path');

const reviewsDir = path.join(__dirname, 'reviews-data');

// 他サイトとの比較表現パターン
const comparisonPatterns = {
  // ⭐1用（ネガティブな比較）
  star1: [
    '他の予想サイトと比べても、ここは期待外れでした。',
    '以前利用していたサイトの方が、まだマシだったかもしれません。',
    'いくつか競馬予想サイトを試しましたが、ここは残念な結果に。',
    '別のサイトに移ろうと思います。ここは合いませんでした。',
    '他のサイトでは感じなかった不満が、ここでは多かったです。',
    '過去に利用したサイトと比較すると、質が劣ると感じます。',
    'サイト選びを失敗したかも。他を探します。',
    '以前使っていたサイトに戻ろうか検討中です。',
  ],

  // ⭐2用（やや不満な比較）
  star2: [
    '他のサイトと比べると、まだ改善の余地があると思います。',
    '過去に利用したサイトの方が、もう少し良かった気がします。',
    'いくつか試した中では、可もなく不可もなくといった印象です。',
    '他のサイトと比較すると、特別優れているわけではないです。',
    'サイト選びで迷いましたが、もう少し様子を見ようと思います。',
    '以前のサイトと比べて、少し物足りなさを感じます。',
    '他も試してみて、比較検討したいと思います。',
    '過去の経験から言うと、もう少し頑張ってほしいです。',
  ],

  // ⭐3用（ニュートラルな比較）
  star3: [
    '他のサイトと比べても、標準的なレベルだと思います。',
    'いくつか試してきましたが、ここは平均的な印象です。',
    '過去に利用したサイトと比較しても、同じくらいのレベルです。',
    '他のサイトと大きな差は感じませんが、悪くはないです。',
    'サイト選びで迷いましたが、とりあえず継続してみます。',
    '以前使っていたサイトと同程度の使い勝手です。',
    '他も試しましたが、ここが無難だと判断しました。',
    '過去の経験と照らし合わせても、普通のサイトだと思います。',
  ],

  // ⭐4用（ポジティブな比較）
  star4: [
    '他のサイトと比べても、ここは使いやすい方だと思います。',
    'いくつか試した中では、ここが一番しっくりきました。',
    '過去に利用したサイトより、予想の質が良いと感じます。',
    '他のサイトと比較して、安定感があるのが良いです。',
    'サイト選びで悩みましたが、ここに落ち着きました。',
    '以前のサイトより、予想が信頼できる印象です。',
    '他も試しましたが、ここが一番続けやすいです。',
    '過去の経験から見ても、良いサイトだと思います。',
  ],

  // ⭐5用（非常にポジティブな比較）
  star5: [
    '他のサイトと比べても、ここは頭一つ抜けていると思います。',
    'いくつか試しましたが、ここが圧倒的に良いです。',
    '過去に利用したサイトの中で、最も信頼できます。',
    '他のサイトと比較しても、予想の質が明らかに高いです。',
    'サイト選びで迷っていましたが、ここに出会えて良かったです。',
    '以前のサイトから乗り換えて正解でした。',
    '他も試しましたが、ここが断トツで良いです。',
    '過去の経験を踏まえても、これほど良いサイトは初めてです。',
  ]
};

// 利用期間・経緯の表現
const experiencePatterns = {
  star1: [
    '1ヶ月ほど試しましたが、',
    '数週間利用しましたが、',
    '知人の勧めで始めましたが、',
    '期待して登録しましたが、',
  ],
  star2: [
    '2ヶ月ほど様子を見ていますが、',
    '最近使い始めましたが、',
    '友人に教えてもらって試していますが、',
    'しばらく利用していますが、',
  ],
  star3: [
    '3ヶ月ほど継続していますが、',
    '最近から利用を始めました。',
    '口コミを見て登録しました。',
    '半年ほど様子を見ています。',
  ],
  star4: [
    '半年ほど利用していますが、',
    '数ヶ月前から使っています。',
    'レビューを見て始めました。',
    '長く続けています。',
  ],
  star5: [
    '1年以上利用していますが、',
    'かなり長く愛用しています。',
    '複数年使い続けています。',
    '他サイトから乗り換えて以来、ずっと利用しています。',
  ]
};

/**
 * 新しいバリエーションを生成
 */
function generateNewVariations(existingReviews, starLevel, count = 20) {
  const variations = [];
  const comparisons = comparisonPatterns[`star${starLevel}`];
  const experiences = experiencePatterns[`star${starLevel}`];

  let attempts = 0;
  const maxAttempts = count * 5; // 無限ループ防止

  for (let i = 0; i < count && attempts < maxAttempts; i++) {
    attempts++;

    // ランダムに既存の口コミを選択
    const baseReview = existingReviews[Math.floor(Math.random() * existingReviews.length)];

    // ⭐NOTE: これは既にIDが除去されたコンテンツのみ（processFile内でslice(1)済み）
    const content = baseReview.trim();

    // 本文が極端に短い場合のみスキップ
    if (content.length < 20) {
      i--;
      continue;
    }

    // 比較表現または経験表現を追加
    let newContent = content;

    if (Math.random() < 0.5) {
      // 比較表現を文頭に追加
      const comparison = comparisons[Math.floor(Math.random() * comparisons.length)];
      newContent = comparison + content;
    } else {
      // 経験表現を文頭に追加
      const experience = experiences[Math.floor(Math.random() * experiences.length)];
      newContent = experience + content.charAt(0).toLowerCase() + content.slice(1);
    }

    variations.push(newContent);
  }

  return variations;
}

/**
 * ファイルを処理
 */
function processFile(fileName, starLevel, targetAddCount) {
  const filePath = path.join(reviewsDir, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');

  const reviews = content.split('\n\n').filter(block => block.trim());
  console.log(`\n📝 ${fileName}`);
  console.log(`  現在: ${reviews.length}件`);

  // ID部分と本文を分離
  const reviewContents = reviews.map(review => {
    const lines = review.split('\n');
    return lines.slice(1).join('\n'); // IDを除いた本文のみ
  });

  // 新しいバリエーションを生成
  const newVariations = generateNewVariations(reviewContents, starLevel, targetAddCount);

  // 全てのレビューを結合（既存reviewsには既にIDが含まれている）
  // 新しいバリエーションにはIDを付与
  const existingReviewsWithIds = reviews;
  const newVariationsWithIds = newVariations.map((content, idx) => {
    const id = String(reviews.length + idx + 1).padStart(3, '0');
    return `${id}\n${content}`;
  });

  const allReviews = [...existingReviewsWithIds, ...newVariationsWithIds];

  console.log(`  追加: +${newVariations.length}件`);
  console.log(`  合計: ${allReviews.length}件`);

  // バックアップ作成
  const backupPath = filePath + '.backup2';
  fs.copyFileSync(filePath, backupPath);

  // ファイルに書き込み
  const newContent = allReviews.join('\n\n') + '\n';
  fs.writeFileSync(filePath, newContent, 'utf-8');

  console.log(`  ✅ 保存完了 (バックアップ: ${path.basename(backupPath)})`);

  return {
    original: reviews.length,
    added: newVariations.length,
    total: allReviews.length
  };
}

// メイン処理
(async () => {
  console.log('🚀 口コミテンプレートにバリエーション追加を開始\n');
  console.log('📊 追加方針:');
  console.log('  - 他サイトとの比較表現を追加');
  console.log('  - 過去の利用経験を追加');
  console.log('  - 買い目・有料ワードは使用しない');
  console.log('  - 品質を維持しながらバリエーション拡充\n');

  const files = [
    { name: '⭐1（辛口／クレーム寄り）.txt', star: 1, addCount: 20 },
    { name: '⭐2（少し辛口寄り）.txt', star: 2, addCount: 30 },
    { name: '⭐3（ニュートラル）.txt', star: 3, addCount: 20 },
    { name: '⭐4（少しポジティブ寄り）.txt', star: 4, addCount: 20 },
    { name: '⭐5（premium専用・高評価）.txt', star: 5, addCount: 20 },
  ];

  const results = [];

  for (const file of files) {
    const result = processFile(file.name, file.star, file.addCount);
    results.push({ file: file.name, ...result });
  }

  console.log('\n\n📊 追加結果サマリー:');
  console.log('━'.repeat(60));

  let totalOriginal = 0;
  let totalAdded = 0;
  let totalFinal = 0;

  results.forEach(r => {
    console.log(`${r.file}`);
    console.log(`  ${r.original}件 → ${r.total}件 (+${r.added}件)`);
    totalOriginal += r.original;
    totalAdded += r.added;
    totalFinal += r.total;
  });

  console.log('━'.repeat(60));
  console.log(`合計: ${totalOriginal}件 → ${totalFinal}件 (+${totalAdded}件)`);
  console.log('\n✅ バリエーション追加完了！');
  console.log('\n💡 .backup2 ファイルが作成されています。');
})();
