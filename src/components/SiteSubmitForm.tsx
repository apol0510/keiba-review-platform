import { useState } from 'react';
import type { FormEvent } from 'react';

interface SiteSubmitFormProps {
  onSuccess?: () => void;
}

export default function SiteSubmitForm({ onSuccess }: SiteSubmitFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: 'other' as 'nankan' | 'chuo' | 'chihou' | 'other',
    description: '',
    submitter_name: '',
    submitter_email: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/submit-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'サイト登録に失敗しました');
      }

      setStatus('success');
      setFormData({
        name: '',
        url: '',
        category: 'other',
        description: '',
        submitter_name: '',
        submitter_email: '',
      });

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          サイト名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="例: 競馬予想サイト○○"
        />
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          サイトURL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="url"
          name="url"
          required
          value={formData.url}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="nankan">南関競馬</option>
          <option value="chuo">中央競馬</option>
          <option value="chihou">地方競馬</option>
          <option value="other">その他</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          サイト説明 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          value={formData.description}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="サイトの特徴、料金、提供している情報などを記載してください"
        />
        <p className="mt-1 text-sm text-gray-500">最低50文字以上</p>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">投稿者情報</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="submitter_name" className="block text-sm font-medium text-gray-700 mb-2">
              お名前（ニックネーム可） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="submitter_name"
              name="submitter_name"
              required
              value={formData.submitter_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 競馬太郎"
            />
          </div>

          <div>
            <label htmlFor="submitter_email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="submitter_email"
              name="submitter_email"
              required
              value={formData.submitter_email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@example.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              確認のため使用します。公開されません。
            </p>
          </div>
        </div>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">エラー</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">送信完了</p>
          <p className="text-sm">
            サイト情報を受け付けました。管理者が確認後、サイトに掲載されます。
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'submitting' ? '送信中...' : 'サイトを登録'}
        </button>
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
        <p className="font-medium mb-2">注意事項</p>
        <ul className="list-disc list-inside space-y-1">
          <li>登録されたサイトは管理者の承認後に公開されます</li>
          <li>不適切な内容や虚偽の情報は掲載されません</li>
          <li>重複するサイトの登録はご遠慮ください</li>
        </ul>
      </div>
    </form>
  );
}
