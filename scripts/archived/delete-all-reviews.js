#!/usr/bin/env node

/**
 * 全口コミ削除スクリプト
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

async function getAllReviews() {
  try {
    let allRecords = [];
    let offset = null;

    do {
      const url = offset
        ? `${API_URL}/Reviews?offset=${offset}`
        : `${API_URL}/Reviews`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API エラー: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    return allRecords;
  } catch (error) {
    console.error('❌ 口コミ取得エラー:', error.message);
    return [];
  }
}

async function deleteReviews(recordIds) {
  // Airtableは一度に最大10件まで削除可能
  const batches = [];
  for (let i = 0; i < recordIds.length; i += 10) {
    batches.push(recordIds.slice(i, i + 10));
  }

  let deletedCount = 0;

  for (const batch of batches) {
    try {
      const queryString = batch.map(id => `records[]=${id}`).join('&');
      const response = await fetch(`${API_URL}/Reviews?${queryString}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`削除エラー: ${response.status}`);
      }

      deletedCount += batch.length;
      console.log(`  ✅ ${batch.length}件削除（累計: ${deletedCount}件）`);

      // API制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ バッチ削除エラー:`, error.message);
    }
  }

  return deletedCount;
}

async function main() {
  console.log('🗑️  全口コミ削除を開始します\n');

  const reviews = await getAllReviews();
  console.log(`📊 削除対象: ${reviews.length}件\n`);

  if (reviews.length === 0) {
    console.log('⚠️  削除する口コミがありません');
    return;
  }

  const recordIds = reviews.map(r => r.id);
  const deletedCount = await deleteReviews(recordIds);

  console.log(`\n🎉 削除完了: ${deletedCount}件`);
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
