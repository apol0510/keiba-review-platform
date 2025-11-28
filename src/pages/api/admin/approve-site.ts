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

    // スクリーンショットURLを設定（外部サービスを使用）
    const screenshotUrl = generateScreenshotUrl(actualSiteUrl || siteUrl);
    console.log('Generated screenshot URL:', screenshotUrl);

    await base('Sites').update(siteId, {
      ScreenshotURL: screenshotUrl,
    });

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
 * S-shot.ru を使用（無料、登録不要、URLエンコード不要）
 */
function generateScreenshotUrl(siteUrl: string): string {
  if (!siteUrl) {
    console.error('Site URL is empty');
    return '';
  }

  // URLが http:// または https:// で始まっていない場合は https:// を追加
  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
    console.log(`Added https:// prefix to URL: ${normalizedUrl}`);
  }

  // S-shot.ru: 無料、登録不要、日本語サイト対応
  // フォーマット: https://mini.s-shot.ru/[width]x[height]/[format]/[thumbnail_width]/[options]/?[URL]
  // 1024x768の解像度、JPEG形式、1024pxのサムネイル、100%ズーム
  const screenshotUrl = `https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/?${normalizedUrl}`;

  return screenshotUrl;

  // 代替オプション:
  //
  // Microlink (無料枠: 月50リクエスト、登録不要)
  // const encodedUrl = encodeURIComponent(normalizedUrl);
  // return `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`;
  //
  // ApiFlash (無料枠: 月100枚、要登録)
  // const apiKey = import.meta.env.APIFLASH_KEY;
  // if (apiKey) {
  //   return `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodedUrl}&width=1200&height=800`;
  // }
}
