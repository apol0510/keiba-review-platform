import type { APIRoute } from 'astro';
import Airtable from 'airtable';

const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
}

const base = AIRTABLE_API_KEY && AIRTABLE_BASE_ID
  ? new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)
  : null;

/**
 * GET: ⭐5口コミ一覧取得
 * POST: ⭐5口コミを⭐4に変更
 */

export const GET: APIRoute = async () => {
  if (!base) {
    return new Response(JSON.stringify({ error: 'Airtable not configured' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const reviews = await base('Reviews').select({
      filterByFormula: '{Rating} = 5'
    }).all();

    const star5Reviews = reviews.map(record => ({
      id: record.id,
      rating: record.fields.Rating,
      title: record.fields.Title,
      content: record.fields.Content,
      createdAt: record.fields.CreatedAt,
    }));

    return new Response(JSON.stringify({ count: star5Reviews.length, reviews: star5Reviews }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching star 5 reviews:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch star 5 reviews' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!base) {
    return new Response(JSON.stringify({ error: 'Airtable not configured' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const { action } = await request.json();

    if (action !== 'fix-all') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // ⭐5の口コミを取得
    const reviews = await base('Reviews').select({
      filterByFormula: '{Rating} = 5'
    }).all();

    let successCount = 0;
    let failCount = 0;

    // すべてを⭐4に変更
    for (const review of reviews) {
      try {
        await base('Reviews').update(review.id, {
          Rating: 4
        });
        successCount++;
        // レート制限を避ける
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to update review ${review.id}:`, error);
        failCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: reviews.length,
      successCount,
      failCount
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fixing star 5 reviews:', error);
    return new Response(JSON.stringify({ error: 'Failed to fix star 5 reviews' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
