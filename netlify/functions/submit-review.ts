import type { Handler } from '@netlify/functions';
import Airtable from 'airtable';

// メール送信関数
async function sendEmail(to: string, subject: string, html: string) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@keiba-review.jp';

  console.log('📧 sendEmail関数が呼ばれました');
  console.log('宛先:', to);
  console.log('件名:', subject);
  console.log('APIキー存在:', !!SENDGRID_API_KEY);

  if (!SENDGRID_API_KEY) {
    console.log('❌ SendGrid APIキーが設定されていません。メール送信をスキップします。');
    return;
  }

  console.log('✅ SendGrid APIキーが設定されています。メール送信を試みます...');

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM_EMAIL },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    console.log('📬 SendGrid APIレスポンスステータス:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGridエラー:', errorText);
      console.error('レスポンス詳細:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    } else {
      console.log(`✅ メール送信成功: ${to}`);
    }
  } catch (error) {
    console.error('❌ メール送信エラー（catchブロック）:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);
    }
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
    const data = JSON.parse(event.body || '{}');

    const {
      site_id,
      user_name,
      user_email,
      rating,
      title,
      content,
    } = data;

    // バリデーション
    if (!site_id || !user_name || !user_email || !rating || !title || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '必須項目が不足しています' }),
      };
    }

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

    // 口コミをAirtableに登録（存在するフィールドのみ）
    const record = await base('Reviews').create({
      Site: [site_id],
      UserName: user_name,
      UserEmail: user_email,
      Rating: rating,
      Title: title,
      Content: content,
      // IsApprovedはデフォルトでfalseなので省略（Checkboxフィールド）
    });

    // サイト情報を取得
    const siteRecord = await base('Sites').find(site_id);
    const siteName = siteRecord.fields.Name as string;

    console.log('📧 メール送信準備開始');
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '設定済み' : '未設定');
    console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'デフォルト');
    console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? '設定済み' : '未設定');

    // ユーザーへの自動返信メール送信
    const userEmailHtml = `
      <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>口コミ投稿ありがとうございます</h2>
        <p>${user_name} 様</p>
        <p>「${siteName}」への口コミ投稿を受け付けました。</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>投稿内容</h3>
          <p><strong>タイトル:</strong> ${title}</p>
          <p><strong>評価:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
          <p><strong>口コミ本文:</strong></p>
          <p>${content}</p>
        </div>

        <p>口コミは管理者の承認後に公開されます。通常、1〜2営業日以内に承認されます。</p>
        <p>ご協力ありがとうございました。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 12px;">
          このメールは自動送信されています。返信はできません。<br>
          競馬予想サイト口コミプラットフォーム<br>
          <a href="https://keiba-review.jp">https://keiba-review.jp</a>
        </p>
      </div>
    `;

    await sendEmail(
      user_email,
      '口コミ投稿ありがとうございます - 競馬予想サイト口コミプラットフォーム',
      userEmailHtml
    );

    // 管理者への通知メール送信
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (ADMIN_EMAIL) {
      const adminEmailHtml = `
        <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>新しい口コミが投稿されました</h2>

          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3>口コミ詳細</h3>
            <p><strong>サイト名:</strong> ${siteName}</p>
            <p><strong>投稿者:</strong> ${user_name}</p>
            <p><strong>メールアドレス:</strong> ${user_email}</p>
            <p><strong>評価:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
            <p><strong>タイトル:</strong> ${title}</p>
            <p><strong>口コミ本文:</strong></p>
            <p style="white-space: pre-wrap;">${content}</p>
          </div>

          <p>
            <a href="https://airtable.com/appwdYkA3Fptn9TtN/tblXzvE1IHFQV1mw8"
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              Airtableで確認・承認する
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            競馬予想サイト口コミプラットフォーム 管理者通知<br>
            投稿日時: ${new Date().toLocaleString('ja-JP')}
          </p>
        </div>
      `;

      await sendEmail(
        ADMIN_EMAIL,
        `[新規口コミ] ${siteName} - ${user_name}様より`,
        adminEmailHtml
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        review: {
          id: record.id,
          ...record.fields,
        },
      }),
    };
  } catch (error) {
    console.error('Error submitting review:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '口コミの投稿に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
