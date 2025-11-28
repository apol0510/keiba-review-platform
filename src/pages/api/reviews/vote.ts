import type { APIRoute } from 'astro';
import { getAirtableConfig } from '../../../lib/airtable';
import Airtable from 'airtable';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { reviewId } = await request.json();

    if (!reviewId) {
      return new Response(
        JSON.stringify({ error: 'Review ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { apiKey, baseId } = await getAirtableConfig();
    Airtable.configure({ apiKey });
    const base = Airtable.base(baseId);

    // 現在の投票数を取得
    const record = await base('Reviews').find(reviewId);
    const currentCount = (record.fields.HelpfulCount as number) || 0;
    const newCount = currentCount + 1;

    // 投票数を更新
    await base('Reviews').update(reviewId, {
      HelpfulCount: newCount,
    });

    return new Response(
      JSON.stringify({ success: true, helpfulCount: newCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Vote error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to vote' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
