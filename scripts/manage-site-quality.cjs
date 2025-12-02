#!/usr/bin/env node
/**
 * サイト品質管理CLIツール
 *
 * 使い方:
 *   node scripts/manage-site-quality.cjs list                 # 悪質サイト一覧表示
 *   node scripts/manage-site-quality.cjs add "サイト名"       # 悪質サイトに追加
 *   node scripts/manage-site-quality.cjs remove "サイト名"    # 悪質サイトから削除
 *   node scripts/manage-site-quality.cjs search "キーワード"  # サイト名検索
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config/site-ratings.json');

/**
 * 設定ファイルを読み込み
 */
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 設定ファイルが見つかりません:', CONFIG_PATH);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

/**
 * 設定ファイルを保存
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 悪質サイト一覧を表示
 */
function listMaliciousSites() {
  const config = loadConfig();
  const malicious = config.malicious || [];

  console.log('\n📋 悪質サイト一覧\n');
  console.log('━'.repeat(80));
  console.log(`登録数: ${malicious.length}件\n`);

  if (malicious.length === 0) {
    console.log('  （登録されていません）\n');
  } else {
    malicious.forEach((site, i) => {
      console.log(`  ${(i + 1).toString().padStart(3, ' ')}. ${site}`);
    });
    console.log('');
  }

  console.log('━'.repeat(80) + '\n');
}

/**
 * 悪質サイトに追加
 */
function addMaliciousSite(siteName) {
  if (!siteName || siteName.trim() === '') {
    console.error('❌ サイト名を指定してください');
    process.exit(1);
  }

  const config = loadConfig();
  const malicious = config.malicious || [];

  // 既に登録済みかチェック
  if (malicious.includes(siteName)) {
    console.log(`⚠️  「${siteName}」は既に悪質サイトに登録されています`);
    return;
  }

  // 追加
  malicious.push(siteName);
  malicious.sort(); // アルファベット順にソート
  config.malicious = malicious;

  saveConfig(config);

  console.log(`\n✅ 「${siteName}」を悪質サイトに追加しました`);
  console.log(`   登録数: ${malicious.length}件\n`);
}

/**
 * 悪質サイトから削除
 */
function removeMaliciousSite(siteName) {
  if (!siteName || siteName.trim() === '') {
    console.error('❌ サイト名を指定してください');
    process.exit(1);
  }

  const config = loadConfig();
  const malicious = config.malicious || [];

  // 登録されているかチェック
  const index = malicious.indexOf(siteName);
  if (index === -1) {
    console.log(`⚠️  「${siteName}」は悪質サイトに登録されていません`);
    return;
  }

  // 削除
  malicious.splice(index, 1);
  config.malicious = malicious;

  saveConfig(config);

  console.log(`\n✅ 「${siteName}」を悪質サイトから削除しました`);
  console.log(`   登録数: ${malicious.length}件\n`);
}

/**
 * サイト名を検索
 */
function searchSites(keyword) {
  if (!keyword || keyword.trim() === '') {
    console.error('❌ キーワードを指定してください');
    process.exit(1);
  }

  const config = loadConfig();
  const malicious = config.malicious || [];

  const results = malicious.filter(site =>
    site.toLowerCase().includes(keyword.toLowerCase())
  );

  console.log(`\n🔍 検索結果: "${keyword}"\n`);
  console.log('━'.repeat(80));

  if (results.length === 0) {
    console.log('  （該当するサイトが見つかりませんでした）\n');
  } else {
    console.log(`  ${results.length}件見つかりました\n`);
    results.forEach((site, i) => {
      console.log(`  ${(i + 1).toString().padStart(3, ' ')}. ${site}`);
    });
    console.log('');
  }

  console.log('━'.repeat(80) + '\n');
}

/**
 * 使い方を表示
 */
function showUsage() {
  console.log(`
🛠️  サイト品質管理CLIツール

使い方:
  node scripts/manage-site-quality.cjs <command> [args]

コマンド:
  list                  悪質サイト一覧を表示
  add <サイト名>        悪質サイトに追加
  remove <サイト名>     悪質サイトから削除
  search <キーワード>   サイト名を検索

例:
  node scripts/manage-site-quality.cjs list
  node scripts/manage-site-quality.cjs add "悪質サイト名"
  node scripts/manage-site-quality.cjs remove "悪質サイト名"
  node scripts/manage-site-quality.cjs search "競馬"
`);
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const command = args[0];
  const arg = args[1];

  switch (command) {
    case 'list':
      listMaliciousSites();
      break;

    case 'add':
      addMaliciousSite(arg);
      break;

    case 'remove':
      removeMaliciousSite(arg);
      break;

    case 'search':
      searchSites(arg);
      break;

    default:
      console.error(`❌ 不明なコマンド: ${command}\n`);
      showUsage();
      process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { addMaliciousSite, removeMaliciousSite, searchSites };
