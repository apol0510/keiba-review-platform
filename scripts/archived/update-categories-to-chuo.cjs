/**
 * 「その他(other)」カテゴリのサイトを「中央競馬(chuo)」に一括変更
 *
 * 使い方:
 * node scripts/update-categories-to-chuo.cjs
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
 * サイト名から自動カテゴリ判定
 */
function detectCategory(siteName, siteUrl = '') {
  const name = siteName.toLowerCase();
  const url = siteUrl.toLowerCase();

  // 南関競馬の明確なキーワード
  const nankanKeywords = ['南関', 'nankan', '大井競馬', '川崎競馬', '船橋競馬', '浦和競馬'];
  if (nankanKeywords.some(keyword => name.includes(keyword) || url.includes(keyword))) {
    return 'nankan';
  }

  // 地方競馬の明確なキーワード（南関以外）
  const chihouKeywords = ['地方競馬', 'nar', '園田', '金沢', '名古屋競馬', '高知競馬', '笠松', '盛岡', '門別', '帯広'];
  if (chihouKeywords.some(keyword => name.includes(keyword) || url.includes(keyword))) {
    return 'chihou';
  }

  // デフォルトは中央競馬（JRA）
  return 'chuo';
}

async function updateCategories() {
  console.log('🚀 カテゴリ一括更新を開始\n');

  // 全サイトを取得
  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

  console.log(`📊 全${records.length}サイトを取得しました\n`);

  // その他（other）のサイトを抽出
  const otherSites = records.filter(record => {
    const category = record.fields.Category || 'other';
    return category === 'other';
  });

  console.log(`📝 その他（other）のサイト: ${otherSites.length}件\n`);

  if (otherSites.length === 0) {
    console.log('✅ 更新対象のサイトはありません');
    return;
  }

  // カテゴリ判定結果を集計
  const updatePlan = {
    chuo: [],
    nankan: [],
    chihou: []
  };

  otherSites.forEach(record => {
    const name = record.fields.Name;
    const url = record.fields.URL || '';
    const detectedCategory = detectCategory(name, url);

    updatePlan[detectedCategory].push({
      id: record.id,
      name,
      category: detectedCategory
    });
  });

  console.log('📊 カテゴリ判定結果:\n');
  console.log(`  中央競馬（chuo）: ${updatePlan.chuo.length}件`);
  console.log(`  南関競馬（nankan）: ${updatePlan.nankan.length}件`);
  console.log(`  地方競馬（chihou）: ${updatePlan.chihou.length}件\n`);

  // 南関競馬のサイト一覧
  if (updatePlan.nankan.length > 0) {
    console.log('🏇 南関競馬に変更するサイト:');
    updatePlan.nankan.forEach((site, i) => {
      console.log(`  ${i + 1}. ${site.name}`);
    });
    console.log('');
  }

  // 地方競馬のサイト一覧
  if (updatePlan.chihou.length > 0) {
    console.log('🐴 地方競馬に変更するサイト:');
    updatePlan.chihou.forEach((site, i) => {
      console.log(`  ${i + 1}. ${site.name}`);
    });
    console.log('');
  }

  console.log(`🔄 ${otherSites.length}件のサイトを更新します...\n`);

  let successCount = 0;
  let failCount = 0;

  // 全サイトを更新
  for (const category of ['chuo', 'nankan', 'chihou']) {
    for (const site of updatePlan[category]) {
      try {
        await base('Sites').update(site.id, {
          Category: site.category
        });

        console.log(`  ✅ ${site.name} → ${site.category}`);
        successCount++;

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ❌ ${site.name} → エラー: ${error.message}`);
        failCount++;
      }
    }
  }

  console.log('\n✅ カテゴリ更新完了\n');
  console.log('📊 結果サマリー:');
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${failCount}件`);
  console.log(`  合計: ${otherSites.length}件`);
}

updateCategories().catch(console.error);
