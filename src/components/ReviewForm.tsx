import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema, type ReviewFormData } from '../lib/validation';
import { submitReview } from '../lib/airtable';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface Props {
  siteId: string;
  siteName: string;
  recaptchaSiteKey?: string;
}

export default function ReviewForm({ siteId, siteName, recaptchaSiteKey }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(!recaptchaSiteKey);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
    },
  });

  const watchRating = watch('rating');

  // reCAPTCHA v3 スクリプト読み込み
  useEffect(() => {
    if (!recaptchaSiteKey) return;

    const scriptId = 'recaptcha-v3';
    if (document.getElementById(scriptId)) {
      setRecaptchaLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    script.async = true;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);
  }, [recaptchaSiteKey]);

  // reCAPTCHA トークン取得
  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!recaptchaSiteKey || !window.grecaptcha) return null;

    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(recaptchaSiteKey, {
            action: 'submit_review',
          });
          resolve(token);
        } catch (error) {
          console.error('reCAPTCHA error:', error);
          resolve(null);
        }
      });
    });
  }, [recaptchaSiteKey]);

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // reCAPTCHA トークン取得
      let recaptchaToken: string | null = null;
      if (recaptchaSiteKey) {
        recaptchaToken = await getRecaptchaToken();
        if (!recaptchaToken) {
          setSubmitError('セキュリティ検証に失敗しました。ページを再読み込みしてお試しください。');
          setIsSubmitting(false);
          return;
        }
      }

      // 口コミを投稿
      const review = await submitReview({
        site_id: siteId,
        user_name: data.user_name,
        user_email: data.user_email,
        rating: data.rating,
        title: data.title,
        content: data.content,
        // 料金情報（任意）
        pricing_type: data.pricing_type,
        has_free_trial: data.has_free_trial,
        registration_required: data.registration_required,
      });

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError('投稿に失敗しました。しばらく経ってからもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">投稿ありがとうございます！</h3>
        <p className="text-gray-600 text-sm">
          口コミは管理者の承認後に公開されます。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{submitError}</div>
      )}

      {/* Rating */}
      <div>
        <label className="form-label">
          総合評価 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setValue('rating', star)}
              className="focus:outline-none"
            >
              <svg
                className={`w-8 h-8 ${star <= watchRating ? 'text-amber-400' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        <input type="hidden" {...register('rating', { valueAsNumber: true })} />
        {errors.rating && <p className="form-error">{errors.rating.message}</p>}
      </div>

      {/* Nickname */}
      <div>
        <label htmlFor="user_name" className="form-label">
          ニックネーム <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="user_name"
          {...register('user_name')}
          className="form-input"
          placeholder="匿名"
        />
        {errors.user_name && <p className="form-error">{errors.user_name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="user_email" className="form-label">
          メールアドレス <span className="text-red-500">*</span>
          <span className="text-gray-500 font-normal ml-1">(非公開)</span>
        </label>
        <input
          type="email"
          id="user_email"
          {...register('user_email')}
          className="form-input"
          placeholder="example@email.com"
        />
        {errors.user_email && <p className="form-error">{errors.user_email.message}</p>}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="form-label">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          {...register('title')}
          className="form-input"
          placeholder="一言で感想を"
          maxLength={100}
        />
        {errors.title && <p className="form-error">{errors.title.message}</p>}
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="form-label">
          口コミ本文 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          {...register('content')}
          className="form-textarea h-32"
          placeholder="サイトを利用した感想を詳しく教えてください（20文字以上）"
          maxLength={500}
        />
        {errors.content && <p className="form-error">{errors.content.message}</p>}
      </div>

      {/* Pricing Info Update (Optional) */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-2 cursor-pointer text-sm text-gray-600 hover:bg-gray-50">
          料金情報を更新する（任意）
        </summary>
        <div className="p-4 space-y-3 border-t">
          <p className="text-xs text-gray-600 mb-3">
            実際に利用してわかった料金情報があれば教えてください。
          </p>

          <div>
            <label htmlFor="pricing_type" className="block text-sm font-medium text-gray-700 mb-1">
              料金体系
            </label>
            <select
              id="pricing_type"
              {...register('pricing_type')}
              className="form-input text-sm"
            >
              <option value="">選択しない</option>
              <option value="free">完全無料</option>
              <option value="partially_paid">一部有料プランあり</option>
              <option value="fully_paid">有料サービス</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('has_free_trial')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">無料お試しあり</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('registration_required')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">会員登録が必要</span>
            </label>
          </div>
        </div>
      </details>

      {/* Detailed Ratings (Optional) */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-2 cursor-pointer text-sm text-gray-600 hover:bg-gray-50">
          詳細評価（任意）
        </summary>
        <div className="p-4 space-y-3 border-t">
          {[
            { name: 'accuracy_rating', label: '的中率満足度' },
            { name: 'price_rating', label: '料金満足度' },
            { name: 'support_rating', label: 'サポート' },
            { name: 'transparency_rating', label: '情報透明性' },
          ].map(({ name, label }) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setValue(name as keyof ReviewFormData, star as never)
                    }
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-5 h-5 ${
                        star <= (watch(name as keyof ReviewFormData) || 0)
                          ? 'text-amber-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Terms */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="agree_terms"
          {...register('agree_terms')}
          className="mt-1"
        />
        <label htmlFor="agree_terms" className="text-sm text-gray-600">
          <a href="/terms/" className="text-blue-600 hover:underline" target="_blank">
            利用規約
          </a>
          に同意する
        </label>
      </div>
      {errors.agree_terms && <p className="form-error">{errors.agree_terms.message}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || (recaptchaSiteKey && !recaptchaLoaded)}
        className="btn-primary w-full"
      >
        {isSubmitting ? '投稿中...' : '口コミを投稿する'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        投稿された口コミは管理者の承認後に公開されます
      </p>

      {recaptchaSiteKey && (
        <p className="text-xs text-gray-400 text-center">
          このサイトはreCAPTCHAによって保護されています
        </p>
      )}
    </form>
  );
}
