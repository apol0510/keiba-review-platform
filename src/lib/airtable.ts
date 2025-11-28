import Airtable from 'airtable';

// Airtable設定を取得する関数（動的に評価）
export function getAirtableConfig() {
  const apiKey = import.meta.env.AIRTABLE_API_KEY || '';
  const baseId = import.meta.env.AIRTABLE_BASE_ID || '';
  const isDemoMode = !apiKey || !baseId;

  console.log('[getAirtableConfig] apiKey:', apiKey ? `exists (${apiKey.length} chars)` : 'missing');
  console.log('[getAirtableConfig] baseId:', baseId || 'missing');
  console.log('[getAirtableConfig] isDemoMode:', isDemoMode);

  return { apiKey, baseId, isDemoMode };
}

// Airtableベースを取得（遅延初期化）
function getBase(): Airtable.Base | null {
  const { apiKey, baseId, isDemoMode } = getAirtableConfig();

  if (isDemoMode) {
    return null;
  }

  try {
    Airtable.configure({ apiKey });
    return Airtable.base(baseId);
  } catch (error) {
    console.error('[getBase] Error initializing Airtable:', error);
    return null;
  }
}

// 後方互換性のため
const isDemoMode = getAirtableConfig().isDemoMode;

// 型定義
export type PricingType = 'free' | 'partially_paid' | 'fully_paid' | 'unknown';

export interface Site {
  id: string;
  name: string;
  url: string;
  slug: string;
  category: 'nankan' | 'chuo' | 'chihou' | 'other';
  description: string | null;
  features: string[];
  price_info: string | null;
  screenshot_url: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  // 新規フィールド
  pricing_type: PricingType;
  has_free_trial: boolean;
  registration_required: boolean;
  last_verified_at: string | null;
  is_closed: boolean;
}

export interface SiteWithStats extends Site {
  review_count: number;
  average_rating: number;
  last_review_at: string | null;
}

export interface Review {
  id: string;
  site_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  content: string;
  is_approved: boolean;
  is_spam: boolean;
  created_at: string;
  approved_at: string | null;
  // 新規フィールド
  helpful_count: number;
  verified_user: boolean;
}

export interface ReviewWithSite extends Review {
  site_name: string;
  site_slug: string;
}

// カテゴリ表示名
export const categoryLabels: Record<string, string> = {
  nankan: '南関競馬',
  chuo: '中央競馬',
  chihou: '地方競馬',
  other: 'その他',
};

// デモ用サンプルデータ
const demoSites: SiteWithStats[] = [
  {
    id: '1',
    name: '競馬予想サイトA',
    url: 'https://example.com/site-a',
    slug: 'site-a',
    category: 'nankan',
    description: '南関競馬専門の予想サイト。大井・川崎を中心に高い的中率を誇ります。',
    features: ['無料予想あり', '南関特化', 'LINE配信'],
    price_info: '月額3,000円〜',
    screenshot_url: null,
    is_approved: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pricing_type: 'partially_paid',
    has_free_trial: true,
    registration_required: true,
    last_verified_at: '2024-11-01T00:00:00Z',
    is_closed: false,
    review_count: 15,
    average_rating: 4.2,
    last_review_at: '2024-11-20T00:00:00Z',
  },
  {
    id: '2',
    name: '中央競馬情報局',
    url: 'https://example.com/site-b',
    slug: 'site-b',
    category: 'chuo',
    description: 'JRA中央競馬の重賞レースに特化した予想サイト。',
    features: ['重賞特化', '買い目公開', '実績公開'],
    price_info: '情報料 1レース500円〜',
    screenshot_url: null,
    is_approved: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    review_count: 23,
    average_rating: 3.8,
    last_review_at: '2024-11-18T00:00:00Z',
  },
  {
    id: '3',
    name: '地方競馬マスター',
    url: 'https://example.com/site-c',
    slug: 'site-c',
    category: 'chihou',
    description: '全国の地方競馬をカバーする総合予想サイト。',
    features: ['全地方対応', 'AI予想', 'メルマガ配信'],
    price_info: '月額5,000円',
    screenshot_url: null,
    is_approved: true,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
    review_count: 8,
    average_rating: 4.5,
    last_review_at: '2024-11-15T00:00:00Z',
  },
];

