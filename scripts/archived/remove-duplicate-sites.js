/**
 * 重複サイト削除スクリプト
 *
 * 同じSlug（ドメイン）を持つサイトが複数ある場合、
 * 最も古いものを残して、他を削除します。
 */

import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID が必要です');
  process.exit(1);
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 重複サイトのクリーンアップを開始します\n');

  try {
    // 全サイトを取得
    const records = await base('Sites')
      .select({
        // すべてのサイトを対象
      })
      .all();

    console.log(`📊 総サイト数: ${records.length}件\n`);

    // Slugでグループ化
    const slugGroups = new Map();

    for (const record of records) {
      const slug = record.fields.Slug || '';
      const name = record.fields.Name || '名前なし';
      const isApproved = record.fields.IsApproved || false;
      const createdTime = record._rawJson.createdTime;

      if (!slug) continue;

      if (!slugGroups.has(slug)) {
        slugGroups.set(slug, []);
      }

      slugGroups.get(slug).push({
        id: record.id,
        slug,
        name,
        isApproved,
        createdTime,
        url: record.fields.URL || '',
      });
    }

    // 重複を見つける
    const duplicates = [];
    for (const [slug, sites] of slugGroups.entries()) {
      if (sites.length > 1) {
        duplicates.push({ slug, sites });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ 重複サイトはありませんでした');
      return;
    }

    console.log(`❌ 重複発見: ${duplicates.length}件のSlugに重複あり\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const toDelete = [];

    for (const { slug, sites } of duplicates) {
      console.log(`📍 Slug: ${slug} (${sites.length}件)`);

      // ソート: 承認済み優先 → 作成日時が古い順
      sites.sort((a, b) => {
        if (a.isApproved !== b.isApproved) {
          return b.isApproved ? 1 : -1; // 承認済みを優先
        }
        return new Date(a.createdTime) - new Date(b.createdTime); // 古い順
      });

      // 最初の1件を保持、残りを削除
      const keep = sites[0];
      const remove = sites.slice(1);

      console.log(`  ✅ 保持: ${keep.name} (${keep.isApproved ? '承認済み' : '未承認'})`);
      console.log(`     - ID: ${keep.id}`);
      console.log(`     - URL: ${keep.url}`);
      console.log(`     - 作成日: ${keep.createdTime}\n`);

      for (const site of remove) {
        console.log(`  ❌ 削除: ${site.name} (${site.isApproved ? '承認済み' : '未承認'})`);
        console.log(`     - ID: ${site.id}`);
        console.log(`     - URL: ${site.url}`);
        console.log(`     - 作成日: ${site.createdTime}\n`);
        toDelete.push(site);
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`削除予定: ${toDelete.length}件のサイト\n`);

    if (toDelete.length === 0) {
      console.log('削除するサイトはありません');
      return;
    }

    // 削除実行（10件ずつバッチ処理）
    console.log('🗑️  削除を実行中...\n');

    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10);
      await base('Sites').destroy(batch.map(s => s.id));
      console.log(`  ✓ ${i + 1}〜${Math.min(i + 10, toDelete.length)}件目を削除`);
    }

    console.log(`\n✅ ${toDelete.length}件の重複サイトを削除しました`);
    console.log(`\n残りサイト数: ${records.length - toDelete.length}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
