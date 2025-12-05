#!/usr/bin/env node

/**
 * 初期データ投入スクリプト
 * 実在する競馬予想サイト情報をAirtableに登録
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('使用方法:');
  console.error('AIRTABLE_API_KEY=your-token AIRTABLE_BASE_ID=your-base-id node scripts/seed-initial-data.js');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// 実在する競馬予想サイト（よく知られているもの）
const initialSites = [
  {
    fields: {
      Name: 'netkeiba.com - 競馬情報',
      Slug: 'netkeiba',
      URL: 'https://www.netkeiba.com/',
      Category: 'chuo',
      Description: 'JRA公認の競馬総合情報サイト。レース情報、出馬表、オッズ、予想など競馬に関するあらゆる情報を提供。\n\n特徴: 無料予想あり、データベース充実、ニュース配信、出馬表\n料金: 基本無料（プレミアム会員 月額1,100円）',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: 'JRA日本中央競馬会',
      Slug: 'jra',
      URL: 'https://www.jra.go.jp/',
      Category: 'chuo',
      Description: 'JRA公式サイト。レース情報、払戻金、競馬場案内など公式情報を提供。\n\n特徴: 公式情報、払戻金、レース映像、競馬場情報\n料金: 無料',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '競馬ラボ',
      Slug: 'keibalab',
      URL: 'https://www.keibalab.jp/',
      Category: 'chuo',
      Description: '競馬予想とデータ分析を提供する競馬情報サイト。AI予想や専門家の見解を掲載。\n\n特徴: AI予想、データ分析、専門家予想、無料コンテンツ\n料金: 基本無料',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '地方競馬全国協会（NAR）',
      Slug: 'keiba-nar',
      URL: 'https://www.keiba.go.jp/',
      Category: 'chihou',
      Description: '地方競馬の公式情報サイト。全国の地方競馬場の情報、レース結果、オッズなどを提供。\n\n特徴: 公式情報、全国地方競馬対応、レース情報、払戻金\n料金: 無料',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '楽天競馬',
      Slug: 'rakuten-keiba',
      URL: 'https://keiba.rakuten.co.jp/',
      Category: 'chihou',
      Description: '楽天が運営する地方競馬のネット投票サイト。楽天ポイントが貯まる・使える。\n\n特徴: 地方競馬特化、ネット投票、楽天ポイント、予想情報\n料金: 無料（投票は実費）',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: 'オッズパーク',
      Slug: 'oddspark',
      URL: 'https://www.oddspark.com/',
      Category: 'chihou',
      Description: '地方競馬のインターネット投票サイト。全国の地方競馬に投票可能。\n\n特徴: ネット投票、全地方競馬対応、オッズ情報、予想コラム\n料金: 無料（投票は実費）',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: 'SPAT4',
      Slug: 'spat4',
      URL: 'https://www.spat4.jp/',
      Category: 'chihou',
      Description: '地方競馬・海外競馬のネット投票サービス。南関4場を中心に全国の地方競馬をカバー。\n\n特徴: ネット投票、南関4場、全国地方競馬、海外競馬\n料金: 無料（投票は実費）',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '大井競馬場',
      Slug: 'oi-keiba',
      URL: 'https://www.tokyocitykeiba.com/',
      Category: 'nankan',
      Description: '東京シティ競馬（大井競馬場）の公式サイト。トゥインクルレースなど南関東競馬の主要レースを開催。\n\n特徴: 公式情報、南関競馬、レース情報、イベント情報\n料金: 無料',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '川崎競馬場',
      Slug: 'kawasaki-keiba',
      URL: 'https://www.kawasaki-keiba.jp/',
      Category: 'nankan',
      Description: '川崎競馬場の公式サイト。南関東競馬の一つとして多くのレースを開催。\n\n特徴: 公式情報、南関競馬、レース情報、施設案内\n料金: 無料',
      IsApproved: true,
    },
  },
  {
    fields: {
      Name: '船橋競馬場',
      Slug: 'funabashi-keiba',
      URL: 'https://www.f-keiba.com/',
      Category: 'nankan',
      Description: '船橋競馬場の公式サイト。ダートグレード競走など南関東競馬の重要レースを開催。\n\n特徴: 公式情報、南関競馬、ナイター開催、レース情報\n料金: 無料',
      IsApproved: true,
    },
  },
];

async function createSites() {
  console.log('🚀 Airtableに初期データを投入します...\n');

  try {
    // 10件ずつバッチで送信（Airtableの制限）
    for (let i = 0; i < initialSites.length; i += 10) {
      const batch = initialSites.slice(i, i + 10);

      console.log(`📝 ${i + 1}〜${Math.min(i + 10, initialSites.length)}件目を作成中...`);

      const response = await fetch(`${API_URL}/Sites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ エラー: ${response.status}`);
        console.error(error);
        continue;
      }

      const result = await response.json();
      result.records.forEach((record) => {
        console.log(`✅ ${record.fields.Name} (${record.fields.Category})`);
      });

      // API制限を考慮して待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n🎉 ${initialSites.length}件のサイトデータを作成しました！`);
    console.log('\n確認:');
    console.log('1. Airtable Base: https://airtable.com/' + AIRTABLE_BASE_ID);
    console.log('2. 本番サイト: https://frabjous-taiyaki-460401.netlify.app/');
    console.log('\n⚠️  サイトに反映されるまで数分かかる場合があります');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);

    if (error.message.includes('INVALID_REQUEST') || error.message.includes('Unknown field name')) {
      console.error('\n💡 ヒント: Airtable Baseに正しい構造の "Sites" テーブルが必要です');
      console.error('\n必要なフィールド:');
      console.error('  - Name (Single line text)');
      console.error('  - Slug (Single line text)');
      console.error('  - URL (URL)');
      console.error('  - Category (Single select: nankan/chuo/chihou/other)');
      console.error('  - Description (Long text)');
      console.error('  - IsApproved (Checkbox)');
    }

    process.exit(1);
  }
}

createSites();
