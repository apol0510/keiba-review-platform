import type { APIRoute } from 'astro';
import Airtable from 'airtable';

const base = new Airtable({
  apiKey: import.meta.env.AIRTABLE_API_KEY
}).base(import.meta.env.AIRTABLE_BASE_ID);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const {
      site_id,
      user_name,
      user_email,
      rating,
      title,
      content,
      pricing_type,
      has_free_trial,
      registration_required,
      accuracy_rating,
      price_rating,
      support_rating,
      transparency_rating,
    } = data;

    // バリデーション
    if (!site_id || !user_name || !user_email || !rating || !title || !content) {
      return new Response(
        JSON.stringify({ error: '必須項目が不足しています' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 口コミをAirtableに登録
    const record = await base('Reviews').create({
      Site: [site_id],
      UserName: user_name,
      UserEmail: user_email,
      Rating: rating,
      Title: title,
      Content: content,
      IsApproved: false, // 承認制
      // 任意フィールド
      ...(pricing_type && { PricingType: pricing_type }),
      ...(has_free_trial !== undefined && { HasFreeTrial: has_free_trial }),
      ...(registration_required !== undefined && { RegistrationRequired: registration_required }),
      ...(accuracy_rating && { AccuracyRating: accuracy_rating }),
      ...(price_rating && { PriceRating: price_rating }),
      ...(support_rating && { SupportRating: support_rating }),
      ...(transparency_rating && { TransparencyRating: transparency_rating }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        review: {
          id: record.id,
          ...record.fields,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error submitting review:', error);

    return new Response(
      JSON.stringify({
        error: '口コミの投稿に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
