#!/usr/bin/env node

/**
 * 悪質サイトリストをAirtableに登録するスクリプト
 *
 * ユーザーが中立的な口コミで評価できるようにするため、
 * 悪質サイトとして知られているサイトも登録します。
 *
 * 実行方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/import-suspicious-sites.js
 */

import fetch from 'node-fetch';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('必要な環境変数: AIRTABLE_API_KEY, AIRTABLE_BASE_ID');
  process.exit(1);
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 悪質サイトリスト（https://u85.jp/category/yuryo/ より）
const SUSPICIOUS_SITES = [
  {"name": "馬クイック", "url": "https://uma-quick.com/"},
  {"name": "ターフビジョン", "url": "http://turf-v.jp/"},
  {"name": "万馬券EXPO", "url": "https://www.keiba-expo.jp/"},
  {"name": "ディギン・ケイバ", "url": "https://www.digginkeiba.jp/"},
  {"name": "ディバイン（DIVINE）", "url": "https://d-ivine.com/"},
  {"name": "ウマセラ", "url": "https://umasera.com/"},
  {"name": "リフレイン（Refrain）", "url": "https://k-refrain.com/"},
  {"name": "バツグン", "url": "https://www.umarace-expert.com/"},
  {"name": "競馬2.0", "url": "https://www.win-ver2.com/"},
  {"name": "リスタート", "url": "https://www.keiba-restart.com/"},
  {"name": "競馬ナンバー1", "url": "https://keiba-no1.com/"},
  {"name": "オールウイン", "url": "https://allwin7.com/"},
  {"name": "本命", "url": "https://www.kateru-uma.com/"},
  {"name": "バクシス（BAXIS）", "url": "https://www.baxis.jp/"},
  {"name": "ベストホース", "url": "https://www.keiba-master.net/"},
  {"name": "天才！穴馬党", "url": "https://www.anaumatou.jp/"},
  {"name": "うまピカ", "url": "https://www.uma-pika.com/"},
  {"name": "クラフトマンズ", "url": "https://craftmankeiba.com/"},
  {"name": "スマートホース", "url": "https://smart-horse.jp/"},
  {"name": "ハーレム競馬", "url": "https://harem-keiba.com/"},
  {"name": "日刊競馬9", "url": "https://keiba-nine.com/"},
  {"name": "レープロ", "url": "http://keiba-programs-v.jp/"},
  {"name": "よろずや", "url": "https://yorozuya-manba.com/"},
  {"name": "横綱ダービー", "url": "https://yokodabi.jp/"},
  {"name": "競馬セブン", "url": "http://keiba7.net/"},
  {"name": "うまマル！", "url": "https://www.uma-maru.com/"},
  {"name": "競馬with", "url": "https://www.keiba-with.com/"},
  {"name": "競馬総本舗ミリオン", "url": "https://k-million.jp/"},
  {"name": "シンクタンク競馬NET", "url": "http://www.t-tank.net/"},
  {"name": "ワールド競馬WEB", "url": "http://wkeibaw.net/"},
  {"name": "チェックメイト", "url": "http://www.cmjra.jp/"},
  {"name": "情報競馬マスターズ", "url": "http://masts.jp/"},
  {"name": "シン競馬スピリッツ", "url": "https://www.shinkeiba.com/"}
];

/**
 * Airtableに既存サイトがあるかチェック
 */
async function checkExistingSite(url) {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `${AIRTABLE_API_URL}/Sites?filterByFormula=SEARCH("${url}",{URL})`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.records.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * URLからスラッグを生成
 */
function generateSlug(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    return domain.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  } catch (error) {
    return '';
  }
}

/**
 * Airtableにサイトを追加
 */
async function addSiteToAirtable(siteInfo) {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Sites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ fields: siteInfo }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Airtable登録エラー:`, error.message);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚨 悪質サイトリストのインポートを開始します\n');
  console.log('📝 目的: ユーザーが中立的な口コミで評価できるようにする');
  console.log('📝 ソース: https://u85.jp/category/yuryo/');
  console.log('📝 サイト数: ' + SUSPICIOUS_SITES.length + '件\n');

  let added = 0;
  let skipped = 0;

  for (const site of SUSPICIOUS_SITES) {
    console.log(`\n🔍 チェック中: ${site.name}`);
    console.log(`   ${site.url}`);

    // 既存チェック
    const exists = await checkExistingSite(site.url);
    if (exists) {
      console.log(`  ⏭️  スキップ: 既に登録済み`);
      skipped++;
      continue;
    }

    // スラッグ生成
    const slug = generateSlug(site.url);

    // サイト情報
    const siteInfo = {
      Name: site.name,
      Slug: slug,
      URL: site.url,
      Category: 'other', // デフォルトカテゴリ
      Description: '悪質サイトとして報告されているサイトです。ユーザーの皆様の口コミをお待ちしています。',
      IsApproved: false, // 未承認
    };

    // 登録
    const result = await addSiteToAirtable(siteInfo);
    if (result) {
      added++;
      console.log(`  ✅ 登録完了`);
    }

    // API制限を考慮して待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 インポート完了`);
  console.log(`  - 新規登録: ${added}件`);
  console.log(`  - スキップ: ${skipped}件`);
  console.log(`  - 合計: ${SUSPICIOUS_SITES.length}件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log('次のステップ:');
  console.log('1. 管理画面で確認: https://frabjous-taiyaki-460401.netlify.app/admin/pending-sites');
  console.log('2. サイトを承認して公開');
  console.log('3. ユーザーが中立的な口コミを投稿できるようになります');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
