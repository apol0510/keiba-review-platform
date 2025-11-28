#!/usr/bin/env node

/**
 * 不適切なURLを持つサイトを削除するスクリプト
 *
 * 実行方法:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/cleanup-invalid-urls.js
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

// 除外すべきドメイン・URLパターン（fetch-keiba-sites.jsと同じ）
const EXCLUDED_PATTERNS = [
  // ECサイト・アプリストア
  'amazon.co.jp',
  'rakuten.co.jp',
  'apps.apple.com',
  'play.google.com',

  // SNS個別投稿
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',

  // ブログ個別記事（noteなど）
  'note.com',

  // 動画
  'youtube.com/watch',
  'youtube.com/playlist',
  'youtube.com/channel',  // YouTubeチャンネルも除外

  // Yahoo!系サービス
  'yahoo.co.jp/answer',
  'chiebukuro.yahoo.co.jp',
  'detail.chiebukuro.yahoo.co.jp',
  'sports.yahoo.co.jp', // Yahoo!スポーツの個別記事

  // 競馬場公式・レース情報ページ（予想サイトではない）
  'netkeiba.com/racecourse',
  'nar.netkeiba.com/racecourse',

  // URLパスパターン（個別記事を示す）
  '/article/',
  '/archives/',
  '/entry/',
  '/posts/',
  '/column/',
  '/n/', // noteの個別記事
  '/qa/',
  '/question_detail/',
  '/race/predict/ai/', // 個別レースのAI予想ページ
];

/**
 * URLが除外対象かチェック
 */
function shouldExcludeUrl(url) {
  // URLが存在しない場合は除外対象
  if (!url || typeof url !== 'string') {
    return true;
  }

  const urlLower = url.toLowerCase();

  // 除外パターンに一致するかチェック
  for (const pattern of EXCLUDED_PATTERNS) {
    if (urlLower.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  // パス部分が異常に長い場合（100文字以上 = 個別記事の可能性が高い）
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname.length > 100) {
      return true;
    }
  } catch (error) {
    return true; // URLパースエラーの場合も除外
  }

  return false;
}

/**
 * 全サイトを取得
 */
async function getAllSites() {
  const allRecords = [];
  let offset = null;

  try {
    do {
      const url = offset
        ? `${AIRTABLE_API_URL}/Sites?offset=${offset}`
        : `${AIRTABLE_API_URL}/Sites`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API エラー: ${response.status}`);
      }

      const data = await response.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    return allRecords;
  } catch (error) {
    console.error(`❌ サイト取得エラー:`, error.message);
    return [];
  }
}

/**
 * サイトを削除
 */
async function deleteSite(recordId) {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/Sites/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`削除エラー: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ 削除エラー:`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 不適切なURLのクリーンアップを開始します\n');

  // 全サイトを取得
  console.log('📥 Airtableからサイトを取得中...');
  const sites = await getAllSites();
  console.log(`✅ ${sites.length}件のサイトを取得しました\n`);

  // 除外対象をチェック
  const invalidSites = [];
  for (const site of sites) {
    const url = site.fields.URL;
    if (shouldExcludeUrl(url)) {
      invalidSites.push(site);
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 チェック結果`);
  console.log(`  - 総サイト数: ${sites.length}件`);
  console.log(`  - 不適切なURL: ${invalidSites.length}件`);
  console.log(`  - 有効なサイト: ${sites.length - invalidSites.length}件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (invalidSites.length === 0) {
    console.log('✅ すべてのサイトが有効です。クリーンアップ不要です。');
    return;
  }

  console.log(`🗑️  以下の${invalidSites.length}件を削除します:\n`);

  // 削除リストを表示
  for (const site of invalidSites) {
    const url = site.fields.URL || '(URLなし)';
    const name = site.fields.Name || 'N/A';
    console.log(`  🚫 ${name}`);
    console.log(`     ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}\n`);
  }

  // 削除実行
  let deleted = 0;
  for (const site of invalidSites) {
    const url = site.fields.URL || '(URLなし)';
    const name = site.fields.Name || 'N/A';

    console.log(`🗑️  削除中: ${name}`);
    const success = await deleteSite(site.id);

    if (success) {
      deleted++;
      console.log(`  ✅ 削除完了\n`);
    } else {
      console.log(`  ❌ 削除失敗\n`);
    }

    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 クリーンアップ完了`);
  console.log(`  - 削除成功: ${deleted}件`);
  console.log(`  - 削除失敗: ${invalidSites.length - deleted}件`);
  console.log(`  - 残存サイト: ${sites.length - deleted}件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