const demoReviews: Review[] = [
  {
    id: '1',
    site_id: '1',
    user_name: '競馬ファン太郎',
    user_email: 'demo@example.com',
    rating: 5,
    title: '的中率が高い！',
    content: '南関競馬に特化しているだけあって、情報の精度が高いです。先月は3回中2回的中しました。',
    is_approved: true,
    is_spam: false,
    created_at: '2024-11-20T10:00:00Z',
    approved_at: '2024-11-20T12:00:00Z',
  },
  {
    id: '2',
    site_id: '1',
    user_name: '馬券師',
    user_email: 'demo2@example.com',
    rating: 4,
    title: 'コスパ良し',
    content: '月額3000円でこの情報量は満足。ただ、たまに外れることもあるので過信は禁物。',
    is_approved: true,
    is_spam: false,
    created_at: '2024-11-15T08:00:00Z',
    approved_at: '2024-11-15T10:00:00Z',
  },
  {
    id: '3',
    site_id: '1',
    user_name: '初心者',
    user_email: 'demo3@example.com',
    rating: 4,
    title: '初心者にもわかりやすい',
    content: '解説が丁寧で、なぜその馬を推奨するのか理由がしっかり書かれています。',
    is_approved: true,
    is_spam: false,
    created_at: '2024-11-10T14:00:00Z',
    approved_at: '2024-11-10T16:00:00Z',
  },
];

// Airtableレコードをサイトオブジェクトに変換
function recordToSite(record: Airtable.Record<any>): SiteWithStats {
  const fields = record.fields;

  // Descriptionから特徴と料金情報を抽出
  const description = fields.Description || '';
  let features: string[] = [];
  let price_info: string | null = null;
  let cleanDescription = description;

  // 「特徴:」で始まる行を抽出
  const featureMatch = description.match(/特徴:\s*([^\n]+)/);
  if (featureMatch) {
    features = featureMatch[1].split(/[、,]/).map((f: string) => f.trim());
  }

  // 「料金:」で始まる行を抽出
  const priceMatch = description.match(/料金:\s*([^\n]+)/);
  if (priceMatch) {
    price_info = priceMatch[1].trim();
  }

  // 本文から特徴と料金の行を除去
  cleanDescription = description
    .replace(/\n\n特徴:.*/, '')
    .replace(/\n料金:.*/, '')
    .trim();

  return {
    id: record.id,
    name: fields.Name || '',
    url: fields.URL || '',
    slug: fields.Slug || '',
    category: fields.Category || 'other',
    description: cleanDescription || null,
    features,
    price_info,
    screenshot_url: fields.ScreenshotURL || null,
    is_approved: fields.IsApproved || false,
    created_at: record._rawJson.createdTime,
    updated_at: record._rawJson.createdTime,
    // 新規フィールド
    pricing_type: (fields.PricingType as PricingType) || 'unknown',
    has_free_trial: fields.HasFreeTrial || false,
    registration_required: fields.RegistrationRequired || false,
    last_verified_at: fields.LastVerifiedAt || null,
    is_closed: fields.IsClosed || false,
    review_count: 0,  // Reviewsリンクから計算する必要がある
    average_rating: 0,  // Reviewsから計算する必要がある
    last_review_at: null,
  };
}

// Airtableレコードを口コミオブジェクトに変換
function recordToReview(record: Airtable.Record<any>): Review {
  const fields = record.fields;
  return {
    id: record.id,
    site_id: fields.Site?.[0] || '',  // "Site" フィールド（リンクフィールド）
    user_name: fields.UserName || '',
    user_email: fields.UserEmail || '',
    rating: fields.Rating || 0,
    title: fields.Title || '',
    content: fields.Content || '',
    is_approved: fields.IsApproved || false,
    is_spam: fields.IsSpam || false,
    created_at: record._rawJson.createdTime,
    approved_at: fields.ApprovedAt || null,
    // 新規フィールド
    helpful_count: fields.HelpfulCount || 0,
    verified_user: fields.VerifiedUser || false,
  };
}

