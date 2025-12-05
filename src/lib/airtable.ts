import Airtable from 'airtable';

// Airtable設定
const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
}

// Airtableクライアント初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// 強力なメモリキャッシュ（30分間有効 - SSGモードでは実質永続）
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30分

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Airtable設定を取得する関数（互換性のため）
export async function getAirtableConfig() {
  return {
    isDemoMode: false,
    apiKey: AIRTABLE_API_KEY,
    baseId: AIRTABLE_BASE_ID
  };
}

// 型定義
export type Category = 'nankan' | 'chuo' | 'chihou';
export type SiteStatus = 'active' | 'pending' | 'rejected';
export type ReviewStatus = 'approved' | 'pending' | 'spam';

export interface Site {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string;
  category: Category;
  screenshotUrl?: string;
  isApproved: boolean;
  status?: SiteStatus;
  reviewCount?: number;
  averageRating?: number;
  createdAt: string;
}

export interface Review {
  id: string;
  siteId: string;
  siteName?: string;
  username: string;
  rating: number;
  title: string;
  content: string;
  status: ReviewStatus;
  createdAt: string;
  created_at?: string; // snake_caseエイリアス（オプション）
}

// サイト取得関数
export async function getAllSites(): Promise<Site[]> {
  const records = await base('Sites').select({
    view: 'Grid view',
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  return records.map(record => ({
    id: record.id,
    name: record.fields.Name as string,
    slug: record.fields.Slug as string,
    url: record.fields.URL as string,
    description: record.fields.Description as string || '',
    category: record.fields.Category as Category,
    screenshotUrl: record.fields.ScreenshotURL as string,
    isApproved: record.fields.IsApproved as boolean || false,
    status: record.fields.IsApproved ? 'active' : 'pending',
    reviewCount: record.fields.Reviews ? (record.fields.Reviews as string[]).length : 0,
    averageRating: record.fields['Average Rating'] as number,
    createdAt: record.fields.CreatedAt as string
  }));
}

// 承認済みサイト取得
export async function getApprovedSites(): Promise<Site[]> {
  // キャッシュチェック
  const cacheKey = 'approved_sites';
  const cached = getCached<Site[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = TRUE()',
    sort: [{ field: 'DisplayPriority', direction: 'desc' }, { field: 'CreatedAt', direction: 'desc' }]
  }).all();

  const sites = records.map(record => ({
    id: record.id,
    name: record.fields.Name as string,
    slug: record.fields.Slug as string,
    url: record.fields.URL as string,
    description: record.fields.Description as string || '',
    category: record.fields.Category as Category,
    screenshotUrl: record.fields.ScreenshotURL as string,
    isApproved: true,
    status: 'active',
    reviewCount: record.fields.Reviews ? (record.fields.Reviews as string[]).length : 0,
    averageRating: record.fields['Average Rating'] as number,
    createdAt: record.fields.CreatedAt as string
  }));

  // キャッシュに保存
  setCache(cacheKey, sites);
  return sites;
}

// カテゴリ別サイト取得
export async function getSitesByCategory(category: Category): Promise<Site[]> {
  const records = await base('Sites').select({
    filterByFormula: `AND({IsApproved} = TRUE(), {Category} = '${category}')`,
    sort: [{ field: 'DisplayPriority', direction: 'desc' }, { field: 'CreatedAt', direction: 'desc' }]
  }).all();

  return records.map(record => ({
    id: record.id,
    name: record.fields.Name as string,
    slug: record.fields.Slug as string,
    url: record.fields.URL as string,
    description: record.fields.Description as string || '',
    category: record.fields.Category as Category,
    screenshotUrl: record.fields.ScreenshotURL as string,
    isApproved: true,
    status: 'active',
    reviewCount: record.fields.Reviews ? (record.fields.Reviews as string[]).length : 0,
    averageRating: record.fields['Average Rating'] as number,
    createdAt: record.fields.CreatedAt as string
  }));
}

// Slug指定でサイト取得
export async function getSiteBySlug(slug: string): Promise<Site | null> {
  // キャッシュチェック
  const cacheKey = `site_${slug}`;
  const cached = getCached<Site>(cacheKey);
  if (cached) {
    return cached;
  }

  const records = await base('Sites').select({
    filterByFormula: `{Slug} = '${slug}'`,
    maxRecords: 1
  }).all();

  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  const screenshotUrl = record.fields.ScreenshotURL as string;
  const site = {
    id: record.id,
    name: record.fields.Name as string,
    slug: record.fields.Slug as string,
    url: record.fields.URL as string,
    description: record.fields.Description as string || '',
    category: record.fields.Category as Category,
    screenshotUrl,
    screenshot_url: screenshotUrl, // snake_caseエイリアス
    isApproved: record.fields.IsApproved as boolean || false,
    status: record.fields.IsApproved ? 'active' : 'pending',
    reviewCount: record.fields.Reviews ? (record.fields.Reviews as string[]).length : 0,
    averageRating: record.fields['Average Rating'] as number,
    createdAt: record.fields.CreatedAt as string
  } as any; // 型エラー回避のためanyを使用

  // キャッシュに保存
  setCache(cacheKey, site);

  return site;
}

// 承認待ちサイト取得
export async function getPendingSites(): Promise<Site[]> {
  const records = await base('Sites').select({
    filterByFormula: '{IsApproved} = FALSE()',
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  return records.map(record => ({
    id: record.id,
    name: record.fields.Name as string,
    slug: record.fields.Slug as string,
    url: record.fields.URL as string,
    description: record.fields.Description as string || '',
    category: record.fields.Category as Category,
    screenshotUrl: record.fields.ScreenshotURL as string,
    isApproved: false,
    status: 'pending',
    reviewCount: 0,
    createdAt: record.fields.CreatedAt as string
  }));
}

// サイト承認
export async function approveSite(siteId: string): Promise<void> {
  await base('Sites').update(siteId, {
    IsApproved: true
  });
}

// サイト削除
export async function deleteSite(siteId: string): Promise<void> {
  await base('Sites').destroy(siteId);
}

// 口コミ取得（サイト別）
export async function getReviewsBySite(siteId: string): Promise<Review[]> {
  // すべてのレビューを取得してから、JavaScriptでフィルタリング
  const allRecords = await base('Reviews').select({
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  // JavaScriptでsiteIdでフィルタリング
  const records = allRecords.filter(record => {
    const siteLinkField = record.fields.Site;
    const linkedSiteId = Array.isArray(siteLinkField) ? siteLinkField[0] : siteLinkField;
    return linkedSiteId === siteId;
  });

  return records.map(record => ({
    id: record.id,
    siteId: record.fields.Site ? (record.fields.Site as string[])[0] : '',
    siteName: record.fields['Site Name'] as string,
    username: record.fields.UserName as string,
    rating: record.fields.Rating as number,
    title: record.fields.Title as string,
    content: record.fields.Content as string,
    status: record.fields.IsApproved ? 'approved' : 'pending',
    createdAt: record.fields.CreatedAt as string,
    created_at: record.fields.CreatedAt as string // snake_caseエイリアス
  }));
}

// 承認済み口コミ取得（サイト別）
export async function getApprovedReviewsBySite(siteId: string): Promise<Review[]> {
  // キャッシュチェック
  const cacheKey = `reviews_${siteId}`;
  const cached = getCached<Review[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // すべての承認済みレビューを取得してから、JavaScriptでフィルタリング
  // AirtableのSEARCH()が期待通りに動作しないため
  const allRecords = await base('Reviews').select({
    filterByFormula: '{IsApproved} = TRUE()',
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  // JavaScriptでsiteIdでフィルタリング
  const records = allRecords.filter(record => {
    const siteLinkField = record.fields.Site;
    const linkedSiteId = Array.isArray(siteLinkField) ? siteLinkField[0] : siteLinkField;
    return linkedSiteId === siteId;
  });

  const reviews = records.map(record => ({
    id: record.id,
    siteId: record.fields.Site ? (record.fields.Site as string[])[0] : '',
    siteName: record.fields['Site Name'] as string,
    username: record.fields.UserName as string,
    rating: record.fields.Rating as number,
    title: record.fields.Title as string,
    content: record.fields.Content as string,
    status: 'approved' as ReviewStatus,
    createdAt: record.fields.CreatedAt as string,
    created_at: record.fields.CreatedAt as string // snake_caseエイリアス
  }));

  // キャッシュに保存
  setCache(cacheKey, reviews);

  return reviews;
}

// getReviewsBySiteId（getApprovedReviewsBySiteのエイリアス - 互換性のため）
export const getReviewsBySiteId = getApprovedReviewsBySite;

// 全ての承認待ち口コミ取得
export async function getPendingReviews(): Promise<Review[]> {
  const records = await base('Reviews').select({
    filterByFormula: '{IsApproved} = FALSE()',
    sort: [{ field: 'CreatedAt', direction: 'desc' }]
  }).all();

  return records.map(record => ({
    id: record.id,
    siteId: record.fields.Site ? (record.fields.Site as string[])[0] : '',
    siteName: record.fields['Site Name'] as string,
    username: record.fields.UserName as string,
    rating: record.fields.Rating as number,
    title: record.fields.Title as string,
    content: record.fields.Content as string,
    status: 'pending',
    createdAt: record.fields.CreatedAt as string,
    created_at: record.fields.CreatedAt as string // snake_caseエイリアス
  }));
}

// 口コミ作成
export async function createReview(data: {
  siteId: string;
  username: string;
  rating: number;
  title: string;
  content: string;
}): Promise<Review> {
  const record = await base('Reviews').create({
    Site: [data.siteId],
    Username: data.username,
    Rating: data.rating,
    Title: data.title,
    Content: data.content,
    // IsApprovedフィールドを省略してデフォルト値（未承認）を使用
  });

  return {
    id: record.id,
    siteId: data.siteId,
    username: data.username,
    rating: data.rating,
    title: data.title,
    content: data.content,
    status: 'pending',
    createdAt: record.fields.CreatedAt as string,
    created_at: record.fields.CreatedAt as string // snake_caseエイリアス
  };
}

// submitReview（createReviewのエイリアス - 互換性のため）
export const submitReview = createReview;

// 口コミ承認
export async function approveReview(reviewId: string): Promise<void> {
  await base('Reviews').update(reviewId, {
    IsApproved: true
  });
}

// 口コミをスパムとしてマーク
export async function markReviewAsSpam(reviewId: string): Promise<void> {
  // スパムの場合は承認しない（IsApprovedをfalseのまま）
  // または削除する
  await deleteReview(reviewId);
}

// 口コミ削除
export async function deleteReview(reviewId: string): Promise<void> {
  await base('Reviews').destroy(reviewId);
}

// 統計情報取得
export async function getStats() {
  const sites = await getAllSites();
  const approvedSites = sites.filter(s => s.isApproved);

  const allReviews = await base('Reviews').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

  return {
    totalSites: approvedSites.length,
    totalReviews: allReviews.length,
    pendingSites: sites.filter(s => !s.isApproved).length,
    pendingReviews: (await getPendingReviews()).length
  };
}

// カテゴリラベル
export const categoryLabels: Record<Category, string> = {
  nankan: '南関競馬',
  chuo: '中央競馬',
  chihou: '地方競馬'
};

// 統計付きサイト情報取得（トップページ用）
export interface SiteWithStats extends Site {
  review_count: number;
  average_rating: number | null;
  display_priority: number;
  created_at: string; // エイリアス（createdAtと同じ）
  screenshot_url?: string; // エイリアス（screenshotUrlと同じ）
}

export async function getSitesWithStats(): Promise<SiteWithStats[]> {
  // キャッシュチェック
  const cacheKey = 'sites_with_stats';
  const cached = getCached<SiteWithStats[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const sites = await getApprovedSites();

  // 全ての承認済みレビューを一度に取得（効率化）
  const allReviews = await base('Reviews').select({
    filterByFormula: '{IsApproved} = TRUE()'
  }).all();

  // サイトIDごとにレビューをグループ化
  const reviewsBySite = new Map<string, number[]>();
  allReviews.forEach(record => {
    const siteIds = record.fields.Site as string[] | undefined;
    if (siteIds && siteIds.length > 0) {
      const siteId = siteIds[0];
      const rating = record.fields.Rating as number;
      if (!reviewsBySite.has(siteId)) {
        reviewsBySite.set(siteId, []);
      }
      reviewsBySite.get(siteId)!.push(rating);
    }
  });

  // 統計情報を計算
  const sitesWithStats = sites.map((site) => {
    const ratings = reviewsBySite.get(site.id) || [];
    const reviewCount = ratings.length;
    const averageRating = reviewCount > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount
      : null;

    return {
      ...site,
      review_count: reviewCount,
      average_rating: averageRating,
      display_priority: 50, // デフォルト優先度
      created_at: site.createdAt, // snake_caseエイリアス
      screenshot_url: site.screenshotUrl // snake_caseエイリアス
    };
  });

  // キャッシュに保存
  setCache(cacheKey, sitesWithStats);

  return sitesWithStats;
}

// 最新の口コミ取得
export async function getLatestReviews(limit: number = 10): Promise<ReviewWithSite[]> {
  const records = await base('Reviews').select({
    filterByFormula: '{IsApproved} = TRUE()',
    sort: [{ field: 'CreatedAt', direction: 'desc' }],
    maxRecords: limit
  }).all();

  // サイト情報も取得するため、siteIdからSlugを引く
  const reviewsWithSite = await Promise.all(
    records.map(async (record) => {
      const siteId = record.fields.Site ? (record.fields.Site as string[])[0] : '';
      let siteSlug = '';

      // siteIdからSlugを取得
      if (siteId) {
        try {
          const siteRecord = await base('Sites').find(siteId);
          siteSlug = siteRecord.fields.Slug as string || '';
        } catch (error) {
          console.error(`Error fetching site for review ${record.id}:`, error);
        }
      }

      return {
        id: record.id,
        siteId,
        siteName: record.fields['Site Name'] as string,
        siteSlug,
        username: record.fields.UserName as string,
        rating: record.fields.Rating as number,
        title: record.fields.Title as string,
        content: record.fields.Content as string,
        status: 'approved' as ReviewStatus,
        createdAt: record.fields.CreatedAt as string,
        created_at: record.fields.CreatedAt as string // snake_caseエイリアス
      };
    })
  );

  return reviewsWithSite;
}
