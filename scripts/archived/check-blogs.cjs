const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function checkBlogs() {
  const sites = [];

  await base('Sites').select({
    view: 'Grid view',
    filterByFormula: 'IsApproved = TRUE()'
  }).eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      sites.push({
        name: record.get('Name'),
        url: record.get('URL'),
        category: record.get('Category')
      });
    });
    fetchNextPage();
  });

  console.log(`\n📊 承認済みサイト: ${sites.length}件\n`);

  const blogKeywords = ['ブログ', 'blog', 'Blog', 'BLOG'];
  const blogs = sites.filter(s =>
    blogKeywords.some(keyword => s.name.includes(keyword) || s.url.includes(keyword))
  );

  console.log(`📝 ブログと判定されるサイト: ${blogs.length}件\n`);

  if (blogs.length > 0) {
    console.log('ブログ一覧:');
    blogs.forEach((b, i) => {
      console.log(`${i+1}. ${b.name}`);
      console.log(`   URL: ${b.url}`);
      console.log(`   カテゴリ: ${b.category}\n`);
    });
  }

  const siteKeywords = ['サイト', 'site', 'Site', 'SITE', '予想会社', '情報会社'];
  const predictiveSites = sites.filter(s =>
    siteKeywords.some(keyword => s.name.includes(keyword))
  );

  console.log(`\n🌐 明確に「サイト」と判定: ${predictiveSites.length}件`);
  console.log(`❓ どちらでもない（ブログでもサイトでもない）: ${sites.length - blogs.length - predictiveSites.length}件`);

  const ratios = {
    blogs: Math.round(blogs.length / sites.length * 100),
    sites: Math.round(predictiveSites.length / sites.length * 100),
    other: Math.round((sites.length - blogs.length - predictiveSites.length) / sites.length * 100)
  };

  console.log(`\n📊 割合:`);
  console.log(`  ブログ: ${ratios.blogs}%`);
  console.log(`  サイト: ${ratios.sites}%`);
  console.log(`  その他: ${ratios.other}%`);
}

checkBlogs().catch(console.error);
