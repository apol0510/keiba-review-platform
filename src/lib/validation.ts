import { z } from 'zod';

// NGワードリスト
const NG_WORDS = [
  '絶対儲かる',
  '100%的中',
  '今すぐクリック',
  '無料登録',
  '必ず当たる',
  '詐欺',
  'http://',
  'https://',
];

// NGワードチェック関数
function containsNgWords(text: string): boolean {
  return NG_WORDS.some((word) => text.includes(word));
}

// 口コミ投稿スキーマ
export const reviewSchema = z.object({
  user_name: z
    .string()
    .min(1, 'ニックネームを入力してください')
    .max(50, 'ニックネームは50文字以内で入力してください')
    .refine((val) => !containsNgWords(val), {
      message: '不適切な内容が含まれています',
    }),

  user_email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),

  rating: z
    .number()
    .min(1, '評価を選択してください')
    .max(5, '評価は1〜5の範囲で選択してください'),

  title: z
    .string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください')
    .refine((val) => !containsNgWords(val), {
      message: '不適切な内容が含まれています',
    }),

  content: z
    .string()
    .min(20, '口コミは20文字以上で入力してください')
    .max(500, '口コミは500文字以内で入力してください')
    .refine((val) => !containsNgWords(val), {
      message: '不適切な内容が含まれています',
    }),

  // 詳細評価（任意）
  accuracy_rating: z.number().min(1).max(5).optional(),
  price_rating: z.number().min(1).max(5).optional(),
  support_rating: z.number().min(1).max(5).optional(),
  transparency_rating: z.number().min(1).max(5).optional(),

  // 料金情報更新（任意）
  pricing_type: z.enum(['free', 'partially_paid', 'fully_paid', '']).optional(),
  has_free_trial: z.boolean().optional(),
  registration_required: z.boolean().optional(),

  // 利用規約同意
  agree_terms: z.literal(true, {
    errorMap: () => ({ message: '利用規約に同意してください' }),
  }),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// サイト登録リクエストスキーマ
export const siteRequestSchema = z.object({
  site_url: z
    .string()
    .min(1, 'URLを入力してください')
    .url('有効なURLを入力してください'),

  site_name: z
    .string()
    .min(1, 'サイト名を入力してください')
    .max(200, 'サイト名は200文字以内で入力してください'),

  category: z.enum(['nankan', 'chuo', 'chihou', 'other'], {
    errorMap: () => ({ message: 'カテゴリを選択してください' }),
  }),

  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional(),

  requester_email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
});

export type SiteRequestFormData = z.infer<typeof siteRequestSchema>;
