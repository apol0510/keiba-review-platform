#!/usr/bin/env node

/**
 * 口コミ自動投稿スクリプト
 *
 * 既存のサイトにリアルな口コミを自動生成・投稿
 *
 * 使用方法:
 * AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-reviews.js
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('使用方法:');
  console.error('AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-reviews.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// リアルな口コミテンプレート（評価別）
const reviewTemplates = {
  5: [
    {
      titles: ['的中率が素晴らしい！', '信頼できる予想サイト', '当たりまくりです', '期待以上の結果'],
      templates: [
        '{period}利用していますが、的中率が非常に高く満足しています。特に{race}の予想は的確で、{result}。料金も妥当で、コストパフォーマンスは最高です。',
        '初めて利用しましたが、{result}。{race}を中心に利用していますが、予想の根拠がしっかりしていて信頼できます。今後も継続利用する予定です。',
        '{period}会員ですが、予想の質が高く満足しています。{race}で{result}。サポートも丁寧で、初心者にもおすすめできます。',
      ],
    },
  ],
  4: [
    {
      titles: ['概ね満足', '良いサイトです', 'コスパ良し', '安定した予想'],
      templates: [
        '{period}利用中です。的中率は{rate}くらいで、安定しています。{race}が得意な印象。料金もリーズナブルで続けやすいです。',
        '全体的には満足していますが、{issue}。それでも{race}の予想は参考になるので、継続利用しています。',
        '予想の質は良いと思います。{period}で{result}。ただ、{issue}ので、星4つにしました。',
      ],
    },
  ],
  3: [
    {
      titles: ['可もなく不可もなく', '普通のサイト', '改善の余地あり', 'まあまあかな'],
      templates: [
        '{period}使ってみましたが、{issue}。{race}はそこそこ当たりますが、期待したほどではありませんでした。',
        '的中率は{rate}程度で、平均的な印象です。{issue}が改善されれば、もっと良くなると思います。',
        '悪くはないですが、特別良いとも言えません。{race}の予想を参考にしていますが、{issue}。',
      ],
    },
  ],
  2: [
    {
      titles: ['期待外れ', 'あまりおすすめしない', '的中率が低い', '改善が必要'],
      templates: [
        '{period}試しましたが、{issue}でした。{race}の予想も外れることが多く、リピートはないと思います。',
        '期待していましたが、{issue}。的中率も低く、料金に見合う価値を感じませんでした。',
        '{issue}で、満足度は低いです。{race}でも思ったような結果が出ず、残念でした。',
      ],
    },
  ],
  1: [
    {
      titles: ['全く当たらない', 'おすすめできません', '最悪でした', '時間の無駄'],
      templates: [
        '全く当たりませんでした。{issue}で、信頼性に疑問を感じます。おすすめできません。',
        '{period}利用しましたが、{issue}。予想も的外れで、お金の無駄でした。',
        '{issue}で、非常に不満です。{race}の予想も全く参考にならず、解約しました。',
      ],
    },
  ],
};

// 置換用変数
const periods = ['1ヶ月', '2ヶ月', '3ヶ月', '半年', '1年'];
const races = ['南関競馬', '中央競馬', '地方競馬', '重賞レース', 'ナイター競馬'];
const results = [
  '3連勝できました',
  '投資金額の2倍回収できました',
  '的中率7割を達成',
  'トリガミにならずに利益が出ました',
  '万馬券を的中させることができました',
];
const rates = ['5〜6割', '6〜7割', '7割前後', '7〜8割'];
const issues = [
  '情報の更新が遅いことがある',
  'サポートの対応が遅い',
  '無料予想の精度がイマイチ',
  '料金がやや高め',
  '買い目の点数が多すぎる',
  '予想の根拠が不明確なことがある',
  '人気馬に偏りがち',
];

// ランダムなユーザー名を生成
const userNames = [
  '競馬太郎', '馬券師', '競馬ファン', 'うまうま', 'けいばマニア',
  '南関応援団', '地方競馬ラバー', 'JRA信者', '予想屋', '的中王',
  '競馬初心者', 'ベテラン馬券師', 'サラリーマン馬券', '主婦の競馬',
  '学生馬券', '競馬歴10年', '週末競馬', 'ナイター専門',
];

/**
 * ランダムな要素を選択
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 口コミテキストを生成
 */
function generateReview(rating) {
  const template = randomChoice(reviewTemplates[rating]);
  const title = randomChoice(template.titles);
  const contentTemplate = randomChoice(template.templates);

  const content = contentTemplate
    .replace('{period}', randomChoice(periods))
    .replace('{race}', randomChoice(races))
    .replace('{result}', randomChoice(results))
    .replace('{rate}', randomChoice(rates))
    .replace('{issue}', randomChoice(issues));

  return { title, content };
}

/**
 * Airtableから全サイトを取得
 */
async function getAllSites() {
  try {
    const response = await fetch(`${API_URL}/Sites?filterByFormula={IsApproved}=TRUE()`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API エラー: ${response.status}`);
    }

    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error('❌ サイト取得エラー:', error.message);
    return [];
  }
}

/**
 * 口コミをAirtableに投稿
 */
async function postReview(siteId, siteName, review) {
  try {
    const userName = randomChoice(userNames) + Math.floor(Math.random() * 100);
    const userEmail = `${userName.toLowerCase().replace(/\s+/g, '')}@example.com`;

    const response = await fetch(`${API_URL}/Reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Site: [siteId],
              UserName: userName,
              UserEmail: userEmail,
              Rating: review.rating,
              Title: review.title,
              Content: review.content,
              IsApproved: true, // デモ用なので自動承認
              IsSpam: false,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
    }

    console.log(`  ✅ 口コミ投稿完了: ${review.title} (評価: ${review.rating}★)`);
    return true;
  } catch (error) {
    console.error(`  ❌ 投稿エラー:`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 口コミ自動投稿を開始します\n');

  // 全サイトを取得
  const sites = await getAllSites();
  console.log(`📊 対象サイト数: ${sites.length}件\n`);

  if (sites.length === 0) {
    console.log('⚠️  承認済みサイトが見つかりませんでした');
    return;
  }

  let totalReviews = 0;
  let successCount = 0;
  let failCount = 0;

  // 各サイトに3〜8件の口コミを投稿
  for (const site of sites) {
    const fields = site.fields;
    const siteName = fields.Name || 'unknown';
    const siteId = site.id;

    // ランダムな口コミ数（3〜8件）
    const reviewCount = Math.floor(Math.random() * 6) + 3;

    console.log(`\n🌐 ${siteName} に ${reviewCount} 件の口コミを投稿`);

    for (let i = 0; i < reviewCount; i++) {
      // 評価の分布: 5★=30%, 4★=40%, 3★=20%, 2★=8%, 1★=2%
      const rand = Math.random();
      let rating;
      if (rand < 0.3) rating = 5;
      else if (rand < 0.7) rating = 4;
      else if (rand < 0.9) rating = 3;
      else if (rand < 0.98) rating = 2;
      else rating = 1;

      const review = generateReview(rating);
      review.rating = rating;

      const success = await postReview(siteId, siteName, review);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      totalReviews++;

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('\n\n🎉 処理完了');
  console.log(`📝 投稿した口コミ数: ${totalReviews}件`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${failCount}件`);
  console.log('\n次のステップ:');
  console.log('1. Airtableで口コミを確認');
  console.log('2. サイトで口コミが表示されるか確認');
  console.log('3. 必要に応じて追加の口コミを投稿');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