// API関数
export async function getSitesWithStats(category?: string): Promise<SiteWithStats[]> {
  const { isDemoMode } = getAirtableConfig();
  console.log('[getSitesWithStats] isDemoMode:', isDemoMode, 'category:', category);

  if (isDemoMode) {
    console.log('[getSitesWithStats] Using demo data');
    if (category) {
      return demoSites.filter(s => s.category === category);
    }
    return demoSites;
  }

  try {
    const base = getBase();
    if (!base) {
      console.error('[getSitesWithStats] Base is null, using demo data');
      return demoSites;
    }

    const filterFormula = category
      ? `AND({IsApproved} = TRUE(), {Category} = '${category}')`
      : `{IsApproved} = TRUE()`;

    console.log('[getSitesWithStats] Fetching from Airtable with filter:', filterFormula);

    const records = await base('Sites')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
      })
      .all();

    console.log('[getSitesWithStats] Fetched', records.length, 'records from Airtable');
    const sites = records.map(recordToSite);

    // Fetch all approved reviews once
    const allReviewsRecords = await base('Reviews')
      .select({
        filterByFormula: `{IsApproved} = TRUE()`,
      })
      .all();

    // Calculate stats for each site
    sites.forEach(site => {
      const siteReviews = allReviewsRecords.filter(record => {
        const siteField = record.fields.Site as string[] | undefined;
        return siteField && Array.isArray(siteField) && siteField.includes(site.id);
      });

      site.review_count = siteReviews.length;

      if (siteReviews.length > 0) {
        const totalRating = siteReviews.reduce((sum, r) => sum + (r.fields.Rating as number || 0), 0);
        site.average_rating = totalRating / siteReviews.length;

        // Get latest review time
        const latestReview = siteReviews.reduce((latest, current) => {
          const currentTime = new Date(current._rawJson.createdTime).getTime();
          const latestTime = latest ? new Date(latest._rawJson.createdTime).getTime() : 0;
          return currentTime > latestTime ? current : latest;
        }, null as any);

        site.last_review_at = latestReview ? latestReview._rawJson.createdTime : null;
      }
    });

    console.log('[getSitesWithStats] Returning', sites.length, 'sites with stats');
    return sites;
  } catch (error) {
    console.error('[getSitesWithStats] Error fetching sites:', error);
    return [];
  }
}

export async function getSiteBySlug(slug: string): Promise<SiteWithStats | null> {
  const { isDemoMode } = getAirtableConfig();

  if (isDemoMode) {
    return demoSites.find(s => s.slug === slug) || null;
  }

  try {
    const base = getBase();
    if (!base) return null;

    const records = await base('Sites')
      .select({
        filterByFormula: `AND({IsApproved} = TRUE(), {Slug} = '${slug}')`,
        maxRecords: 1,
      })
      .all();

    if (records.length === 0) return null;

    const site = recordToSite(records[0]);

    // Calculate stats from reviews
    const reviewsRecords = await base('Reviews')
      .select({
        filterByFormula: `{IsApproved} = TRUE()`,
      })
      .all();

    const siteReviews = reviewsRecords.filter(record => {
      const siteField = record.fields.Site as string[] | undefined;
      return siteField && Array.isArray(siteField) && siteField.includes(site.id);
    });

    site.review_count = siteReviews.length;

    if (siteReviews.length > 0) {
      const totalRating = siteReviews.reduce((sum, r) => sum + (r.fields.Rating as number || 0), 0);
      site.average_rating = totalRating / siteReviews.length;

      const latestReview = siteReviews.reduce((latest, current) => {
        const currentTime = new Date(current._rawJson.createdTime).getTime();
        const latestTime = latest ? new Date(latest._rawJson.createdTime).getTime() : 0;
        return currentTime > latestTime ? current : latest;
      }, null as any);

      site.last_review_at = latestReview ? latestReview._rawJson.createdTime : null;
    }

    return site;
  } catch (error) {
    console.error('Error fetching site:', error);
    return null;
  }
}

