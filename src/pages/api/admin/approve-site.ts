import type { APIRoute } from 'astro';
import Airtable from 'airtable';
import { notifySubmitterApproved } from '../../../lib/email';

const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
const SITE_URL = import.meta.env.SITE_URL || 'https://frabjous-taiyaki-460401.netlify.app';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { siteId, siteUrl } = await request.json();

    if (!siteId) {
      return new Response(
        JSON.stringify({ message: 'サイトIDが指定されていません' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return new Response(
        JSON.stringify({ message: 'サーバー設定エラー' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    Airtable.configure({ apiKey: AIRTABLE_API_KEY });
    const base = Airtable.base(AIRTABLE_BASE_ID);

    // サイト情報を取得
    const siteRecord = await base('Sites').find(siteId);
    const siteName = siteRecord.fields.Name as string;
    const siteSlug = siteRecord.fields.Slug as string;
    const submitterEmail = siteRecord.fields.SubmitterEmail as string;

    // AirtableからURLを取得（リクエストのsiteUrlより正確）
    const actualSiteUrl = siteRecord.fields.URL as string;

    console.log('Site info:', { siteName, siteSlug, actualSiteUrl });

    // サイトを承認状態に更新
    await base('Sites').update(siteId, {
      IsApproved: true,
    });

    // スクリーンショットURLを生成して保存
    const screenshotUrl = generateScreenshotUrl(actualSiteUrl || siteUrl);
    console.log('Generated screenshot URL:', screenshotUrl);

    if (screenshotUrl) {
      await base('Sites').update(siteId, {
        ScreenshotURL: screenshotUrl,
      });
    }

    // 投稿者に承認通知を送信
    if (submitterEmail) {
      notifySubmitterApproved(submitterEmail, {
        name: siteName,
        url: siteUrl,
        slug: siteSlug,
      }).catch(error => {
        console.error('[Email] Failed to send approval notification:', error);
      });
    }

    return new Response(
      JSON.stringify({ message: 'サイトを承認しました' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error approving site:', error);
    return new Response(
      JSON.stringify({ message: 'サイト承認に失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * スクリーンショットURLを生成
 * shot.screenshotapi.net を使用（無料、登録不要、高速）
 */
function generateScreenshotUrl(siteUrl: string): string {
  if (!siteUrl) {
    console.error('Site URL is empty');
    return '';
  }

  // URLを正規化
  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
    console.log(`Added https:// prefix to URL: ${normalizedUrl}`);
  }

  const encodedUrl = encodeURIComponent(normalizedUrl);

  // shot.screenshotapi.net: 無料、登録不要、高速CDN
  // width=1200: 表示幅
  // output=image: 画像として出力
  // file_type=png: PNG形式（品質が良い）
  // wait_for_event=load: ページ読み込み完了を待つ
  const screenshotUrl = `https://shot.screenshotapi.net/screenshot?token=NRTY0JN-EE16VKV-PYJXGMP-4GV3C1T&url=${encodedUrl}&width=1200&output=image&file_type=png&wait_for_event=load`;

  return screenshotUrl;
}
