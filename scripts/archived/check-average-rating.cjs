const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.log('❌ Environment variables not set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

console.log('📊 Checking Average Rating field...\n');

base('Sites').select({
  filterByFormula: '{IsApproved} = TRUE()',
  maxRecords: 10
}).firstPage((err, records) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log(`Found ${records.length} approved sites:\n`);

  records.forEach((record, i) => {
    const name = record.fields.Name;
    const reviews = record.fields.Reviews;
    const reviewCount = reviews ? reviews.length : 0;
    const averageRating = record.fields['Average Rating'];

    console.log(`${i + 1}. ${name}`);
    console.log(`   Reviews field: ${reviewCount} records`);
    console.log(`   Average Rating field: ${averageRating}`);
    console.log('');
  });
});
