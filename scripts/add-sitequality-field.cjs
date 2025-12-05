#!/usr/bin/env node

/**
 * Airtable Sites テーブルに SiteQuality フィールドを追加し、
 * 既存の site-ratings.json から優良・悪質サイトを反映する
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const ratingPath = path.join(__dirname, 'config/site-ratings.json');

// サイト品質設定を読み込み
function loadSiteRatings() {
  if (!fs.existsSync(ratingPath)) {
    return { legitimate: [], malicious: [] };
  }
  return JSON.parse(fs.readFileSync(ratingPath, 'utf-8'));
}

// サイトの品質を判定
function getSiteQuality(siteName, siteRatings) {
  // 優良サイトチェック
  const isLegitimate = siteRatings.legitimate.some(legitName =>
    siteName.includes(legitName) || legitName.includes(siteName)
  );
  if (isLegitimate) return 'legitimate';

  // 悪質サイトチェック
  const isMalicious = siteRatings.malicious.some(maliciousName =>
    siteName.includes(maliciousName) || maliciousName.includes(siteName)
  );
  if (isMalicious) return 'malicious';

  // デフォルトは通常
  return 'normal';
}

async function updateSiteQuality() {
  console.log('📊 Airtable Sites テーブルの SiteQuality フィールドを更新します\n');

  const siteRatings = loadSiteRatings();
  console.log(`✅ 優良サイト: ${siteRatings.legitimate.length}件`);
  console.log(`❌ 悪質サイト: ${siteRatings.malicious.length}件\n`);

  // 全サイトを取得
  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'SiteQuality']
  }).all();

  console.log(`📋 承認済みサイト: ${allSites.length}件\n`);

  let updateCount = 0;
  const stats = { legitimate: 0, malicious: 0, normal: 0 };

  for (const siteRecord of allSites) {
    const siteName = siteRecord.fields.Name;
    const currentQuality = siteRecord.fields.SiteQuality;
    const newQuality = getSiteQuality(siteName, siteRatings);

    // 既に正しい値が設定されている場合はスキップ
    if (currentQuality === newQuality) {
      stats[newQuality]++;
      continue;
    }

    // 品質を更新
    try {
      await base('Sites').update(siteRecord.id, {
        SiteQuality: newQuality
      });

      let emoji = '⚪';
      if (newQuality === 'legitimate') emoji = '✅';
      if (newQuality === 'malicious') emoji = '❌';

      console.log(`${emoji} ${siteName}: ${currentQuality || '(未設定)'} → ${newQuality}`);
      updateCount++;
      stats[newQuality]++;

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ エラー: ${siteName}`, error.message);
    }
  }

  console.log('\n\n📊 更新完了\n');
  console.log(`✅ 優良サイト: ${stats.legitimate}件`);
  console.log(`⚪ 通常サイト: ${stats.normal}件`);
  console.log(`❌ 悪質サイト: ${stats.malicious}件`);
  console.log(`\n更新したサイト: ${updateCount}件\n`);

  console.log('💡 今後はAirtableで直接 SiteQuality フィールドを編集できます');
  console.log('   - legitimate: 投稿確率100%（毎日）');
  console.log('   - normal: 投稿確率33%（3日に1回）');
  console.log('   - malicious: 投稿確率20%（5日に1回）\n');
}

updateSiteQuality().catch(console.error);
