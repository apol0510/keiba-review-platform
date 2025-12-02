import { useState, useEffect } from 'react';

type Tab = 'stats' | 'malicious' | 'star5';

interface MaliciousSite {
  name: string;
}

interface Star5Review {
  id: string;
  title: string;
  rating: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [maliciousSites, setMaliciousSites] = useState<string[]>([]);
  const [star5Count, setStar5Count] = useState<number>(0);
  const [newSiteName, setNewSiteName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // 悪質サイト一覧を取得
  const loadMaliciousSites = async () => {
    try {
      const res = await fetch('/api/admin/malicious-sites');
      const data = await res.json();
      setMaliciousSites(data.malicious || []);
    } catch (error) {
      console.error('Failed to load malicious sites:', error);
    }
  };

  // ⭐5口コミ数を取得
  const loadStar5Count = async () => {
    try {
      const res = await fetch('/api/admin/star5-reviews');
      const data = await res.json();
      setStar5Count(data.count || 0);
    } catch (error) {
      console.error('Failed to load star 5 count:', error);
    }
  };

  useEffect(() => {
    loadMaliciousSites();
    loadStar5Count();
  }, []);

  // 悪質サイト追加
  const handleAddMaliciousSite = async () => {
    if (!newSiteName.trim()) {
      showMessage('error', 'サイト名を入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/malicious-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName: newSiteName.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMaliciousSites(data.malicious);
        setNewSiteName('');
        showMessage('success', `「${newSiteName}」を悪質サイトに追加しました`);
      } else {
        showMessage('error', data.error || '追加に失敗しました');
      }
    } catch (error) {
      showMessage('error', '追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 悪質サイト削除
  const handleRemoveMaliciousSite = async (siteName: string) => {
    if (!confirm(`「${siteName}」を悪質サイトから削除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/malicious-sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName }),
      });

      const data = await res.json();

      if (res.ok) {
        setMaliciousSites(data.malicious);
        showMessage('success', `「${siteName}」を削除しました`);
      } else {
        showMessage('error', data.error || '削除に失敗しました');
      }
    } catch (error) {
      showMessage('error', '削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ⭐5口コミを⭐4に修正
  const handleFixStar5Reviews = async () => {
    if (!confirm(`⭐5の口コミ${star5Count}件を⭐4に変更しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/star5-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix-all' }),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage('success', `${data.successCount}件の口コミを⭐4に変更しました`);
        await loadStar5Count();
      } else {
        showMessage('error', data.error || '修正に失敗しました');
      }
    } catch (error) {
      showMessage('error', '修正に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const filteredSites = maliciousSites.filter(site =>
    site.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">統合管理ダッシュボード</h1>

      {/* メッセージ表示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 統計情報
          </button>
          <button
            onClick={() => setActiveTab('malicious')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'malicious'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ❌ 悪質サイト管理 ({maliciousSites.length})
          </button>
          <button
            onClick={() => setActiveTab('star5')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'star5'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⭐ ⭐5口コミ修正 ({star5Count})
          </button>
        </nav>
      </div>

      {/* 統計情報タブ */}
      {activeTab === 'stats' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">悪質サイト</div>
              <div className="text-3xl font-bold text-red-600">{maliciousSites.length}</div>
              <div className="text-sm text-gray-500 mt-1">件</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">⭐5口コミ</div>
              <div className="text-3xl font-bold text-yellow-600">{star5Count}</div>
              <div className="text-sm text-gray-500 mt-1">件（要修正）</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Airtable同期</div>
              <div className="text-xl font-bold text-green-600">✓ 正常</div>
              <div className="text-sm text-gray-500 mt-1">リアルタイム同期</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">📌 管理ガイド</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>悪質サイト管理</strong>: 低評価（⭐1〜3）を自動投稿</li>
              <li>• <strong>⭐5口コミ修正</strong>: 過剰なポジティブ評価を⭐4に変更</li>
              <li>• すべての変更はAirtableに即座に反映されます</li>
            </ul>
          </div>
        </div>
      )}

      {/* 悪質サイト管理タブ */}
      {activeTab === 'malicious' && (
        <div>
          {/* 追加フォーム */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">悪質サイトを追加</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMaliciousSite()}
                placeholder="サイト名を入力"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={handleAddMaliciousSite}
                disabled={loading || !newSiteName.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>

          {/* 検索 */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="サイト名で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 一覧 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                悪質サイト一覧 ({filteredSites.length}件)
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredSites.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? '検索結果がありません' : '悪質サイトが登録されていません'}
                </div>
              ) : (
                filteredSites.map((site, index) => (
                  <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{index + 1}.</span>
                      <span className="font-medium text-gray-900">{site}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveMaliciousSite(site)}
                      disabled={loading}
                      className="px-4 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⭐5口コミ修正タブ */}
      {activeTab === 'star5' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">⭐5口コミの修正</h3>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> 過剰なポジティブ評価（⭐5）を⭐4に変更します。
                この操作は取り消せません。
              </p>
            </div>

            <div className="mb-6">
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-yellow-600 mb-4">{star5Count}</div>
                <div className="text-gray-600">件の⭐5口コミが見つかりました</div>
              </div>
            </div>

            {star5Count > 0 && (
              <button
                onClick={handleFixStar5Reviews}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? '修正中...' : `${star5Count}件の口コミを⭐4に変更`}
              </button>
            )}

            {star5Count === 0 && (
              <div className="text-center py-8 text-green-600">
                ✓ ⭐5の口コミはありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
