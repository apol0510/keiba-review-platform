#!/usr/bin/env node

/**
 * 新しい口コミがあるかチェックするスクリプト
 * GitHub Actionsのauto-rebuild-on-review.ymlで使用
 */

const Airtable = require('airtable');
const fs = require('fs');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  console.error('必要な環境変数: AIRTABLE_API_KEY, AIRTABLE_BASE_ID');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function checkNewReviews() {
  try {
    console.log('🔍 過去24時間の新規口コミをチェック中...');

    // 24時間前の日付を取得（YYYY-MM-DD形式）
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`📅 チェック基準日時: ${yesterdayStr}`);

    // Airtableから承認済みの新規口コミを検索
    const records = await base('Reviews').select({
      filterByFormula: `AND({IsApproved} = TRUE(), IS_AFTER({CreatedAt}, "${yesterdayStr}"))`,
      maxRecords: 10,
      fields: ['Site', 'UserName', 'Rating', 'CreatedAt']
    }).all();

    console.log(`\n📊 検索結果: ${records.length}件の新規口コミ`);

    if (records.length > 0) {
      console.log('\n✅ 新しい口コミが見つかりました:');
      records.forEach((record, index) => {
        const siteName = record.get('Site') ? record.get('Site')[0] : '不明';
        const userName = record.get('UserName') || '匿名';
        const rating = record.get('Rating') || 0;
        const created = record.get('CreatedAt') || '';
        console.log(`  ${index + 1}. ${siteName} - ${userName} (⭐${rating}) - ${created}`);
      });

      // GitHub Actionsの出力変数を設定
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'should_rebuild=true\n');
        console.log('\n🔄 GitHub Actions出力: should_rebuild=true');
      }

      console.log('\n✅ 再ビルドを実行します');
      process.exit(0);
    } else {
      console.log('\nℹ️ 新しい口コミはありません');

      // GitHub Actionsの出力変数を設定
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'should_rebuild=false\n');
        console.log('🔄 GitHub Actions出力: should_rebuild=false');
      }

      console.log('\n⏭️ 再ビルドをスキップします');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);

    // エラーが発生した場合は安全のため再ビルドしない
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'should_rebuild=false\n');
    }

    // Airtableのエラーの場合は詳細を表示
    if (error.statusCode) {
      console.error(`ステータスコード: ${error.statusCode}`);
      console.error(`エラー詳細: ${error.message}`);
    }

    process.exit(1);
  }
}

// スクリプトを実行
checkNewReviews();
