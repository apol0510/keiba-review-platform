import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = import.meta.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = import.meta.env.SENDGRID_FROM_EMAIL || 'support@keiba-review.jp';
const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL;
const SITE_URL = import.meta.env.SITE_URL || 'https://keiba-review.jp';

// SendGrid初期化
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * 管理者に新規サイト登録を通知
 */
export async function notifyAdminNewSite(siteData: {
  name: string;
  url: string;
  category: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
}) {
  if (!SENDGRID_API_KEY || !ADMIN_EMAIL) {
    console.log('[Email] SendGrid not configured, skipping admin notification');
    return;
  }

  const categoryLabels: Record<string, string> = {
    nankan: '南関競馬',
    chuo: '中央競馬',
    chihou: '地方競馬'
  };

  const msg = {
    to: ADMIN_EMAIL,
    from: SENDGRID_FROM_EMAIL,
    subject: `【新規サイト登録】${siteData.name}`,
    text: `
新しい競馬予想サイトが登録されました。

■ サイト情報
サイト名: ${siteData.name}
URL: ${siteData.url}
カテゴリ: ${categoryLabels[siteData.category] || siteData.category}

■ 説明
${siteData.description}

■ 投稿者情報
名前: ${siteData.submitterName}
メール: ${siteData.submitterEmail}

■ 管理画面
承認・却下はこちらから: ${SITE_URL}/admin/pending-sites

---
競馬予想サイト口コミプラットフォーム
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #1f2937; }
    .value { color: #4b5563; margin-top: 5px; }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🏇 新規サイト登録通知</h2>
    </div>
    <div class="content">
      <p>新しい競馬予想サイトが登録されました。</p>

      <div class="section">
        <div class="label">■ サイト情報</div>
        <div class="value">
          <strong>サイト名:</strong> ${siteData.name}<br>
          <strong>URL:</strong> <a href="${siteData.url}">${siteData.url}</a><br>
          <strong>カテゴリ:</strong> ${categoryLabels[siteData.category] || siteData.category}
        </div>
      </div>

      <div class="section">
        <div class="label">■ 説明</div>
        <div class="value" style="white-space: pre-wrap;">${siteData.description}</div>
      </div>

      <div class="section">
        <div class="label">■ 投稿者情報</div>
        <div class="value">
          <strong>名前:</strong> ${siteData.submitterName}<br>
          <strong>メール:</strong> <a href="mailto:${siteData.submitterEmail}">${siteData.submitterEmail}</a>
        </div>
      </div>

      <a href="${SITE_URL}/admin/pending-sites" class="button">管理画面で確認</a>
    </div>
    <div class="footer">
      競馬予想サイト口コミプラットフォーム
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log('[Email] Admin notification sent successfully');
  } catch (error) {
    console.error('[Email] Failed to send admin notification:', error);
  }
}

/**
 * 投稿者にサイト登録完了を通知
 */
export async function notifySubmitterRegistered(submitterEmail: string, siteData: {
  name: string;
  url: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.log('[Email] SendGrid not configured, skipping submitter notification');
    return;
  }

  const msg = {
    to: submitterEmail,
    from: SENDGRID_FROM_EMAIL,
    subject: `【登録完了】${siteData.name} - 競馬予想サイト口コミプラットフォーム`,
    text: `
サイト登録ありがとうございます。

■ 登録内容
サイト名: ${siteData.name}
URL: ${siteData.url}

■ 次のステップ
1. 管理者が内容を確認します（1〜3営業日）
2. 承認されるとサイトに掲載されます
3. ユーザーからのレビューが集まり始めます

承認が完了しましたら、改めてメールでお知らせいたします。

---
競馬予想サイト口コミプラットフォーム
${SITE_URL}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #1f2937; }
    .value { color: #4b5563; margin-top: 5px; }
    .steps { background: white; padding: 15px; border-left: 4px solid #059669; margin: 20px 0; }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">✅ サイト登録完了</h2>
    </div>
    <div class="content">
      <p>サイト登録ありがとうございます。</p>

      <div class="section">
        <div class="label">■ 登録内容</div>
        <div class="value">
          <strong>サイト名:</strong> ${siteData.name}<br>
          <strong>URL:</strong> <a href="${siteData.url}">${siteData.url}</a>
        </div>
      </div>

      <div class="steps">
        <div class="label">■ 次のステップ</div>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>管理者が内容を確認します（1〜3営業日）</li>
          <li>承認されるとサイトに掲載されます</li>
          <li>ユーザーからのレビューが集まり始めます</li>
        </ol>
      </div>

      <p style="color: #059669; font-weight: bold;">承認が完了しましたら、改めてメールでお知らせいたします。</p>
    </div>
    <div class="footer">
      競馬予想サイト口コミプラットフォーム<br>
      <a href="${SITE_URL}" style="color: #2563eb;">${SITE_URL}</a>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log('[Email] Submitter notification sent successfully');
  } catch (error) {
    console.error('[Email] Failed to send submitter notification:', error);
  }
}

/**
 * 投稿者にサイト承認を通知
 */
export async function notifySubmitterApproved(submitterEmail: string, siteData: {
  name: string;
  url: string;
  slug: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.log('[Email] SendGrid not configured, skipping approval notification');
    return;
  }

  const siteDetailUrl = `${SITE_URL}/keiba-yosou/${siteData.slug}`;

  const msg = {
    to: submitterEmail,
    from: SENDGRID_FROM_EMAIL,
    subject: `【承認完了】${siteData.name} が掲載されました`,
    text: `
おめでとうございます！

ご登録いただいた「${siteData.name}」が承認され、サイトに掲載されました。

■ サイト詳細ページ
${siteDetailUrl}

■ できること
✅ ユーザーがサイトを閲覧できます
✅ レビューを投稿できるようになりました
✅ 評価や口コミが集まり始めます

ユーザーからのレビューをお待ちしております！

---
競馬予想サイト口コミプラットフォーム
${SITE_URL}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #1f2937; }
    .value { color: #4b5563; margin-top: 5px; }
    .features { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .feature-item { margin: 10px 0; padding-left: 25px; position: relative; }
    .feature-item:before { content: "✅"; position: absolute; left: 0; }
    .button {
      display: inline-block;
      background: #16a34a;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🎉 承認完了！</h2>
    </div>
    <div class="content">
      <p>おめでとうございます！</p>
      <p>ご登録いただいた「<strong>${siteData.name}</strong>」が承認され、サイトに掲載されました。</p>

      <div class="features">
        <div class="label">■ できること</div>
        <div class="feature-item">ユーザーがサイトを閲覧できます</div>
        <div class="feature-item">レビューを投稿できるようになりました</div>
        <div class="feature-item">評価や口コミが集まり始めます</div>
      </div>

      <p>ユーザーからのレビューをお待ちしております！</p>

      <a href="${siteDetailUrl}" class="button">サイト詳細ページを見る</a>
    </div>
    <div class="footer">
      競馬予想サイト口コミプラットフォーム<br>
      <a href="${SITE_URL}" style="color: #2563eb;">${SITE_URL}</a>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await sgMail.send(msg);
    console.log('[Email] Approval notification sent successfully');
  } catch (error) {
    console.error('[Email] Failed to send approval notification:', error);
  }
}
