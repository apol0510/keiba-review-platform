#!/usr/bin/env node

/**
 * Airtableサンプルデータ投入スクリプト
 *
 * 使用方法:
 * AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-airtable.js
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('使用方法:');
  console.error('AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-airtable.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// サンプルサイトデータ
const sampleSites = [
  {
    fields: {
      Name: '競馬予想サイトA',
      Slug: 'site-a',
      URL: 'https://example.com/site-a',
      Category: 'nankan',
      Description: '南関競馬専門の予想サイト。大井・川崎を中心に高い的中率を誇ります。',
      Features: '無料予想あり,南関特化,LINE配信',
      PriceInfo: '月額3,000円〜',
      IsApproved: true,
      ReviewCount: 15,
      AverageRating: 4.2,
    },
  },
  {
    fields: {
      Name: '中央競馬情報局',
      Slug: 'site-b',
      URL: 'https://example.com/site-b',
      Category: 'chuo',
      Description: 'JRA中央競馬の重賞レースに特化した予想サイト。',
      Features: '重賞特化,買い目公開,実績公開',
      PriceInfo: '情報料 1レース500円〜',
      IsApproved: true,
      ReviewCount: 23,
      AverageRating: 3.8,
    },
  },
  {
    fields: {
      Name: '地方競馬マスター',
      Slug: 'site-c',
      URL: 'https://example.com/site-c',
      Category: 'chihou',
      Description: '全国の地方競馬をカバーする総合予想サイト。',
      Features: '全地方対応,AI予想,メルマガ配信',
      PriceInfo: '月額5,000円',
      IsApproved: true,
      ReviewCount: 8,
      AverageRating: 4.5,
    },
  },
];

async function createSites() {
  console.log('🚀 Airtableにサンプルデータを投入します...\n');

  try {
    // Sitesテーブルにデータを投入
    console.log('📝 Sitesテーブルにデータを作成中...');

    const response = await fetch(`${API_URL}/Sites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: sampleSites,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API エラー: ${response.status}\n${error}`);
    }

    const result = await response.json();
    console.log(`✅ ${result.records.length}件のサイトを作成しました\n`);

    // 作成されたサイトの情報を表示
    result.records.forEach((record, index) => {
      console.log(`${index + 1}. ${record.fields.Name} (${record.fields.Category})`);
      console.log(`   Slug: ${record.fields.Slug}`);
      console.log(`   評価: ${record.fields.AverageRating}★ (${record.fields.ReviewCount}件)\n`);
    });

    console.log('🎉 サンプルデータの投入が完了しました！');
    console.log('\n次のステップ:');
    console.log('1. Airtable Baseで確認: https://airtable.com/' + AIRTABLE_BASE_ID);
    console.log('2. サイトを確認: https://frabjous-taiyaki-460401.netlify.app/');
    console.log('\n⚠️  注意: Netlifyのキャッシュがクリアされるまで5-10分かかる場合があります');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);

    if (error.message.includes('INVALID_REQUEST')) {
      console.error('\n💡 ヒント: Airtable Baseに "Sites" テーブルが存在するか確認してください');
      console.error('必要なフィールド: Name, Slug, URL, Category, Description, Features, PriceInfo, IsApproved, ReviewCount, AverageRating');
    }

    process.exit(1);
  }
}

createSites();