export async function getReviewsBySiteId(siteId: string, sortBy: 'newest' | 'rating' | 'helpful' = 'newest'): Promise<Review[]> {
  const { isDemoMode } = getAirtableConfig();

  if (isDemoMode) {
    return demoReviews.filter(r => r.site_id === siteId);
  }

  try {
    const base = getBase();
    if (!base) return [];

    // Get all approved reviews and filter in JavaScript
    // (Airtable formula filtering on linked record fields is unreliable)
    const records = await base('Reviews')
      .select({
        filterByFormula: `{IsApproved} = TRUE()`,
      })
      .all();

    // Filter for matching site ID
    const filteredRecords = records.filter(record => {
      const siteField = record.fields.Site as string[] | undefined;
      return siteField && Array.isArray(siteField) && siteField.includes(siteId);
    });

    // Sort based on sortBy parameter
    filteredRecords.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          // Sort by rating (highest first)
          return (b.fields.Rating as number || 0) - (a.fields.Rating as number || 0);
        case 'helpful':
          // Sort by helpful count (most helpful first)
          return (b.fields.HelpfulCount as number || 0) - (a.fields.HelpfulCount as number || 0);
        case 'newest':
        default:
          // Sort by created time (newest first)
          const aTime = new Date(a._rawJson.createdTime).getTime();
          const bTime = new Date(b._rawJson.createdTime).getTime();
          return bTime - aTime;
      }
    });

    return filteredRecords.map(recordToReview);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function getLatestReviews(limit: number = 10): Promise<ReviewWithSite[]> {
  const { isDemoMode } = getAirtableConfig();

  if (isDemoMode) {
    return demoReviews.slice(0, limit).map(r => {
      const site = demoSites.find(s => s.id === r.site_id);
      return {
        ...r,
        site_name: site?.name || '',
        site_slug: site?.slug || '',
      };
    });
  }

  try {
    const base = getBase();
    if (!base) return [];

    const records = await base('Reviews')
      .select({
        filterByFormula: `{IsApproved} = TRUE()`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
        maxRecords: limit,
      })
      .all();

    // サイト情報を取得して結合
    const reviews = records.map(recordToReview);
    const siteIds = [...new Set(reviews.map(r => r.site_id))];

    const sitesMap = new Map<string, SiteWithStats>();
    for (const siteId of siteIds) {
      try {
        const siteRecord = await base('Sites').find(siteId);
        sitesMap.set(siteId, recordToSite(siteRecord));
      } catch {
        // サイトが見つからない場合はスキップ
      }
    }

    return reviews.map(r => {
      const site = sitesMap.get(r.site_id);
      return {
        ...r,
        site_name: site?.name || '',
        site_slug: site?.slug || '',
      };
    });
  } catch (error) {
    console.error('Error fetching latest reviews:', error);
    return [];
  }
}

export async function submitReview(review: {
  site_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  content: string;
  ip_address?: string;
  user_agent?: string;
  // 料金情報更新（任意）
  pricing_type?: 'free' | 'partially_paid' | 'fully_paid' | '';
  has_free_trial?: boolean;
  registration_required?: boolean;
}): Promise<Review> {
  const { isDemoMode } = getAirtableConfig();

  if (isDemoMode) {
    // デモモードでは成功を返す
    return {
      id: 'demo-' + Date.now(),
      site_id: review.site_id,
      user_name: review.user_name,
      user_email: review.user_email,
      rating: review.rating,
      title: review.title,
      content: review.content,
      is_approved: false,
      is_spam: false,
      created_at: new Date().toISOString(),
      approved_at: null,
      helpful_count: 0,
      verified_user: false,
    };
  }

  try {
    const base = getBase();
    if (!base) throw new Error('Airtable base not initialized');

    const recordData: any = {
      Site: [review.site_id],  // "Site" フィールド（リンクフィールド）
      UserName: review.user_name,
      UserEmail: review.user_email,
      Rating: review.rating,
      Title: review.title,
      Content: review.content,
      IsApproved: false,
      IsSpam: false,
    };

    // 料金情報が提供されている場合は追加
    if (review.pricing_type && review.pricing_type !== '') {
      recordData.SuggestedPricingType = review.pricing_type;
    }
    if (review.has_free_trial !== undefined) {
      recordData.SuggestedHasFreeTrial = review.has_free_trial;
    }
    if (review.registration_required !== undefined) {
      recordData.SuggestedRegistrationRequired = review.registration_required;
    }

    const record = await base('Reviews').create(recordData);

    return recordToReview(record);
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}

// エクスポート（互換性のため）
export { isDemoMode };
