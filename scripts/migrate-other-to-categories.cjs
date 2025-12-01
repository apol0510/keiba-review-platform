/**
 * 「other」カテゴリのサイトを適切なカテゴリに移行
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * サイト名とURLからカテゴリを判定
 */
function detectCategory(siteName, siteUrl = '') {
  const name = siteName.toLowerCase();
  const url = siteUrl.toLowerCase();
  const text = `${name} ${url}`;

  // 南関競馬のキーワード
  const nankanKeywords = [
    '南関', 'nankan', 'ナンカン',
    '大井競馬', '大井', '川崎競馬', '川崎',
    '船橋競馬', '船橋', '浦和競馬', '浦和',
    'tcknews', 'ooi', 'kawasaki', 'funabashi', 'urawa'
  ];

  // 地方競馬のキーワード
  const chihouKeywords = [
    '地方競馬', 'nar', '園田', '金沢', '名古屋', '高知',
    '佐賀', '門別', '盛岡', '水沢', '浦和', '船橋',
    'sonoda', 'kanazawa', 'nagoya', 'kochi'
  ];

  // 南関競馬チェック
  if (nankanKeywords.some(keyword => text.includes(keyword))) {
    return 'nankan';
  }

  // 地方競馬チェック
  if (chihouKeywords.some(keyword => text.includes(keyword))) {
    return 'chihou';
  }

  // デフォルトは中央競馬
  return 'chuo';
}

async function migrateOtherSites() {
  console.log('🔄 「other」カテゴリのサイトを移行中...\n');

  // 「other」カテゴリのサイトを取得
  const sites = await base('Sites').select({
    filterByFormula: "{Category} = 'other'"
  }).all();

  console.log(`📊 対象サイト: ${sites.length}件\n`);

  if (sites.length === 0) {
    console.log('✅ 「other」カテゴリのサイトはありません');
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const site of sites) {
    const siteId = site.id;
    const siteName = site.fields.Name;
    const siteUrl = site.fields.URL || '';
    const isApproved = site.fields.IsApproved || false;

    const newCategory = detectCategory(siteName, siteUrl);

    console.log(`${updated + 1}. ${siteName}`);
    console.log(`   現在: other → 新: ${newCategory}`);
    console.log(`   状態: ${isApproved ? '✅承認済み' : '❌未承認'}`);

    try {
      await base('Sites').update(siteId, {
        Category: newCategory
      });
      console.log(`   ✅ 更新成功\n`);
      updated++;

      // レート制限を避ける
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`   ❌ 更新失敗: ${error.message}\n`);
      errors++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 移行完了\n');
  console.log(`📊 結果:`);
  console.log(`  成功: ${updated}件`);
  console.log(`  失敗: ${errors}件`);
  console.log(`  合計: ${sites.length}件`);
}

migrateOtherSites().catch(console.error);
