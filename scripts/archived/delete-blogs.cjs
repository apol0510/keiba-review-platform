const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

/**
 * ブログを削除するスクリプト
 *
 * 競馬予想ブログ（無料で予想記事を公開）と
 * 競馬予想サイト（有料で予想を販売）を明確に区別するため、
 * ブログをデータベースから削除します。
 */
async function deleteBlogs() {
  console.log('\n🔍 競馬予想ブログの削除を開始します\n');

  // ブログを検出
  const blogKeywords = ['ブログ', 'blog', 'Blog', 'BLOG'];
  const blogsToDelete = [];

  await base('Sites').select({
    view: 'Grid view',
    filterByFormula: 'IsApproved = TRUE()'
  }).eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      const name = record.get('Name') || '';
      const url = record.get('URL') || '';

      const isBlog = blogKeywords.some(keyword =>
        name.includes(keyword) || url.includes(keyword)
      );

      if (isBlog) {
        blogsToDelete.push({
          id: record.id,
          name: name,
          url: url,
          category: record.get('Category')
        });
      }
    });
    fetchNextPage();
  });

  console.log(`📝 検出されたブログ: ${blogsToDelete.length}件\n`);

  if (blogsToDelete.length === 0) {
    console.log('✅ 削除対象のブログはありません');
    return;
  }

  // 削除対象を表示
  console.log('以下のブログを削除します:\n');
  blogsToDelete.forEach((blog, i) => {
    console.log(`${i + 1}. ${blog.name}`);
    console.log(`   URL: ${blog.url}`);
    console.log(`   カテゴリ: ${blog.category}\n`);
  });

  // 削除実行
  console.log('🗑️  削除を開始します...\n');

  let deletedCount = 0;
  let errorCount = 0;

  for (const blog of blogsToDelete) {
    try {
      await base('Sites').destroy(blog.id);
      console.log(`✅ 削除完了: ${blog.name}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ 削除失敗: ${blog.name}`);
      console.error(`   エラー: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 削除結果:`);
  console.log(`  成功: ${deletedCount}件`);
  console.log(`  失敗: ${errorCount}件`);

  if (deletedCount > 0) {
    console.log(`\n✅ ${deletedCount}件のブログを削除しました`);
    console.log('📌 このプラットフォームは「競馬予想サイト（有料予想販売）」のみを扱います');
  }
}

deleteBlogs().catch(console.error);
