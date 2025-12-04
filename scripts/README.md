# Scripts Directory

## フォルダ構成

```
scripts/
├── active/           # 現在使用中のスクリプト（GitHub Actions等で実行）
├── maintenance/      # メンテナンス・管理用スクリプト
├── archived/         # 旧バージョン・未使用スクリプト
├── config/           # 設定ファイル
└── reviews-data/     # 口コミデータ
```

## Active Scripts（現在使用中）

| スクリプト | 説明 | 実行頻度 |
|-----------|------|---------|
| `run-daily-reviews-v3.cjs` | 口コミ自動投稿 | 毎日AM4:00 |
| `fetch-keiba-sites.js` | サイト自動検知（SerpAPI） | 週1回 |
| `check-new-reviews.cjs` | 新規口コミチェック | 毎日AM6:00 |
| `auto-categorize-sites.js` | カテゴリ自動分類 | 週1回 |
| `seed-reviews.js` | 新規サイトへの口コミ投稿 | 週1回 |

## Maintenance Scripts（メンテナンス用）

| スクリプト | 説明 | 使用方法 |
|-----------|------|---------|
| `manage-site-quality.cjs` | 悪質サイト管理 | `node scripts/manage-site-quality.cjs list` |
| `fix-star5-reviews.cjs` | ⭐5口コミ修正 | `node scripts/fix-star5-reviews.cjs check` |
| `balance-ratings.cjs` | 口コミ評価バランス調整 | `node scripts/balance-ratings.cjs` |
| `check-site-categories.cjs` | カテゴリ確認 | `node scripts/check-site-categories.cjs` |
| `puppeteer-screenshots.cjs` | スクリーンショット取得 | 手動実行 |
| `optimize-screenshots.cjs` | 画像最適化 | 手動実行 |

## Archived Scripts（旧バージョン）

- `run-daily-reviews.cjs` → v1（使用終了）
- `run-daily-reviews-v2.cjs` → v2（使用終了）
- `delete-*.cjs` → 一時的なクリーンアップスクリプト

## 環境変数

すべてのスクリプトは以下の環境変数を必要とします：

```bash
AIRTABLE_API_KEY=xxx
AIRTABLE_BASE_ID=xxx
SERPAPI_KEY=xxx  # SerpAPI使用時のみ
```

## 実行例

```bash
# 口コミ自動投稿
AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/run-daily-reviews-v3.cjs

# サイト自動検知
SERPAPI_KEY=xxx AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/fetch-keiba-sites.js

# 悪質サイト一覧
AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/manage-site-quality.cjs list
```
