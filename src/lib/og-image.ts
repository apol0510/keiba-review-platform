import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Google Fonts から Noto Sans JP を取得
async function loadGoogleFont(font: string, weight: number): Promise<ArrayBuffer> {
  const API = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&display=swap`;

  const css = await fetch(API).then((res) => res.text());

  const fontUrl = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  )?.[1];

  if (!fontUrl) {
    throw new Error('Font URL not found');
  }

  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

interface OgImageOptions {
  title: string;
  subtitle?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
}

export async function generateOgImage(options: OgImageOptions): Promise<Buffer> {
  const { title, subtitle, rating, reviewCount, category } = options;

  // フォントを読み込み
  const fontNormal = await loadGoogleFont('Noto+Sans+JP', 400);
  const fontBold = await loadGoogleFont('Noto+Sans+JP', 700);

  // カテゴリカラー
  const categoryColors: Record<string, string> = {
    nankan: '#dc2626',
    chuo: '#2563eb',
    chihou: '#16a34a',
    other: '#6b7280',
  };
  const categoryColor = category ? categoryColors[category] || '#6b7280' : '#2563eb';

  // カテゴリラベル
  const categoryLabels: Record<string, string> = {
    nankan: '南関競馬',
    chuo: '中央競馬',
    chihou: '地方競馬',
    other: 'その他',
  };
  const categoryLabel = category ? categoryLabels[category] : null;

  // 星を生成
  const stars = rating
    ? Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? '★' : '☆')).join('')
    : null;

  // SVGを生成
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          fontFamily: 'Noto Sans JP',
        },
        children: [
          // ヘッダー
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              },
              children: [
                categoryLabel
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          backgroundColor: categoryColor,
                          color: 'white',
                          padding: '8px 20px',
                          borderRadius: '20px',
                          fontSize: '24px',
                          fontWeight: 700,
                        },
                        children: categoryLabel,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // メインコンテンツ
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'white',
                      fontSize: title.length > 20 ? '48px' : '56px',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    },
                    children: title,
                  },
                },
                subtitle
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '28px',
                        },
                        children: subtitle,
                      },
                    }
                  : null,
                stars
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                color: '#fbbf24',
                                fontSize: '36px',
                              },
                              children: stars,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                color: 'white',
                                fontSize: '28px',
                              },
                              children: `${rating?.toFixed(1)} (${reviewCount}件の口コミ)`,
                            },
                          },
                        ],
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // フッター
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '24px',
                    },
                    children: '競馬予想サイト口コミ',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '20px',
                    },
                    children: 'keiba-review.com',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontNormal,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Noto Sans JP',
          data: fontBold,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  // PNGに変換
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
