const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.log('❌ Environment variables not set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

console.log('📊 Checking Airtable data...\n');

// Check total reviews
base('Reviews').select({
  view: 'Grid view'
}).all((err, records) => {
  if (err) {
    console.error('❌ Error fetching reviews:', err);
    return;
  }

  console.log(`📝 Total Reviews: ${records.length}`);

  const approved = records.filter(r => r.fields.IsApproved);
  const pending = records.filter(r => !r.fields.IsApproved);

  console.log(`  ✅ Approved: ${approved.length}`);
  console.log(`  ⏳ Pending: ${pending.length}`);

  if (records.length > 0) {
    console.log('\n📋 Sample reviews:');
    records.slice(0, 3).forEach((record, i) => {
      console.log(`  ${i + 1}. Site: ${record.fields.Site}, Rating: ${record.fields.Rating}, Approved: ${record.fields.IsApproved || false}`);
    });
  }
});

// Check total sites
setTimeout(() => {
  base('Sites').select({
    view: 'Grid view'
  }).all((err, records) => {
    if (err) {
      console.error('\n❌ Error fetching sites:', err);
      return;
    }

    console.log(`\n🌐 Total Sites: ${records.length}`);

    const approved = records.filter(r => r.fields.IsApproved);
    const pending = records.filter(r => !r.fields.IsApproved);

    console.log(`  ✅ Approved: ${approved.length}`);
    console.log(`  ⏳ Pending: ${pending.length}`);

    if (records.length > 0) {
      console.log('\n📋 Sample sites:');
      records.slice(0, 3).forEach((record, i) => {
        const hasScreenshot = !!record.fields.ScreenshotURL;
        console.log(`  ${i + 1}. ${record.fields.Name}, Screenshot: ${hasScreenshot ? '✅' : '❌'}, Approved: ${record.fields.IsApproved || false}`);
      });
    }
  });
}, 1000);
