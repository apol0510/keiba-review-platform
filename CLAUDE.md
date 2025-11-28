# 競馬予想サイト口コミプラットフォーム

## プロジェクト概要

競馬予想サイトの口コミ・評価を集約するプラットフォーム。ユーザー投稿による信頼性の高い口コミを提供し、SEO最適化により検索上位表示を目指す。

## 技術スタック

- **フロントエンド**: Astro 5.16.0 + React（インタラクティブ部分）
- **スタイリング**: Tailwind CSS 4
- **データベース**: Airtable（Sites、Reviews テーブル）
- **フォーム**: React（controlled components）
- **スクリーンショット**: Puppeteer（自動取得）
- **ホスティング**: Netlify（SSR mode）
- **外部サービス**: SerpAPI（サイト検知・推奨）、SendGrid（通知・オプション）

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
# 必須 - Airtable
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# 推奨 - SerpAPI（サイト自動検知）
SERPAPI_KEY=your-serpapi-key-here

# 任意 - SendGrid（通知）
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@your-domain.com
ADMIN_EMAIL=your-email@example.com
```

### Netlifyでの設定方法

```bash
# 環境変数を設定
netlify env:set AIRTABLE_API_KEY "patXXXXXXXXXXXXXXXX"
netlify env:set AIRTABLE_BASE_ID "appXXXXXXXXXXXXXX"
netlify env:set SERPAPI_KEY "your-serpapi-key-here"

