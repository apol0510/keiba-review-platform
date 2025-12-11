import { useState, useMemo, useRef, useEffect } from 'react';
import type { SiteWithStats } from '../lib/airtable';
import { getScreenshotUrl } from '../lib/screenshot-helper';

interface Props {
  sites: SiteWithStats[];
  itemsPerPage?: number;
}

export default function PaginatedSiteList({ sites, itemsPerPage = 20 }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // ページネーション計算
  const totalPages = Math.ceil(sites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSites = useMemo(
    () => sites.slice(startIndex, endIndex),
    [sites, startIndex, endIndex]
  );

  // ページ番号配列を生成（最大7ページ表示）
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // ページ変更時にサイトグリッドの先頭にスクロール
  useEffect(() => {
    if (gridRef.current && currentPage > 1) {
      const gridTop = gridRef.current.getBoundingClientRect().top + window.pageYOffset;
      const offset = 100; // ヘッダー高さ + 余白
      window.scrollTo({
        top: gridTop - offset,
        behavior: 'smooth'
      });
    }
  }, [currentPage]);

  return (
    <>
      {/* サイトグリッド */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentSites.map((site) => (
          <div
            key={site.id}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-blue-400 group"
          >
            <a href={`/keiba-yosou/${site.slug}/`} className="block">
              {/* スクリーンショット */}
              <div className="aspect-video bg-slate-100 overflow-hidden">
                <img
                  src={getScreenshotUrl(site.slug, site.screenshot_url)}
                  alt={site.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* サイト情報 */}
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {site.name}
                </h3>

                {/* 評価 */}
                <div className="flex items-center gap-2 mb-3">
                  {site.average_rating ? (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">
                          {'⭐'.repeat(Math.round(site.average_rating))}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {site.average_rating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        ({site.review_count}件)
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">評価なし</span>
                  )}
                </div>

                {/* 説明文 */}
                {site.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {site.description}
                  </p>
                )}

                {/* カテゴリバッジ */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      site.category === 'nankan'
                        ? 'bg-purple-100 text-purple-700'
                        : site.category === 'chuo'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {site.category === 'nankan'
                      ? '南関競馬'
                      : site.category === 'chuo'
                      ? '中央競馬'
                      : '地方競馬'}
                  </span>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {/* Previous Button */}
          {currentPage > 1 ? (
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="前のページ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          ) : (
            <span className="px-3 py-2 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </span>
          )}

          {/* Page Numbers */}
          {pageNumbers.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                ...
              </span>
            ) : page === currentPage ? (
              <span
                key={page}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
              >
                {page}
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {page}
              </button>
            )
          )}

          {/* Next Button */}
          {currentPage < totalPages ? (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="次のページ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="px-3 py-2 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      )}
    </>
  );
}
