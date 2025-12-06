const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

function getSiteRating(siteQuality) {
  const quality = siteQuality || 'normal';

  if (quality === 'excellent') {
    return {
      type: 'excellent',
      starRange: [3, 4],
      weighted: true,
      probability: 1.0
    };
  }

  if (quality === 'malicious') {
    return {
      type: 'malicious',
      starRange: [1, 3],
      probability: 0.2
    };
  }

  return {
    type: 'normal',
    starRange: [2, 4],
    weighted: true,
    probability: 0.33
  };
}

async function main() {
  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'Category', 'Reviews', 'SiteQuality']
  }).all();

  const nankanSite = records.find(r => r.fields.Name && r.fields.Name.includes('南関競馬な日々'));

  if (nankanSite) {
    const siteQuality = nankanSite.fields.SiteQuality;
    const rating = getSiteRating(siteQuality);
    const reviews = nankanSite.fields.Reviews || [];
    const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

    console.log('\n✅ Found:', nankanSite.fields.Name);
    console.log('\n📋 Airtable Data:');
    console.log('  SiteQuality field:', siteQuality || '(undefined)');
    console.log('  Review count:', reviewCount);

    console.log('\n⚙️  getSiteRating() Result:');
    console.log('  type:', rating.type);
    console.log('  starRange:', rating.starRange);
    console.log('  weighted:', rating.weighted);
    console.log('  probability:', rating.probability);

    console.log('\n🔍 Analysis:');
    if (siteQuality === 'excellent') {
      console.log('  ✅ SiteQuality is correctly set to "excellent"');
      console.log('  ✅ Rating type is "excellent" (will use ⭐3-4)');
      console.log('  ✅ Posting probability is 100% (every day)');
    } else {
      console.log(`  ❌ ERROR: SiteQuality is "${siteQuality || 'undefined'}", expected "excellent"`);
      console.log('  ❌ This will cause ⭐2 to be used!');
    }
  } else {
    console.log('❌ Site not found');
  }
}

main().catch(console.error);
