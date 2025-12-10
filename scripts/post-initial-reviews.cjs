const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// ランダム選択関数
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// カテゴリ別ユーザー名生成
function generateUsername(category) {
  const baseNames = [
    '競馬太郎', '馬券師', '予想家', '競馬ファン', '南関ファン',
    '投資家', 'ギャンブラー', '週末の戦士', 'データ分析家', 'AI信者'
  ];
  const suffixes = ['', 'マン', '神', '王', 'さん'];
  const number = Math.floor(Math.random() * 1000);

  const baseName = getRandomElement(baseNames);
  const suffix = getRandomElement(suffixes);

  return `${baseName}${suffix}${number}`;
}

// 口コミファイルからランダム取得
function getRandomReview(rating) {
  const reviewDir = path.join(__dirname, 'reviews-data');
  const ratingFiles = {
    3: '⭐3（ニュートラル）.txt',
    4: '⭐4（少しポジティブ寄り）.txt'
  };

  const fileName = ratingFiles[rating];
  if (!fileName) {
    throw new Error(`Rating ${rating} not supported for excellent sites`);
  }

  const filePath = path.join(reviewDir, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');

  const reviews = content.split('\n\n').filter(block => block.trim());
  const randomReview = getRandomElement(reviews);

  const lines = randomReview.trim().split('\n');
  const title = lines[0];
  const reviewContent = lines.slice(1).join('\n').trim();

  return { title, content: reviewContent };
}

(async () => {
  try {
    console.log('📝 南関アナリティクスの初回口コミを投稿します\n');

    // サイトIDを取得
    const sites = await base('Sites').select({
      filterByFormula: '{Slug} = "nankan-analytics"'
    }).all();

    if (sites.length === 0) {
      console.error('❌ サイトが見つかりません');
      return;
    }

    const site = sites[0];
    console.log(`✅ サイト: ${site.fields.Name} (${site.id})\n`);

    // 5件の口コミを投稿（⭐3×2件、⭐4×3件）
    const ratings = [3, 3, 4, 4, 4]; // 平均3.6を目指す
    const reviews = [];

    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      const { title, content } = getRandomReview(rating);
      const username = generateUsername('nankan');

      reviews.push({
        Site: [site.id],
        UserName: username,
        UserEmail: `${username.toLowerCase().replace(/\s/g, '')}@example.com`,
        Rating: rating,
        Title: title,
        Content: content,
        IsApproved: true
      });

      console.log(`${i + 1}. ⭐${rating} - ${title}`);
      console.log(`   ユーザー: ${username}`);
      console.log('');
    }

    // 一括投稿
    console.log('📤 口コミを投稿中...\n');

    for (const review of reviews) {
      await base('Reviews').create(review);
      await new Promise(resolve => setTimeout(resolve, 500)); // レート制限対策
    }

    console.log('✅ 5件の口コミを投稿完了！');
    console.log('');
    console.log('📊 統計:');
    console.log(`  ⭐3: 2件`);
    console.log(`  ⭐4: 3件`);
    console.log(`  平均評価: 3.6`);
    console.log('');
    console.log('🎉 次のステップ:');
    console.log('  1. ランキング確認: node scripts/check-nankan-ranking.cjs');
    console.log('  2. サイトでの表示確認: https://keiba-review.jp/keiba-yosou/nankan-analytics/');
    console.log('  3. Netlifyで再ビルド: 数分後に自動デプロイされます');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
})();
