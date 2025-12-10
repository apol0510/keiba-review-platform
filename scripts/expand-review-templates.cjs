/**
 * 口コミテンプレート拡充スクリプト
 *
 * 既存の250件を500件に倍増
 * - 表現のバリエーションを生成
 * - 品質を下げずに多様性を確保
 * - カテゴリ別専門用語は使用しない（汎用性維持）
 */

const fs = require('fs');
const path = require('path');

const reviewsDir = path.join(__dirname, 'reviews-data');

// 同義語・言い換え辞書
const synonyms = {
  '予想': ['予想', '予測', '見立て', '見解'],
  '買い目': ['買い目', '購入馬券', '推奨馬券', '馬券プラン'],
  '的中': ['的中', 'ヒット', '当選', '的中成功'],
  '回収率': ['回収率', '払戻率', '収支バランス', 'リターン'],
  '競馬予想サイト': ['競馬予想サイト', '予想サイト', 'このサイト', '当サイト'],
  '初心者': ['初心者', 'ビギナー', '競馬を始めたばかりの人', '未経験者'],
  '信頼': ['信頼', '安心', '信用', '頼りになる'],
  '満足': ['満足', '良い', 'ポジティブ', '気に入っている'],
  'わかりやすい': ['わかりやすい', '理解しやすい', '明瞭', '分かりやすい', 'シンプル'],
  '使いやすい': ['使いやすい', '扱いやすい', '操作しやすい', '利用しやすい'],
};

// 文末表現のバリエーション
const endingVariations = {
  'です': ['です', 'と思います', 'と感じます', 'ですね', 'だと思います'],
  'ます': ['ます', 'と思います', 'と感じます', 'ました', 'ています'],
  'でした': ['でした', 'だったと思います', 'と感じました', 'でしたね'],
};

/**
 * テキストのバリエーションを生成
 */
function generateVariation(text) {
  let result = text;

  // ランダムに同義語を置き換え（30%の確率）
  for (const [original, replacements] of Object.entries(synonyms)) {
    if (Math.random() < 0.3 && result.includes(original)) {
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      // 最初の出現のみ置き換え
      result = result.replace(original, replacement);
    }
  }

  // 文末表現を変更（50%の確率）
  for (const [original, variations] of Object.entries(endingVariations)) {
    if (Math.random() < 0.5 && result.endsWith(original)) {
      const variation = variations[Math.floor(Math.random() * variations.length)];
      result = result.substring(0, result.length - original.length) + variation;
      break;
    }
  }

  return result;
}

/**
 * 1つのファイルを処理
 */
function expandTemplateFile(fileName) {
  const filePath = path.join(reviewsDir, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');

  const reviews = content.split('\n\n').filter(block => block.trim());
  const expandedReviews = [...reviews];

  console.log(`\n📝 ${fileName}`);
  console.log(`  元の件数: ${reviews.length}件`);

  // 各レビューのバリエーションを生成
  const targetCount = reviews.length * 2; // 2倍に拡充
  let addedCount = 0;

  while (expandedReviews.length < targetCount && addedCount < reviews.length) {
    for (const review of reviews) {
      if (expandedReviews.length >= targetCount) break;

      const lines = review.trim().split('\n');
      const id = lines[0];
      const content = lines.slice(1).join('\n');

      // バリエーション生成（タイトルと本文両方）
      const titleAndContent = content.split('\n');
      const title = titleAndContent[0];
      const body = titleAndContent.slice(1).join('\n');

      const newTitle = generateVariation(title);
      const newBody = generateVariation(body);

      // 元と同じにならないかチェック
      if (newTitle !== title || newBody !== body) {
        const newId = String(expandedReviews.length + 1).padStart(3, '0');
        const newReview = `${newId}\n${newTitle}\n${newBody}`;
        expandedReviews.push(newReview);
        addedCount++;
      }
    }
  }

  console.log(`  拡充後: ${expandedReviews.length}件 (+${expandedReviews.length - reviews.length}件)`);

  // ファイルに書き込み（バックアップを作成）
  const backupPath = filePath + '.backup';
  fs.copyFileSync(filePath, backupPath);

  const newContent = expandedReviews.join('\n\n') + '\n';
  fs.writeFileSync(filePath, newContent, 'utf-8');

  console.log(`  ✅ 保存完了 (バックアップ: ${path.basename(backupPath)})`);

  return {
    original: reviews.length,
    expanded: expandedReviews.length,
    added: expandedReviews.length - reviews.length
  };
}

// メイン処理
(async () => {
  console.log('🚀 口コミテンプレート拡充を開始します\n');
  console.log('📊 拡充方針:');
  console.log('  - 既存テンプレートを2倍に拡充');
  console.log('  - 表現のバリエーション生成');
  console.log('  - 同義語・文末表現を自動置換');
  console.log('  - カテゴリ別専門用語は使用しない（汎用性維持）');

  const files = [
    '⭐1（辛口／クレーム寄り）.txt',
    '⭐2（少し辛口寄り）.txt',
    '⭐3（ニュートラル）.txt',
    '⭐4（少しポジティブ寄り）.txt',
  ];

  const results = [];

  for (const file of files) {
    const result = expandTemplateFile(file);
    results.push({ file, ...result });
  }

  console.log('\n\n📊 拡充結果サマリー:');
  console.log('━'.repeat(60));

  let totalOriginal = 0;
  let totalExpanded = 0;

  results.forEach(r => {
    console.log(`${r.file}`);
    console.log(`  ${r.original}件 → ${r.expanded}件 (+${r.added}件)`);
    totalOriginal += r.original;
    totalExpanded += r.expanded;
  });

  console.log('━'.repeat(60));
  console.log(`合計: ${totalOriginal}件 → ${totalExpanded}件 (+${totalExpanded - totalOriginal}件)`);
  console.log('\n✅ 拡充完了！');
  console.log('\n💡 バックアップファイルが作成されています。');
  console.log('   問題があれば .backup ファイルから復元できます。');
})();
