# Scripts ディレクトリ

## 📁 アクティブスクリプト（現在使用中）

### 自動実行（GitHub Actions）
- **run-daily-reviews-v3.cjs** - 毎日の口コミ自動投稿（v3: 重複防止機能付き）
- **fetch-keiba-sites.js** - サイト自動検知（SerpAPI）
- **check-new-reviews.cjs** - 新規口コミチェック（自動ビルドトリガー）

### 手動実行（管理用）
- **manage-site-quality.cjs** - 悪質サイト管理CLI
- **upload-adjusted-reviews.cjs** - 口コミアップロード補助
- **puppeteer-screenshots.cjs** - スクリーンショット自動取得
- **optimize-screenshots.cjs** - 画像最適化（WebP変換）
- **auto-categorize-sites.js** - カテゴリ自動判定
- **fix-star5-reviews.cjs** - ⭐5口コミ修正ツール

## 📂 ディレクトリ
- **config/** - 設定ファイル（悪質サイトリストなど）
- **reviews-data/** - 口コミデータ（250件）
- **archived/** - 古いスクリプト（55個）
- **active/** - ドキュメント

## 🗑️ アーカイブ済み（55個）
以下のスクリプトは使用していないため archived/ に移動しました：
- delete-*.cjs/js - 削除系スクリプト
- remove-*.js - 削除系スクリプト
- seed-*.js - 初期データ投入スクリプト
- test-*.js - テストスクリプト
- その他の未使用スクリプト

## ⚠️ 注意事項
archived/ 内のスクリプトは、必要に応じて復元できますが、
現在のプロジェクトでは使用していません。
