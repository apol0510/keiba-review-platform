import type { APIRoute } from 'astro';
import Airtable from 'airtable';
import { notifyAdminNewSite, notifySubmitterRegistered } from '../../lib/email';

const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('=== Submit Site API Called ===');
    const data = await request.json();
    console.log('Received data:', JSON.stringify(data, null, 2));

    // バリデーション
    if (!data.name || !data.url || !data.category || !data.description) {
      console.log('Validation failed: missing required fields');
      return new Response(
        JSON.stringify({ message: '必須項目が入力されていません' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.submitter_name || !data.submitter_email) {
      return new Response(
        JSON.stringify({ message: '投稿者情報が入力されていません' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 説明文の最低文字数チェック
    if (data.description.length < 50) {
      return new Response(
        JSON.stringify({ message: 'サイト説明は50文字以上入力してください' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // URLのフォーマットチェック
    try {
      new URL(data.url);
    } catch {
      return new Response(
        JSON.stringify({ message: '正しいURLを入力してください' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Airtableに保存
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('Airtable credentials not configured');
      console.error('AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'exists' : 'missing');
      console.error('AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? 'exists' : 'missing');
      return new Response(
        JSON.stringify({ message: 'サーバーエラーが発生しました' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Configuring Airtable...');
    Airtable.configure({ apiKey: AIRTABLE_API_KEY });
    const base = Airtable.base(AIRTABLE_BASE_ID);

    // Slugを生成（URLのドメイン部分から）
    const urlObj = new URL(data.url);
    const slug = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
    console.log('Generated slug:', slug);

    // 重複チェック
    console.log('Checking for duplicates...');
    const existingRecords = await base('Sites')
      .select({
        filterByFormula: `OR(
          {URL} = "${data.url.replace(/"/g, '\\"')}",
          {Slug} = "${slug.replace(/"/g, '\\"')}"
        )`,
        maxRecords: 1,
      })
      .all();

    console.log('Duplicate check result:', existingRecords.length);

    if (existingRecords.length > 0) {
      console.log('Site already exists');
      return new Response(
        JSON.stringify({ message: 'このサイトは既に登録されています' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Airtableに新規サイトを作成
    console.log('Creating new site record...');

    const recordData = {
      fields: {
        Name: data.name,
        Slug: slug,
        URL: data.url,
        Category: data.category,
        Description: data.description,
        IsApproved: false, // 未承認状態で登録
        SubmitterName: data.submitter_name,
        SubmitterEmail: data.submitter_email,
      }
    };
    console.log('Record data:', JSON.stringify(recordData, null, 2));

    const createdRecords = await base('Sites').create([recordData]);
    console.log('Site created successfully:', createdRecords[0].id);

    // メール通知を送信（非同期、エラーがあってもメイン処理は続行）
    Promise.all([
      notifyAdminNewSite({
        name: data.name,
        url: data.url,
        category: data.category,
        description: data.description,
        submitterName: data.submitter_name,
        submitterEmail: data.submitter_email,
      }),
      notifySubmitterRegistered(data.submitter_email, {
        name: data.name,
        url: data.url,
      }),
    ]).catch(error => {
      console.error('[Email] Failed to send notifications:', error);
    });

    return new Response(
      JSON.stringify({
        message: 'サイトを登録しました。管理者の承認をお待ちください。'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting site:', error);

    // エラーの詳細を取得
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('Error details:', errorMessage);

    return new Response(
      JSON.stringify({
        message: 'サーバーエラーが発生しました。しばらく経ってから再度お試しください。',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
