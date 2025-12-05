const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function checkOrder() {
  console.log('📊 現在のサイト表示順序を確認\n');

  const sites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'DisplayPriority'],
    sort: [{ field: 'DisplayPriority', direction: 'desc' }, { field: 'CreatedAt', direction: 'desc' }]
  }).all();

  console.log('DisplayPriority順（上位20件）:\n');
  sites.slice(0, 20).forEach((site, i) => {
    const name = site.fields.Name;
    const priority = site.fields.DisplayPriority || 0;
    const shortName = name.length > 50 ? name.substring(0, 50) + '...' : name;
    console.log(`${i + 1}. [P:${priority}] ${shortName}`);
  });

  console.log(`\n合計: ${sites.length}サイト\n`);

  // 南関競馬な日々の位置を確認
  const nankanIndex = sites.findIndex(s => s.fields.Name.includes('南関競馬な日々'));
  if (nankanIndex !== -1) {
    console.log(`🏆南関競馬な日々: ${nankanIndex + 1}位 (Priority: ${sites[nankanIndex].fields.DisplayPriority})`);
  }
}

checkOrder().catch(console.error);
