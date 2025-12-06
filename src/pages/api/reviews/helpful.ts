import type { APIRoute } from 'astro';
import Airtable from 'airtable';

const base = new Airtable({
  apiKey: import.meta.env.AIRTABLE_API_KEY
}).base(import.meta.env.AIRTABLE_BASE_ID);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { reviewId } = await request.json();

    if (!reviewId) {
      return new Response(
        JSON.stringify({ error: 'reviewId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 現在のカウントを取得
    const record = await base('Reviews').find(reviewId);
    const currentCount = record.fields.HelpfulCount as number || 0;

    // カウントを +1
    await base('Reviews').update(reviewId, {
      HelpfulCount: currentCount + 1
    });

    return new Response(
      JSON.stringify({
        success: true,
        newCount: currentCount + 1
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating helpful count:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to update helpful count',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
