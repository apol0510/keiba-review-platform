/**
 * すべてのサイト（承認済み・未承認含む）のカテゴリをチェック
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function checkAllCategories() {
  console.log('📊 すべてのサイトのカテゴリを確認中...\n');

  // すべてのサイトを取得（承認・未承認含む）
  const allSites = await base('Sites').select().all();

  const byCategory = {
    chuo: [],
    nankan: [],
    chihou: [],
    other: [],
    undefined: [],
    null: []
  };

  allSites.forEach(site => {
    const category = site.fields.Category;
    const isApproved = site.fields.IsApproved || false;

    const siteInfo = {
      id: site.id,
      name: site.fields.Name,
      slug: site.fields.Slug,
      isApproved,
      category
    };

    if (!category || category === '') {
      byCategory.null.push(siteInfo);
    } else if (byCategory[category]) {
      byCategory[category].push(siteInfo);
    } else {
      if (!byCategory.undefined) byCategory.undefined = [];
      byCategory.undefined.push(siteInfo);
    }
  });

  console.log('📈 カテゴリ別サイト数（全サイト）:\n');
  console.log(`  中央競馬（chuo）: ${byCategory.chuo.length}件`);
  console.log(`  南関競馬（nankan）: ${byCategory.nankan.length}件`);
  console.log(`  地方競馬（chihou）: ${byCategory.chihou.length}件`);
  console.log(`  その他（other）: ${byCategory.other.length}件`);
  console.log(`  カテゴリなし（null/undefined）: ${byCategory.null.length}件`);
  console.log(`\n  合計: ${allSites.length}サイト\n`);

  if (byCategory.other.length > 0) {
    console.log('\n❌ 「その他（other）」カテゴリのサイト:\n');
    byCategory.other.forEach((site, i) => {
      const status = site.isApproved ? '✅承認済み' : '❌未承認';
      console.log(`${i + 1}. [${status}] ${site.name}`);
      console.log(`   ID: ${site.id}`);
      console.log(`   Category: ${site.category}\n`);
    });
  }

  if (byCategory.null.length > 0) {
    console.log('\n⚠️  カテゴリが設定されていないサイト:\n');
    byCategory.null.forEach((site, i) => {
      const status = site.isApproved ? '✅承認済み' : '❌未承認';
      console.log(`${i + 1}. [${status}] ${site.name}`);
      console.log(`   ID: ${site.id}\n`);
    });
  }

  return byCategory;
}

checkAllCategories().catch(console.error);
