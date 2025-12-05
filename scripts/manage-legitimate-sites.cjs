#!/usr/bin/env node

/**
 * 優良サイト管理ツール
 *
 * 使い方:
 *   node scripts/manage-legitimate-sites.cjs list              # 優良サイト一覧を表示
 *   node scripts/manage-legitimate-sites.cjs add "サイト名"    # 優良サイトに追加
 *   node scripts/manage-legitimate-sites.cjs remove "サイト名" # 優良サイトから削除
 *   node scripts/manage-legitimate-sites.cjs search "キーワード" # サイト検索
 */

const fs = require('fs');
const path = require('path');
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

const ratingPath = path.join(__dirname, 'config/site-ratings.json');

// サイト品質設定を読み込み
function loadSiteRatings() {
  if (!fs.existsSync(ratingPath)) {
    return { legitimate: [], malicious: [], postingFrequency: {} };
  }
  return JSON.parse(fs.readFileSync(ratingPath, 'utf-8'));
}

// サイト品質設定を保存
function saveSiteRatings(data) {
  fs.writeFileSync(ratingPath, JSON.stringify(data, null, 2), 'utf-8');
}

// 優良サイト一覧を表示
function listLegitimateSites() {
  const data = loadSiteRatings();
  console.log('\n✅ 優良サイト一覧:\n');

  if (data.legitimate.length === 0) {
    console.log('  (登録なし)');
  } else {
    data.legitimate.forEach((site, i) => {
      console.log(`  ${i + 1}. ${site}`);
    });
  }

  console.log(`\n合計: ${data.legitimate.length}件`);
  console.log(`投稿頻度: ${(data.postingFrequency.legitimate * 100).toFixed(0)}% (毎日投稿)\n`);
}

// 優良サイトに追加
function addLegitimateSite(siteName) {
  const data = loadSiteRatings();

  // 既に登録されているかチェック
  if (data.legitimate.includes(siteName)) {
    console.log(`\n⚠️  「${siteName}」は既に優良サイトに登録されています\n`);
    return;
  }

  // 悪質サイトに登録されているかチェック
  if (data.malicious && data.malicious.includes(siteName)) {
    console.log(`\n❌ 「${siteName}」は悪質サイトに登録されています`);
    console.log(`先に悪質サイトから削除してください:\n`);
    console.log(`  node scripts/manage-site-quality.cjs remove "${siteName}"\n`);
    return;
  }

  data.legitimate.push(siteName);
  saveSiteRatings(data);

  console.log(`\n✅ 「${siteName}」を優良サイトに追加しました\n`);
  console.log(`現在の優良サイト: ${data.legitimate.length}件\n`);
}

// 優良サイトから削除
function removeLegitimateSite(siteName) {
  const data = loadSiteRatings();

  const index = data.legitimate.indexOf(siteName);

  if (index === -1) {
    console.log(`\n⚠️  「${siteName}」は優良サイトに登録されていません\n`);
    return;
  }

  data.legitimate.splice(index, 1);
  saveSiteRatings(data);

  console.log(`\n✅ 「${siteName}」を優良サイトから削除しました\n`);
  console.log(`現在の優良サイト: ${data.legitimate.length}件\n`);
}

// サイト検索（Airtableから）
async function searchSites(keyword) {
  if (!apiKey || !baseId) {
    console.error('\n❌ AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください\n');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);

  console.log(`\n🔍 「${keyword}」を含むサイトを検索中...\n`);

  const allSites = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    fields: ['Name', 'Reviews']
  }).all();

  const data = loadSiteRatings();
  const matchingSites = [];

  for (const siteRecord of allSites) {
    const siteName = siteRecord.fields.Name;

    if (siteName.toLowerCase().includes(keyword.toLowerCase())) {
      const reviewLinks = siteRecord.fields.Reviews || [];
      const reviewCount = Array.isArray(reviewLinks) ? reviewLinks.length : 0;

      // 口コミの平均評価を計算
      const reviews = await base('Reviews').select({
        filterByFormula: `AND({IsApproved} = TRUE(), FIND("${siteName}", ARRAYJOIN({Site})))`,
        fields: ['Rating']
      }).all();

      const ratings = reviews.map(r => r.fields.Rating || 0);
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      // サイトタイプを判定
      let type = '⚪通常';
      if (data.legitimate.includes(siteName)) {
        type = '✅優良';
      } else if (data.malicious && data.malicious.includes(siteName)) {
        type = '❌悪質';
      }

      matchingSites.push({
        name: siteName,
        type,
        reviewCount,
        avgRating: avgRating.toFixed(2)
      });
    }
  }

  if (matchingSites.length === 0) {
    console.log('該当するサイトが見つかりませんでした\n');
    return;
  }

  console.log('検索結果:\n');
  matchingSites.forEach((site, i) => {
    console.log(`${i + 1}. ${site.type} ${site.name}`);
    console.log(`   ⭐${site.avgRating} (${site.reviewCount}件の口コミ)`);
  });

  console.log(`\n合計: ${matchingSites.length}件\n`);
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const argument = args[1];

  if (!command) {
    console.log('\n📋 優良サイト管理ツール\n');
    console.log('使い方:');
    console.log('  node scripts/manage-legitimate-sites.cjs list              # 優良サイト一覧');
    console.log('  node scripts/manage-legitimate-sites.cjs add "サイト名"    # 優良サイトに追加');
    console.log('  node scripts/manage-legitimate-sites.cjs remove "サイト名" # 優良サイトから削除');
    console.log('  node scripts/manage-legitimate-sites.cjs search "キーワード" # サイト検索\n');
    return;
  }

  switch (command) {
    case 'list':
      listLegitimateSites();
      break;

    case 'add':
      if (!argument) {
        console.log('\n❌ サイト名を指定してください\n');
        console.log('例: node scripts/manage-legitimate-sites.cjs add "サイト名"\n');
        return;
      }
      addLegitimateSite(argument);
      break;

    case 'remove':
      if (!argument) {
        console.log('\n❌ サイト名を指定してください\n');
        console.log('例: node scripts/manage-legitimate-sites.cjs remove "サイト名"\n');
        return;
      }
      removeLegitimateSite(argument);
      break;

    case 'search':
      if (!argument) {
        console.log('\n❌ 検索キーワードを指定してください\n');
        console.log('例: node scripts/manage-legitimate-sites.cjs search "競馬"\n');
        return;
      }
      await searchSites(argument);
      break;

    default:
      console.log(`\n❌ 不明なコマンド: ${command}\n`);
      console.log('使用可能なコマンド: list, add, remove, search\n');
  }
}

main().catch(console.error);
