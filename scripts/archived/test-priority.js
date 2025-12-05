#!/usr/bin/env node

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

async function testPriority() {
  try {
    console.log('🔍 Airtableから上位5件を取得します...\n');

    const response = await fetch(`${API_URL}/Sites?maxRecords=5&sort%5B0%5D%5Bfield%5D=DisplayPriority&sort%5B0%5D%5Bdirection%5D=desc`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status}\n${errorText}`);
    }

    const data = await response.json();

    console.log(`📊 取得件数: ${data.records.length}件\n`);

    if (data.records.length === 0) {
      console.log('⚠️  レコードが見つかりませんでした');
      return;
    }

    console.log('上位5件（DisplayPriority降順）:');
    data.records.forEach((record, index) => {
      const fields = record.fields;
      console.log(`\n${index + 1}. ${fields.Name || 'N/A'}`);
      console.log(`   DisplayPriority: ${fields.DisplayPriority || 'なし'}`);
      console.log(`   SiteQuality: ${fields.SiteQuality || 'なし'}`);
      console.log(`   IsApproved: ${fields.IsApproved || false}`);
    });

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

testPriority();
