# 競馬予想サイト口コミプラットフォーム

## プロジェクト概要

競馬予想サイトの口コミ・評価を集約するプラットフォーム。ユーザー投稿による信頼性の高い口コミを提供し、SEO最適化により検索上位表示を目指す。

## 技術スタック

- **フロントエンド**: Astro 4.x + React（インタラクティブ部分）
- **スタイリング**: Tailwind CSS 4
- **バックエンド**: Supabase（PostgreSQL + Auth + Storage）
- **フォーム**: React Hook Form + Zod
- **自動化**: GitHub Actions + Python
- **ホスティング**: Node.js（standalone mode）
- **外部サービス**: Bing Web Search API（サイト検知）, SendGrid（通知）, reCAPTCHA v3

## ディレクトリ構造

```
keiba-review-platform/
├── src/
│   ├── pages/              # Astroページ
│   │   ├── index.astro     # トップページ
│   │   ├── keiba-yosou/    # サイト関連ページ
│   │   ├── admin/          # 管理画面
│   │   └── api/admin/      # 管理API
│   ├── components/         # UIコンポーネント
│   │   ├── *.astro         # 静的コンポーネント
│   │   └── *.tsx           # Reactコンポーネント（インタラクティブ）
│   ├── layouts/            # レイアウト
│   │   ├── BaseLayout.astro
│   │   └── AdminLayout.astro
│   ├── lib/                # ユーティリティ
│   │   ├── supabase.ts     # DB接続・型定義・API関数
│   │   └── validation.ts   # Zodスキーマ・NGワード検出
│   └── styles/
│       └── global.css      # Tailwind + カスタムスタイル
├── supabase/
│   └── schema.sql          # DBスキーマ（Supabase SQL Editorで実行）
├── scripts/
│   ├── detect_new_sites.py # サイト自動検知スクリプト
│   ├── update_stats.py     # 統計更新スクリプト
│   └── requirements.txt    # Python依存関係
├── .github/workflows/
│   ├── detect-new-sites.yml  # 毎日AM3時に自動実行
│   └── update-stats.yml      # 毎時0分に自動実行
├── public/                 # 静的ファイル
├── .env.example            # 環境変数テンプレート
└── astro.config.mjs        # Astro設定
```

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー（本番環境テスト）
npm run preview

# サイト検知スクリプト（手動実行）
python scripts/detect_new_sites.py

# 統計更新スクリプト（手動実行）
python scripts/update_stats.py
```

## 環境変数

```bash
# 必須 - Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# 任意 - reCAPTCHA v3（スパム対策）
PUBLIC_RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx

# 任意 - Bing Web Search API（サイト自動検知）
BING_API_KEY=xxx

# 任意 - SendGrid（通知）
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@your-domain.com
ADMIN_EMAIL=your-email@example.com
```

## データベース（Supabase）

### セットアップ手順

1. Supabaseプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行
3. `.env` ファイルを作成し環境変数を設定

### テーブル

| テーブル | 説明 |
|---------|------|
| `sites` | 競馬予想サイト情報 |
| `reviews` | 口コミ（承認制） |
| `detailed_ratings` | 詳細評価（的中率、料金、サポート、透明性） |
| `site_stats` | サイト統計キャッシュ（トリガーで自動更新） |

### ビュー

- `sites_with_stats` - サイト一覧用（統計情報込み）
- `approved_reviews` - 承認済み口コミ一覧

### カテゴリ

- `nankan` - NANKAN（南関競馬）
- `chuo` - 中央競馬
- `chihou` - 地方競馬
- `other` - その他

## URL構造

| URL | ページ |
|-----|--------|
| `/` | トップページ |
| `/keiba-yosou/` | サイト一覧 |
| `/keiba-yosou/nankan/` | NANKANカテゴリ |
| `/keiba-yosou/chuo/` | 中央競馬カテゴリ |
| `/keiba-yosou/chihou/` | 地方競馬カテゴリ |
| `/keiba-yosou/[slug]/` | サイト詳細・口コミ投稿 |
| `/admin/` | 管理ダッシュボード |
| `/admin/reviews/` | 口コミ管理（承認/却下） |
| `/admin/sites/` | サイト管理（追加/編集） |

## 管理API

| エンドポイント | 機能 |
|---------------|------|
| `POST /api/admin/reviews/approve` | 口コミ承認 |
| `POST /api/admin/reviews/spam` | スパム報告 |
| `POST /api/admin/reviews/delete` | 口コミ削除 |
| `POST /api/admin/sites/add` | サイト追加 |
| `POST /api/admin/sites/approve` | サイト承認 |
| `POST /api/admin/sites/delete` | サイト削除 |

## 自動化

### GitHub Actions

1. **detect-new-sites.yml** - 毎日AM3時（JST）
   - Bing APIで競馬予想サイトを検索
   - 新規サイトをSupabaseに保存（承認待ち）
   - 管理者にメール通知

2. **update-stats.yml** - 毎時0分
   - 全サイトの口コミ統計を再計算
   - 通常はDBトリガーで自動更新されるため、バックアップ用

### GitHub Secrets設定

```
BING_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
ADMIN_EMAIL
```

## 開発ガイドライン

### コンポーネント

- 静的表示: `.astro` ファイル
- インタラクティブ（フォーム等）: `.tsx` ファイル + `client:load`

### 口コミ投稿ルール

- 承認制（管理者が目視確認後に公開）
- NGワード検出あり（URLリンク禁止）
- 20〜500文字
- Zodでバリデーション
- reCAPTCHA v3でスパム対策（任意）

### セキュリティ

- Supabase RLSで一般ユーザーは承認済みデータのみ閲覧可能
- 管理APIはサービスキーでRLSをバイパス
- ユーザー入力はAstro/Reactで自動エスケープ

## 現在の進捗

### Phase 1 (MVP) - 完了
- [x] Astroプロジェクト初期化
- [x] Supabase SQLスキーマ作成
- [x] 基本レイアウト・コンポーネント
- [x] トップページ
- [x] サイト一覧・カテゴリページ
- [x] サイト詳細ページ（構造化データ対応）
- [x] 口コミ投稿フォーム（React）
- [x] 管理画面（ダッシュボード、口コミ管理、サイト管理）

### Phase 2 - 完了
- [x] Bing Web Search APIによるサイト自動検知
- [x] GitHub Actions設定（毎日/毎時）
- [x] SendGrid通知機能
- [x] reCAPTCHA v3実装

### Phase 3 - 完了 ✅
- [x] サイトマップ自動生成（`/sitemap.xml`）
  - 全静的ページを含む（トップ、サイト一覧、カテゴリ、about、terms、privacy、contact）
  - 承認済みサイト詳細ページを動的に生成
  - 優先度とchangefreq設定済み
- [x] OGP画像動的生成
  - サイト別OGP画像（`/og/[slug].png`）
  - デフォルトOGP画像（`/og/default.png`）
  - Satori + Resvgで日本語フォント対応
  - カテゴリカラー、評価、口コミ数を表示
- [x] パフォーマンス最適化
  - アセットのインライン化（4KB以下）
  - チャンク最適化（react-vendor、form-vendor分離）
  - HTML圧縮有効化
  - プリフェッチ設定（hoverストラテジー）
  - キャッシュヘッダー設定（Netlify）
  - DNS Prefetch + Preconnect設定
  - 構造化データ追加（WebSite、Product、Review）

## 参照

詳細仕様: `keiba-review-platform-spec.md`
