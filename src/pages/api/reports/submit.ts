import type { APIRoute } from 'astro';
import { getAirtableConfig, getSiteBySlug } from '../../../lib/airtable';
import Airtable from 'airtable';

const reportTypeLabels: Record<string, string> = {
  pricing: '料金体系が違う',
  closed: 'サイトが閉鎖されている',
  url: 'URLが間違っている',
  registration: '会員登録の要否が違う',
  other: 'その他',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { siteSlug, reportType, details, email } = await request.json();

    if (!siteSlug || !reportType) {
      return new Response(
        JSON.stringify({ error: 'Site slug and report type are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // サイトを取得
    const site = await getSiteBySlug(siteSlug);
    if (!site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { apiKey, baseId } = await getAirtableConfig();
    Airtable.configure({ apiKey });
    const base = Airtable.base(baseId);

    // Reportsテーブルに保存（テーブルが存在しない場合は、Sitesに直接メモを追加する代替案も可能）
    // ここでは簡易的にSitesテーブルのDescriptionに追記する方式を採用
    // 本格運用では専用のReportsテーブルを作成することを推奨

    const reportText = `
━━━━━━━━━━━━━━━━━━━━━━
【ユーザー報告】${new Date().toLocaleString('ja-JP')}
種類: ${reportTypeLabels[reportType] || reportType}
詳細: ${details || '(なし)'}
連絡先: ${email || '(なし)'}
━━━━━━━━━━━━━━━━━━━━━━
`;

    // サイトの説明文に報告を追記
    const currentDescription = site.description || '';
    const updatedDescription = currentDescription + reportText;

    await base('Sites').update(site.id, {
      Description: updatedDescription.substring(0, 5000), // Airtableの文字数制限を考慮
    });

    // 理想的には、SendGridでメール通知も送る
    // （現在は省略、必要に応じて実装）

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Report submission error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit report' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
