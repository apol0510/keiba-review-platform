const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function checkCategories() {
  console.log('📊 サイトのカテゴリ分布を確認中...\n');

  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

  const categoryCount = {
    chuo: [],
    nankan: [],
    chihou: [],
    other: []
  };

  records.forEach(record => {
    const category = record.fields.Category || 'other';
    const name = record.fields.Name;
    categoryCount[category].push(name);
  });

  console.log('📈 カテゴリ別サイト数:\n');
  console.log(`  中央競馬（chuo）: ${categoryCount.chuo.length}件`);
  console.log(`  南関競馬（nankan）: ${categoryCount.nankan.length}件`);
  console.log(`  地方競馬（chihou）: ${categoryCount.chihou.length}件`);
  console.log(`  その他（other）: ${categoryCount.other.length}件`);

  console.log('\n📝 その他（other）のサイト一覧:\n');
  categoryCount.other.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });

  console.log(`\n合計: ${records.length}サイト`);
}

checkCategories().catch(console.error);
