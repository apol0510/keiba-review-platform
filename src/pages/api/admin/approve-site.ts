import type { APIRoute } from 'astro';
import Airtable from 'airtable';
import { notifySubmitterApproved } from '../../../lib/email';

const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
const SITE_URL = import.meta.env.SITE_URL || 'https://frabjous-taiyaki-460401.netlify.app';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { siteId, siteUrl, category, siteQuality, displayPriority } = await request.json();

    if (!siteId) {
      return new Response(
        JSON.stringify({ message: 'サイトIDが指定されていません' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // カテゴリが指定されていない場合はエラー
    if (!category || category === 'other') {
      return new Response(
        JSON.stringify({ message: 'カテゴリを選択してください（中央競馬、南関競馬、地方競馬）' }),
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

    // サイトを承認状態に更新し、カテゴリ、品質、優先度も設定
    const updateFields: any = {
      IsApproved: true,
      Category: category, // カテゴリを更新
    };

    // 品質が指定されている場合は設定（デフォルト: normal）
    if (siteQuality) {
      updateFields.SiteQuality = siteQuality;
    }

    // 優先度が指定されている場合は設定（デフォルト: 50）
    if (displayPriority !== undefined && displayPriority !== null) {
      updateFields.DisplayPriority = displayPriority;
    }

    console.log('Updating site with fields:', updateFields);
    await base('Sites').update(siteId, updateFields);

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
 * thum.io を使用（確実に動作、無料、登録不要）
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

  // thum.io: 確実に動作、無料、登録不要
  // 600px幅で軽量化（元の1200pxから変更）
  const screenshotUrl = `https://image.thum.io/get/width/600/crop/400/noanimate/${normalizedUrl}`;

  return screenshotUrl;
}
