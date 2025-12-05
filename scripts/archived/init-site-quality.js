#!/usr/bin/env node

/**
 * サイト品質データ初期化スクリプト
 *
 * 既存の全サイトに SiteQuality と DisplayPriority を設定
 * - malicious-sites.json に記載のサイト: SiteQuality=malicious, DisplayPriority=5
 * - その他のサイト: SiteQuality=normal, DisplayPriority=50
 *
 * 使用方法:
 * AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/init-site-quality.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('使用方法:');
  console.error('AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/init-site-quality.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリストを読み込み
const maliciousSitesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'site-ratings.json'), 'utf-8')
);
const maliciousSites = maliciousSitesConfig.malicious;

/**
 * サイトが悪質サイトかどうかを判定
 */
function isMaliciousSite(siteName) {
  return maliciousSites.some(malicious => siteName.includes(malicious));
}

/**
 * Airtableから全サイトを取得
 */
async function getAllSites() {
  try {
    let allRecords = [];
    let offset = null;

    do {
      const url = offset
        ? `${API_URL}/Sites?offset=${offset}`
        : `${API_URL}/Sites`;

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
    console.error('❌ サイト取得エラー:', error.message);
    return [];
  }
}

/**
 * サイトの品質データを更新（バッチ処理）
 */
async function updateSitesQuality(updates) {
  try {
    // Airtableは一度に最大10件まで更新可能
    const batches = [];
    for (let i = 0; i < updates.length; i += 10) {
      batches.push(updates.slice(i, i + 10));
    }

    let updatedCount = 0;

    for (const batch of batches) {
      const response = await fetch(`${API_URL}/Sites`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: batch.map(update => ({
            id: update.id,
            fields: {
              SiteQuality: update.quality,
              DisplayPriority: update.priority,
            },
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
      }

      updatedCount += batch.length;
      console.log(`  ✅ ${batch.length}件更新（累計: ${updatedCount}件）`);

      // API制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return updatedCount;
  } catch (error) {
    console.error(`  ❌ 更新エラー:`, error.message);
    return 0;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 サイト品質データ初期化を開始します\n');

  // 全サイトを取得
  const sites = await getAllSites();
  console.log(`📊 対象サイト数: ${sites.length}件\n`);

  if (sites.length === 0) {
    console.log('⚠️  サイトが見つかりませんでした');
    return;
  }

  const stats = {
    malicious: 0,
    normal: 0,
  };

  const updates = [];

  // 各サイトの品質を判定
  for (const site of sites) {
    const fields = site.fields;
    const name = fields.Name || 'unknown';
    const isMalicious = isMaliciousSite(name);

    const quality = isMalicious ? 'malicious' : 'normal';
    const priority = isMalicious ? 5 : 50;

    updates.push({
      id: site.id,
      quality,
      priority,
    });

    if (isMalicious) {
      stats.malicious++;
      console.log(`  🚫 ${name}: malicious (優先度: ${priority})`);
    } else {
      stats.normal++;
      console.log(`  📌 ${name}: normal (優先度: ${priority})`);
    }
  }

  console.log('\n📝 更新を開始します...\n');

  const updatedCount = await updateSitesQuality(updates);

  console.log('\n\n📊 品質分類結果:');
  console.log(`  🚫 悪質サイト: ${stats.malicious}件`);
  console.log(`  📌 通常サイト: ${stats.normal}件`);
  console.log(`\n📝 更新結果:`);
  console.log(`  ✅ 更新完了: ${updatedCount}件`);
  console.log('\n🎉 処理完了');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
