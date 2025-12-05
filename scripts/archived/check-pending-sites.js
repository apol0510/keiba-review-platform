/**
 * 未承認サイト確認スクリプト
 *
 * 残っている未承認サイトの内容を確認し、
 * 削除すべき非予想サイトを特定します。
 */

import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ エラー: AIRTABLE_API_KEY と AIRTABLE_BASE_ID が必要です');
  process.exit(1);
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 未承認サイトの確認を開始します\n');

  try {
    // 未承認サイトを取得
    const records = await base('Sites')
      .select({
        filterByFormula: '{IsApproved} = FALSE()',
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
      })
      .all();

    if (records.length === 0) {
      console.log('✅ 未承認サイトはありません');
      return;
    }

    console.log(`📊 未承認サイト数: ${records.length}件\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('未承認サイト一覧:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // カテゴリ別に分類
    const categories = {
      prediction: [],      // 予想サイト（承認すべき）
      wikipedia: [],       // Wikipedia
      review: [],          // 口コミ・評判サイト
      blog: [],            // 個人ブログ
      news: [],            // ニュースサイト
      tools: [],           // ツールサイト
      legal: [],           // 法律・詐欺相談
      unknown: [],         // 不明
    };

    records.forEach((record, index) => {
      const name = record.fields.Name || '名前なし';
      const url = record.fields.URL || '';
      const description = record.fields.Description || '';

      // カテゴリ分類
      let category = 'unknown';

      if (url.includes('wikipedia.org') || name.includes('Wikipedia')) {
        category = 'wikipedia';
      } else if (
        url.includes('hyouban') ||
        url.includes('review') ||
        url.includes('kuchikomi') ||
        name.includes('口コミ') ||
        name.includes('評判')
      ) {
        category = 'review';
      } else if (
        url.includes('blog') ||
        url.includes('diary') ||
        url.includes('fc2.com') ||
        url.includes('ameblo.jp') ||
        url.includes('livedoor.blog')
      ) {
        category = 'blog';
      } else if (
        url.includes('bengo4.com') ||
        name.includes('弁護士') ||
        name.includes('法律') ||
        name.includes('詐欺')
      ) {
        category = 'legal';
      } else if (
        name.includes('ニュース') ||
        name.includes('まとめ') ||
        name.includes('速報')
      ) {
        category = 'news';
      } else if (
        name.includes('ツール') ||
        name.includes('計算') ||
        name.includes('シミュレーター')
      ) {
        category = 'tools';
      } else if (
        name.includes('予想') ||
        name.includes('競馬') ||
        description.includes('予想')
      ) {
        category = 'prediction';
      }

      categories[category].push({
        id: record.id,
        name,
        url,
        description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      });
    });

    // カテゴリ別に表示
    console.log('\n📁 カテゴリ別分類:\n');

    if (categories.prediction.length > 0) {
      console.log(`✅ 予想サイト（承認候補）: ${categories.prediction.length}件`);
      categories.prediction.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.wikipedia.length > 0) {
      console.log(`\n❌ Wikipedia: ${categories.wikipedia.length}件`);
      categories.wikipedia.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.review.length > 0) {
      console.log(`\n❌ 口コミ・評判サイト: ${categories.review.length}件`);
      categories.review.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.blog.length > 0) {
      console.log(`\n❌ 個人ブログ: ${categories.blog.length}件`);
      categories.blog.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.legal.length > 0) {
      console.log(`\n❌ 法律・詐欺相談: ${categories.legal.length}件`);
      categories.legal.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.news.length > 0) {
      console.log(`\n❌ ニュース・まとめ: ${categories.news.length}件`);
      categories.news.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.tools.length > 0) {
      console.log(`\n❌ ツール: ${categories.tools.length}件`);
      categories.tools.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}\n`);
      });
    }

    if (categories.unknown.length > 0) {
      console.log(`\n⚠️  不明（要確認）: ${categories.unknown.length}件`);
      categories.unknown.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name}`);
        console.log(`     ${site.url}`);
        console.log(`     ${site.description}\n`);
      });
    }

    // サマリー
    const toDelete =
      categories.wikipedia.length +
      categories.review.length +
      categories.blog.length +
      categories.legal.length +
      categories.news.length +
      categories.tools.length;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('サマリー:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ 承認候補（予想サイト）: ${categories.prediction.length}件`);
    console.log(`❌ 削除すべき: ${toDelete}件`);
    console.log(`⚠️  要確認: ${categories.unknown.length}件`);
    console.log(`\n📊 総計: ${records.length}件`);

    if (toDelete > 0) {
      console.log('\n次のステップ:');
      console.log('非予想サイトを削除するには:');
      console.log('node scripts/remove-non-prediction-types.js');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
main();
