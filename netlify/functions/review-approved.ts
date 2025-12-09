import type { Handler } from '@netlify/functions';
import Airtable from 'airtable';

// メール送信関数
async function sendApprovalEmail(
  userEmail: string,
  userName: string,
  siteName: string,
  reviewTitle: string,
  reviewContent: string,
  rating: number
) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@keiba-review.jp';

  if (!SENDGRID_API_KEY) {
    console.log('❌ SendGrid APIキーが設定されていません。メール送信をスキップします。');
    return;
  }

  console.log('📧 承認通知メール送信中...');
  console.log('宛先:', userEmail);

  const html = `
    <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">✅ 口コミが公開されました</h2>
      <p>${userName} 様</p>
      <p>「${siteName}」への口コミが承認され、公開されました。</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3>公開された口コミ</h3>
        <p><strong>タイトル:</strong> ${reviewTitle}</p>
        <p><strong>評価:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
        <p><strong>口コミ本文:</strong></p>
        <p style="white-space: pre-wrap;">${reviewContent}</p>
      </div>

      <p>
        <a href="https://keiba-review.jp/keiba-yosou/"
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
          サイトで確認する
        </a>
      </p>

      <p>貴重なご意見をありがとうございました。他の競馬予想サイトについても、ぜひ口コミをお寄せください。</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; font-size: 12px;">
        このメールは自動送信されています。返信はできません。<br>
        競馬予想サイト口コミプラットフォーム<br>
        <a href="https://keiba-review.jp">https://keiba-review.jp</a>
      </p>
    </div>
  `;

  try {
    const requestBody = {
      personalizations: [{ to: [{ email: userEmail }] }],
      from: { email: SENDGRID_FROM_EMAIL },
      subject: '口コミが公開されました - 競馬予想サイト口コミプラットフォーム',
      content: [{ type: 'text/html', value: html }],
    };

    console.log('SendGridリクエスト詳細:');
    console.log('  From:', SENDGRID_FROM_EMAIL);
    console.log('  To:', userEmail);
    console.log('  Subject:', requestBody.subject);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('SendGridレスポンス:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGridエラー:', errorText);
      console.error('❌ メール送信失敗: ステータス', response.status);
    } else {
      console.log(`✅ 承認通知メール送信成功: ${userEmail}`);
      console.log('✅ SendGrid 202 Accepted - メールは送信キューに追加されました');
    }
  } catch (error) {
    console.error('❌ メール送信エラー:', error);
  }
}

// Netlify Build Hookを呼び出してデプロイをトリガー
async function triggerDeploy() {
  const BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK_URL;

  if (!BUILD_HOOK_URL) {
    console.log('❌ Build Hook URLが設定されていません。デプロイをスキップします。');
    return false;
  }

  console.log('🚀 自動デプロイをトリガー中...');

  try {
    const response = await fetch(BUILD_HOOK_URL, {
      method: 'POST',
    });

    if (!response.ok) {
      console.error('❌ デプロイトリガー失敗:', response.status, response.statusText);
      return false;
    }

    console.log('✅ デプロイトリガー成功');
    return true;
  } catch (error) {
    console.error('❌ デプロイトリガーエラー:', error);
    return false;
  }
}

export const handler: Handler = async (event) => {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POSTのみ許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('📥 Airtable Automationを受信');

    const payload = JSON.parse(event.body || '{}');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Airtable Automationは空のペイロードを送信することが多いので、
    // 最新の承認済み口コミを直接取得する方式に変更

    // Airtable接続
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

    // 最近承認された口コミ（過去5分以内）を取得
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    console.log('📝 最近承認された口コミを検索中...');
    console.log('検索条件: 過去5分以内に作成され、承認済みの口コミ');
    console.log('基準時刻:', fiveMinutesAgo);

    const records = await base('Reviews')
      .select({
        filterByFormula: `AND(
          {IsApproved} = TRUE(),
          IS_AFTER({CreatedAt}, '${fiveMinutesAgo}')
        )`,
        maxRecords: 10,
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      })
      .all();

    console.log(`📊 ${records.length}件の承認済み口コミを検出`);

    // デバッグ: 検出されたレコードの詳細を表示
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, Created: ${record.fields.CreatedAt}, Approved: ${record.fields.IsApproved}`);
      });
    }

    let approvedCount = 0;

    for (const record of records) {
      try {
        // UserEmail が存在するかチェック
        if (record.fields.UserEmail) {
          console.log(`✅ 承認された口コミ: ${record.id}`);

          // サイト情報を取得
          const siteIds = record.fields.Site as string[];
          if (!siteIds || siteIds.length === 0) {
            console.log('⚠️  サイト情報がありません');
            continue;
          }

          const siteRecord = await base('Sites').find(siteIds[0]);
          const siteName = siteRecord.fields.Name as string;

          // 承認通知メールを送信
          await sendApprovalEmail(
            record.fields.UserEmail as string,
            record.fields.UserName as string,
            siteName,
            record.fields.Title as string,
            record.fields.Content as string,
            record.fields.Rating as number
          );

          approvedCount++;
        }
      } catch (error) {
        console.error(`❌ レコード処理エラー (${record.id}):`, error);
      }
    }

    // 承認された口コミがあれば、デプロイをトリガー
    if (approvedCount > 0) {
      console.log(`\n🎉 ${approvedCount}件の口コミが承認されました`);
      await triggerDeploy();
    } else {
      console.log('ℹ️  承認された口コミはありませんでした');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        approvedCount,
        message: `${approvedCount}件の承認通知を送信しました`,
      }),
    };
  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
