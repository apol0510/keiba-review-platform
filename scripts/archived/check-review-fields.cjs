const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

const base = new Airtable({ apiKey }).base(baseId);

base('Reviews').select({
  maxRecords: 1,
  view: 'Grid view'
}).firstPage((err, records) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Review fields:');
  console.log(JSON.stringify(records[0].fields, null, 2));
});