# 確認
netlify env:list
```

## データベース（Airtable）

### セットアップ手順

1. Airtableアカウントを作成
2. 新しいBaseを作成
3. Sitesテーブル、Reviewsテーブルを作成
4. Personal Access Tokenを取得
5. Netlifyに環境変数を設定

### テーブル構造

#### Sites テーブル
| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| Name | Single line text | サイト名 |
| Slug | Single line text | URLスラッグ |
| URL | URL | サイトURL |
| Category | Single select | カテゴリ（nankan/chuo/chihou/other） |
| Description | Long text | サイト説明文 |
| ScreenshotURL | URL | スクリーンショット画像URL |
| IsApproved | Checkbox | 承認済みフラグ |
| SubmitterName | Single line text | 投稿者名 |
| SubmitterEmail | Email | 投稿者メール |
| CreatedAt | Created time | 作成日時（自動） |

#### Reviews テーブル
| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| Site | Link to Sites | 関連サイト |
| UserName | Single line text | 投稿者名 |
| UserEmail | Email | 投稿者メール |
| Rating | Number | 評価（1-5） |
| Title | Single line text | タイトル |
| Content | Long text | 口コミ本文 |
| IsApproved | Checkbox | 承認済みフラグ |
| CreatedAt | Created time | 投稿日時（自動） |

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
| `/submit` | サイト登録フォーム（一般公開） |
| `/admin/pending-sites` | 未承認サイト管理 |

## API エンドポイント

### 公開API

| エンドポイント | 機能 |
|---------------|------|
| `POST /api/submit-site` | サイト登録（一般ユーザー） |

### 管理API

| エンドポイント | 機能 |
|---------------|------|
| `POST /api/admin/approve-site` | サイト承認 + スクリーンショット自動取得 |
| `POST /api/admin/reject-site` | サイト却下・削除 |

## 自動化・スクリプト

### 口コミ自動投稿

```bash
# 既存サイトに口コミを自動生成・投稿
node scripts/seed-reviews.js
```

- 評価分布: 5★=30%, 4★=40%, 3★=20%, 2★=8%, 1★=2%
- サイトごとに3〜8件のリアルな日本語口コミを生成
- テンプレートベースで自然な文章を作成

### スクリーンショット自動取得

```bash
# 全サイトのスクリーンショットを取得
node scripts/capture-screenshots.js
```

- Puppeteerで自動撮影
- 1280x800のビューポート
- `public/screenshots/` に保存
- Airtableに画像URLを自動登録

### サイト自動検知（SerpAPI）

```bash
# 新しい競馬予想サイトを検索
node scripts/fetch-keiba-sites.js
```

**SerpAPI セットアップ手順:**

1. https://serpapi.com/ でアカウント作成
2. APIキーを取得（無料枠: 月5,000クエリ）
3. Netlifyに設定:
   ```bash
   netlify env:set SERPAPI_KEY "your-key-here"
   ```

**Bing Search APIからの移行:**
- ❌ Bing: 月1,000クエリ、日本から制限頻出
- ✅ SerpAPI: 月5,000クエリ、安定動作、簡単設定

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

### Phase 4 - 完了 ✅
- [x] エラーページ実装
  - カスタム404ページ（`/404.astro`）
  - カスタム500ページ（`/500.astro`）
- [x] UXコンポーネント
  - ErrorBoundary、LoadingSpinner、SkeletonCard、EmptyState、Toast

### Phase 5 - 完了 ✅ (Airtable統合)
- [x] データベースをSupabaseからAirtableに移行
  - Sites テーブル（88件の承認済みサイト）
  - Reviews テーブル（口コミデータ）
- [x] 口コミ自動投稿スクリプト（`scripts/seed-reviews.js`）
  - リアルな日本語口コミを自動生成
  - 評価分布の重み付け
- [x] スクリーンショット自動取得（`scripts/capture-screenshots.js`）
  - Puppeteerで自動撮影（1280x800）
  - 自動でAirtableに画像URL登録
  - thum.io統合（600px base、400px thumbnails、noanimate）
- [x] データ取得の最適化
  - レビューフィルタリングをJavaScriptで実装
  - 動的な統計計算（review_count、average_rating）

### Phase 6 - 完了 ✅ (公開サイト登録機能)
- [x] サイト登録フォーム（`/submit`）
  - 一般ユーザーが新規サイトを提案可能
  - バリデーション（URL重複チェック、50文字以上）
  - 投稿者情報の記録
- [x] 管理画面（`/admin/pending-sites`）
  - 未承認サイト一覧表示
  - ワンクリック承認/却下
  - 承認時に自動スクリーンショット取得
- [x] APIエンドポイント
  - `POST /api/submit-site` - サイト登録
  - `POST /api/admin/approve-site` - 承認 + スクショ取得
  - `POST /api/admin/reject-site` - 却下・削除

### Phase 7 - 完了 ✅ (SerpAPI統合)
- [x] SerpAPI統合（`scripts/fetch-keiba-sites.js`）
  - Google検索結果から新規サイトを自動発見
  - 37種類の検索キーワードで包括的な検出
  - Slug重複チェックによる既存サイトフィルタリング
  - **重要**: IsApprovedフィールドを省略してAirtableのデフォルト値（Unchecked）を使用
    - Airtable Checkbox フィールドは `false` を明示的に送信すると正しく動作しない
    - フィールドを省略することでデフォルトの未チェック状態が適用される

## 次のステップ（Phase 8 - 未実装）

### UX改善
- [ ] サイト一覧に「サイト登録」ボタンを追加
- [ ] 口コミのソート・フィルター機能
- [ ] 検索機能の追加
- [ ] ページネーション

### 通知機能
- [ ] 新規サイト登録時にメール通知（SendGrid）
- [ ] 新規口コミ投稿時の通知

## トラブルシューティング

### Airtable Checkbox フィールドの扱い

**問題**: IsApprovedフィールドに `false` を明示的に送信しても、Airtableが無視してデフォルト値（Unchecked）として保存される場合がある。

**解決策**:
```javascript
// ❌ 誤った方法（フィールドに false を送信）
return {
  Name: name,
  IsApproved: false,  // これは無視される可能性がある
};

// ✅ 正しい方法（フィールドを省略）
return {
  Name: name,
  // IsApprovedを省略してAirtableのデフォルト値を使用
};
```

参考: `scripts/fetch-keiba-sites.js:338-345`

## 参照

詳細仕様: `keiba-review-platform-spec.md`
