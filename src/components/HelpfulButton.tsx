import { useState, useEffect } from 'react';

interface HelpfulButtonProps {
  reviewId: string;
  initialCount: number;
}

export default function HelpfulButton({ reviewId, initialCount }: HelpfulButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [clicked, setClicked] = useState(false);
  const [loading, setLoading] = useState(false);

  // ローカルストレージから既にクリックしたかどうかを確認
  useEffect(() => {
    const hasClicked = localStorage.getItem(`helpful-${reviewId}`);
    if (hasClicked === 'true') {
      setClicked(true);
    }
  }, [reviewId]);

  const handleClick = async () => {
    if (clicked || loading) return;

    setLoading(true);

    try {
      const response = await fetch('/api/reviews/helpful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId })
      });

      if (response.ok) {
        setCount(count + 1);
        setClicked(true);
        localStorage.setItem(`helpful-${reviewId}`, 'true');
      } else {
        console.error('Failed to update helpful count');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="helpful-button mt-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-600 mb-2">この口コミは参考になりましたか?</p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          disabled={clicked || loading}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${clicked
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
            }
            ${loading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <span className="flex items-center gap-1">
            <span>👍</span>
            <span>はい</span>
            {count > 0 && (
              <span className="ml-1 text-xs font-bold">({count})</span>
            )}
          </span>
        </button>

        {clicked && (
          <span className="text-sm text-green-600 font-medium animate-fade-in">
            ✓ ありがとうございました！
          </span>
        )}

        {loading && (
          <span className="text-sm text-gray-500">
            送信中...
          </span>
        )}
      </div>
    </div>
  );
}
