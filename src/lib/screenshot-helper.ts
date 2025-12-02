/**
 * スクリーンショット画像のURLを取得する
 * 優先順位:
 * 1. ローカル静的画像（/screenshots/slug.png）- 10サイトのみ
 * 2. thum.io（外部API）- 残りのサイト
 * 3. フォールバック（SVGプレースホルダー）- エラー時
 */
export function getScreenshotUrl(slug: string, externalUrl?: string): string {
  // ローカルスクリーンショットが存在する場合、それを優先（最速）
  // WebP形式で配信（600x400、85%品質、軽量）
  if (hasLocalScreenshot(slug)) {
    return `/screenshots/${slug}.webp`;
  }

  // ローカル画像がない場合はthum.ioにフォールバック
  if (externalUrl) {
    return `https://image.thum.io/get/width/600/crop/400/noanimate/${externalUrl}`;
  }

  // URLも無い場合はフォールバック画像
  return getFallbackImage(600, 400);
}

/**
 * 利用可能なローカルスクリーンショット一覧
 * public/screenshots/ に配置された画像のslug
 * Puppeteerで自動取得した92サイト
 */
export const AVAILABLE_SCREENSHOTS = [
  'ai-shisu-com', 'aikba-net', 'allwin7-com', 'anaumatou-jp', 'apolon-keibanahibi-com',
  'baken-co-jp', 'baken-seikatsu-com', 'baxis-jp', 'bfkeiba-com', 'blog-rakuma-biz',
  'bucchakeiba-com', 'climate-stories-org', 'cmjra-jp', 'craftmankeiba-com', 'd-ivine-com',
  'daikaibou-com', 'digginkeiba-jp', 'dulbea-org', 'freekeiba-com', 'fukakukeiba-com',
  'fukuuma-net', 'funabashi-keiba', 'gekisokeiba-livedoor-biz', 'glassbd4723-blog-fc2-com',
  'harem-keiba-com', 'hibokorekeiba-com', 'hikky-keiba-com', 'horse-racing-ai-navi-com',
  'humantransport-org', 'hybridyosou-blog-fc2-com', 'jiro8-sakura-ne-jp', 'johnhancockcenterchicago-com',
  'jra', 'jra-k-ba-net', 'k-million-jp', 'k-refrain-com', 'kateru-uma-com', 'kawasaki-keiba',
  'kayochinkeiba-com', 'keiba-ai-jp', 'keiba-expo-jp', 'keiba-kouryaku-net', 'keiba-nar',
  'keiba-night-com', 'keiba-nine-com', 'keiba-no1-com', 'keiba-programs-v-jp', 'keiba36-com',
  'keiba7-net', 'keibablood-com', 'keibagrant-jp', 'keibalab', 'keibariron-com', 'lounge-dmm-com',
  'm-jockey-co-jp', 'masts-jp', 'muryou-keiba-ai-jp', 'nankankeiba-xyz', 'nar-k-ba-net',
  'navi-keiba-com', 'netkeiba', 'oddspark', 'oi-keiba', 'pc-3448-jp', 'pluskeiba-com',
  'rakuten-keiba', 'sarabure-jp', 'shinkeiba-com', 'sites-google-com', 'smart-horse-jp',
  'spat4', 'stats-keiba-com', 't-tank-net', 'taro-k-com', 'tr-vision-net', 'turf-v-jp',
  'uma-katsu-net', 'uma-maru-com', 'uma-pika-com', 'uma-quick-com', 'umabi-jp', 'umalog-net',
  'umanity-jp', 'umarace-expert-com', 'umarand-com', 'umasera-com', 'vuma-ai', 'win-ver2-com',
  'wkeibaw-net', 'xn--zuzt4cf1p1qr-com', 'yokodabi-jp', 'yorozuya-manba-com',
];

/**
 * ローカルスクリーンショットが存在するか確認
 */
export function hasLocalScreenshot(slug: string): boolean {
  return AVAILABLE_SCREENSHOTS.includes(slug);
}

/**
 * フォールバック画像（SVG Data URI）
 */
export function getFallbackImage(width = 600, height = 400): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23f3f4f6'/%3E%3Cpath d='M${width * 0.35} ${height * 0.4}l${width * 0.15} ${height * 0.15}-${width * 0.07} ${height * 0.07}a${width * 0.06} ${width * 0.06} 0 0 1 0-${width * 0.085} ${width * 0.06} ${width * 0.06} 0 0 1 ${width * 0.085} 0l${width * 0.15} ${height * 0.15}${width * 0.2}-${height * 0.2}a${width * 0.06} ${width * 0.06} 0 0 1 ${width * 0.085} 0 ${width * 0.06} ${width * 0.06} 0 0 1 0 ${width * 0.085}z' fill='%239ca3af'/%3E%3Ccircle cx='${width * 0.4}' cy='${height * 0.3}' r='${width * 0.05}' fill='%239ca3af'/%3E%3C/svg%3E`;
}
