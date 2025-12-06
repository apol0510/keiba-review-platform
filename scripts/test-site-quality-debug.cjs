/**
 * SiteQualityフィールドの読み込みをデバッグするスクリプト
 */

const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// getSiteRating関数（スクリプトと同じ）
function getSiteRating(siteQuality) {
  const quality = siteQuality || 'normal';

  console.log(`  [DEBUG] getSiteRating called with: "${siteQuality}" (type: ${typeof siteQuality})`);
  console.log(`  [DEBUG] After default: "${quality}"`);

  if (quality === 'excellent') {
    console.log(`  [DEBUG] ✅ Matched 'excellent'`);
    return {
      type: 'excellent',
      starRange: [3, 4],
      weighted: true,
      probability: 1.0
    };
  }

  if (quality === 'malicious') {
    console.log(`  [DEBUG] ✅ Matched 'malicious'`);
    return {
      type: 'malicious',
      starRange: [1, 3],
      probability: 0.2
    };
  }

  console.log(`  [DEBUG] ⚠️  No match, returning 'normal'`);
  return {
    type: 'normal',
    starRange: [2, 4],
    weighted: true,
    probability: 0.33
  };
}

async function main() {
  console.log('🔍 SiteQuality読み込みデバッグテスト\n');

  // 🏆南関競馬な日々🏆を検索
  const records = await base('Sites').select({
    filterByFormula: 'SEARCH("南関競馬な日々", {Name})',
    fields: ['Name', 'Category', 'SiteQuality'],
    maxRecords: 1
  }).all();

  if (records.length === 0) {
    console.error('❌ Site not found');
    return;
  }

  const site = records[0];
  console.log('📋 Airtable Record:');
  console.log(`  ID: ${site.id}`);
  console.log(`  Name: ${site.fields.Name}`);
  console.log(`  Category: ${site.fields.Category}`);
  console.log(`  SiteQuality: ${site.fields.SiteQuality}`);
  console.log(`  SiteQuality type: ${typeof site.fields.SiteQuality}`);
  console.log(`  Is undefined? ${site.fields.SiteQuality === undefined}`);
  console.log(`  Is null? ${site.fields.SiteQuality === null}`);
  console.log(`  Is empty string? ${site.fields.SiteQuality === ''}`);

  console.log('\n🔧 getSiteRating() Test:');
  const rating = getSiteRating(site.fields.SiteQuality);

  console.log('\n📊 Result:');
  console.log(`  type: ${rating.type}`);
  console.log(`  starRange: [${rating.starRange[0]}, ${rating.starRange[1]}]`);
  console.log(`  probability: ${rating.probability}`);

  console.log('\n✅ Expected:');
  console.log('  type: excellent');
  console.log('  starRange: [3, 4]');
  console.log('  probability: 1.0');

  if (rating.type === 'excellent') {
    console.log('\n🎉 SUCCESS! SiteQuality is correctly read as "excellent"');
  } else {
    console.log(`\n❌ FAIL! SiteQuality is "${rating.type}" instead of "excellent"`);
  }
}

main().catch(console.error);
