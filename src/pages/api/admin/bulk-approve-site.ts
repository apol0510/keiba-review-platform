import type { APIRoute } from 'astro';
import { getAirtableConfig } from '../../../lib/airtable';
import Airtable from 'airtable';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { siteId } = await request.json();

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Site ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { isDemoMode, apiKey, baseId } = await getAirtableConfig();

    if (isDemoMode || !apiKey || !baseId) {
      return new Response(JSON.stringify({ error: 'Airtable not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Airtableで承認フラグを立てる（スクリーンショット取得なし）
    Airtable.configure({ apiKey });
    const base = Airtable.base(baseId);

    await base('Sites').update(siteId, {
      IsApproved: true,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error approving site:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to approve site' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
