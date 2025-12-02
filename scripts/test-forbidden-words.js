/**
 * 禁止ワードフィルターのテストスクリプト
 * カテゴリ別禁止ワード + 自動投稿専用NGワードのテスト
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

const autoPostForbiddenWords = [
  // サポート関連
  'サポート', '対応が遅い', '返信がない', '連絡が取れない', '問い合わせ',

  // 詐欺・悪質系
  '詐欺', '騙された', '悪質', '詐欺サイト', '詐欺まがい',

  // 具体的批判
  '最悪', 'ひどい', '金返せ', '返金', '被害',
  '訴える', '通報', '警察', '弁護士'
];

function containsForbiddenWords(text, category) {
  const forbiddenWords = categoryForbiddenWords[category] || [];

  for (const word of forbiddenWords) {
    if (text.includes(word)) {
      return true;
    }
  }

  return false;
}

function containsAutoPostForbiddenWords(text) {
  for (const word of autoPostForbiddenWords) {
    if (text.includes(word)) {
      return true;
    }
  }
  return false;
}

// テストケース
const testCases = [
  // 中央競馬カテゴリのテスト
  { text: 'ナイター競馬で的中しました', category: 'chuo', expected: true },
  { text: '南関競馬の予想が当たった', category: 'chuo', expected: true },
  { text: '大井競馬で高配当', category: 'chuo', expected: true },
  { text: 'JRAの予想が的中', category: 'chuo', expected: false },
  { text: '中央競馬で高配当', category: 'chuo', expected: false },
  { text: '東京競馬場での予想', category: 'chuo', expected: false },

  // 南関競馬カテゴリのテスト
  { text: 'G1レースの予想', category: 'nankan', expected: true },
  { text: '有馬記念の予想', category: 'nankan', expected: true },
  { text: '大井競馬で的中', category: 'nankan', expected: false },
  { text: '南関競馬の予想', category: 'nankan', expected: false },
  { text: 'ナイター競馬で勝利', category: 'nankan', expected: false },

  // 地方競馬カテゴリのテスト
  { text: 'JRAの予想', category: 'chihou', expected: true },
  { text: '南関競馬の予想', category: 'chihou', expected: true },
  { text: '園田競馬で的中', category: 'chihou', expected: false },
  { text: '金沢競馬の予想', category: 'chihou', expected: false },
];

// 自動投稿NGワードのテストケース
const autoPostTestCases = [
  { text: 'サポート対応が遅い', expected: true },
  { text: '返信がない', expected: true },
  { text: '詐欺サイトだ', expected: true },
  { text: '最悪のサイト', expected: true },
  { text: '金返せ', expected: true },
  { text: '普通の予想サイト', expected: false },
  { text: '的中率が高い', expected: false },
  { text: '無料予想が当たる', expected: false },
];

console.log('🧪 禁止ワードフィルターのテスト\n');
console.log('━'.repeat(80) + '\n');

let passCount = 0;
let failCount = 0;

console.log('📋 Part 1: カテゴリ別禁止ワード\n');

testCases.forEach((test, i) => {
  const result = containsForbiddenWords(test.text, test.category);
  const isPassed = result === test.expected;
  const status = isPassed ? '✅ PASS' : '❌ FAIL';

  if (isPassed) {
    passCount++;
  } else {
    failCount++;
  }

  console.log(`${status} テスト${i + 1}`);
  console.log(`  口コミ: "${test.text}"`);
  console.log(`  カテゴリ: ${test.category}`);
  console.log(`  期待値: ${test.expected ? '🚫 禁止' : '✅ 許可'}`);
  console.log(`  結果: ${result ? '🚫 禁止' : '✅ 許可'}`);
  console.log('');
});

console.log('\n📋 Part 2: 自動投稿専用NGワード\n');

autoPostTestCases.forEach((test, i) => {
  const result = containsAutoPostForbiddenWords(test.text);
  const isPassed = result === test.expected;
  const status = isPassed ? '✅ PASS' : '❌ FAIL';

  if (isPassed) {
    passCount++;
  } else {
    failCount++;
  }

  console.log(`${status} テスト${testCases.length + i + 1}`);
  console.log(`  口コミ: "${test.text}"`);
  console.log(`  期待値: ${test.expected ? '🚫 禁止' : '✅ 許可'}`);
  console.log(`  結果: ${result ? '🚫 禁止' : '✅ 許可'}`);
  console.log('');
});

console.log('━'.repeat(80));
console.log(`\n📊 テスト結果: ${passCount}/${testCases.length + autoPostTestCases.length} 成功`);

if (failCount === 0) {
  console.log('\n🎉 すべてのテストに合格しました！');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failCount}件のテストが失敗しました`);
  process.exit(1);
}
