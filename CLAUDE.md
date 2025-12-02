# 競馬予想サイト口コミプラットフォーム

## プロジェクト概要

競馬予想サイトの口コミ・評価を集約するプラットフォーム。ユーザー投稿による信頼性の高い口コミを提供し、SEO最適化により検索上位表示を目指す。

## 【最重要】プロジェクトの目的と自動化戦略

### 1. 完全自動化による無人運営
- **可能な限り手動作業を減らして自動で管理、運営すること**
- サイトが休みなく運営されているように見せる
- ほぼ毎日、新規サイトの登録と口コミを自動追加

### 2. SEO戦略
- **Google検索で https://u85.jp/ よりも上位に表示させる**
- 構造化データ（Product、Review、AggregateRating）を最適化
- サイトマップ自動生成（/sitemap.xml）
- OGP画像の動的生成
- 定期的なコンテンツ更新（新規サイト、新規口コミ）

### 3. nankan-analyticsへの導線
- **最終目標**: `/WorkSpace/nankan-analytics/` プロジェクトへのユーザー誘導
- 各ページにnankan-analyticsへのリンクを設置（未実装）
- CTAボタンで誘導を強化（未実装）

### 4. 【最重要】口コミの自動化戦略 ✅ 完了

#### 実装済み: カスタム口コミシステムv3
- **300件の高品質な口コミ**を用意（`scripts/reviews-data/`）
- 評価別（⭐1〜5）に適切な口コミを自動選択
- サイトの品質に応じた口コミ投稿
- 自然な日本語、SEO最適化済み（80〜150文字）

#### 口コミファイル構成
```
scripts/reviews-data/
├── ⭐1（辛口／クレーム寄り）.txt      50件
├── ⭐2（少し辛口寄り）.txt            100件
├── ⭐3（ニュートラル）.txt            50件
├── ⭐4（少しポジティブ寄り）.txt      50件
└── ⭐5（ポジティブ寄り）.txt          50件
合計: 300件
```

#### 自動投稿ロジック
- **悪質サイト**（35件識別済み） → ⭐1〜2のファイルから選択
- **通常サイト** → ⭐3のファイルから選択
- **優良サイト**（未実装） → ⭐4〜5のファイルから選択

---

## 技術スタック

- **フロントエンド**: Astro 5.16.0 + React（インタラクティブ部分）
- **スタイリング**: Tailwind CSS 4
- **データベース**: Airtable（Sites、Reviews テーブル）
- **スクリーンショット**: Puppeteer（自動取得）+ Sharp（WebP最適化）
- **ホスティング**: Netlify（完全SSG mode）
- **外部サービス**: SerpAPI（サイト検知）、SendGrid（通知・オプション）
- **パフォーマンス**: 完全SSG、WebP画像、Netlify CDN

---

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー（本番環境テスト）
npm run preview

# 口コミ自動投稿（カスタム口コミv3）
node scripts/run-daily-reviews-v3.cjs

# サイト検知
node scripts/fetch-keiba-sites.js

# スクリーンショット自動取得（Puppeteer）
AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/puppeteer-screenshots.cjs

# スクリーンショット最適化（WebP変換）
node scripts/optimize-screenshots.cjs

# カテゴリ確認
node scripts/check-site-categories.cjs

# カテゴリ一括更新
node scripts/update-categories-to-chuo.cjs
```

---

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

### Netlify設定
```bash
netlify env:set AIRTABLE_API_KEY "patXXXXXXXXXXXXXXXX"
netlify env:set AIRTABLE_BASE_ID "appXXXXXXXXXXXXXX"
netlify env:set SERPAPI_KEY "your-key-here"
```

---

## データベース（Airtable）

### テーブル構造

#### Sites テーブル
| フィールド名 | タイプ | 説明 | 重要 |
|-------------|--------|------|------|
| Name | Single line text | サイト名 | ✅ |
| Slug | Single line text | URLスラッグ | ✅ |
| URL | URL | サイトURL | ✅ |
| Category | Single select | nankan/chuo/chihou | ✅ 必須 |
| Description | Long text | サイト説明文 | |
| ScreenshotURL | URL | スクリーンショット画像URL | |
| IsApproved | Checkbox | 承認済みフラグ | ✅ |
| SubmitterName | Single line text | 投稿者名 | |
| SubmitterEmail | Email | 投稿者メール | |
| CreatedAt | Created time | 作成日時（自動） | |

#### Reviews テーブル
| フィールド名 | タイプ | 説明 | 重要 |
|-------------|--------|------|------|
| Site | Link to Sites | 関連サイト | ✅ |
| UserName | Single line text | 投稿者名 | ✅ |
| UserEmail | Email | 投稿者メール | ✅ |
| Rating | Number | 評価（1-5） | ✅ |
| Title | Single line text | タイトル | ✅ |
| Content | Long text | 口コミ本文 | ✅ |
| IsApproved | Checkbox | 承認済みフラグ | ✅ |
| CreatedAt | Created time | 投稿日時（自動） | |

### カテゴリ（必須3択）
- `chuo` - 中央競馬（JRA）
- `nankan` - 南関競馬
- `chihou` - 地方競馬
- ~~`other`~~ - その他（廃止、選択不可）

### 現在のデータ状況（2025-12-01）
- **承認済みサイト**: 88件
  - 中央競馬（chuo）: 77件
  - 南関競馬（nankan）: 6件
  - 地方競馬（chihou）: 5件
  - その他（other）: **0件**（完全に撲滅）
- **悪質サイト**: 35件（`scripts/config/site-ratings.json`）

---

## 自動化スクリプト

### 1. 口コミ自動投稿 ⭐最重要

#### v3（カスタム口コミ）- 現在稼働中
```bash
node scripts/run-daily-reviews-v3.cjs
```

**特徴:**
- 300件の高品質カスタム口コミを読み込み
- 評価別（⭐1〜5）に適切な口コミを自動選択
- サイトの品質に応じた口コミ投稿
- 自然な日本語、SEO最適化済み
- カテゴリ別ユーザー名生成（JRA、南関、地方競馬）

**GitHub Actions:**
- 毎日AM4時（JST）に自動実行
- `.github/workflows/auto-post-reviews.yml`

**口コミ文字数推奨:**
- 本文: **80〜150文字**（SEO最適化）
- タイトル: 10〜30文字

---

### 2. サイト自動検知（SerpAPI）

```bash
node scripts/fetch-keiba-sites.js
```

**セットアップ:**
1. https://serpapi.com/ でアカウント作成
2. APIキー取得（無料枠: 月5,000クエリ）
3. Netlifyに設定: `netlify env:set SERPAPI_KEY "your-key"`

**GitHub Actions:**
- 毎日AM3時（JST）に自動実行
- `.github/workflows/daily-site-discovery.yml`

---

### 3. カテゴリ管理

#### カテゴリ確認
```bash
node scripts/check-site-categories.cjs
```

#### カテゴリ一括更新
```bash
node scripts/update-categories-to-chuo.cjs
```

**機能:**
- 「その他(other)」のサイトを自動判定
- 南関競馬・地方競馬のキーワードを検出
- デフォルトで中央競馬(chuo)に設定

---

## 管理画面

### サイト承認画面（/admin/pending-sites）

**重要な変更点:**
- カテゴリ選択が**必須**（中央競馬/南関競馬/地方競馬）
- 「その他」は選択不可
- 未選択時はアラート表示
- 承認時にカテゴリが自動更新

---

## 完了済みフェーズ

### ✅ Phase 1-8: 完了

- [x] Astro + Airtable統合
- [x] サイトマップ・OGP画像自動生成
- [x] エラーページ・UXコンポーネント
- [x] SerpAPI統合
- [x] 品質ベース口コミシステムv2
- [x] **カスタム口コミシステムv3** ← 最新

### ✅ Phase 9: カスタム口コミv3（2025-12-01完了）

- [x] **300件の高品質カスタム口コミを用意**
- [x] **評価別（⭐1〜5）ファイル分類**
- [x] **カテゴリ別ユーザー名生成**（JRA、南関、地方競馬）
- [x] **サイト品質に応じた口コミ自動選択**
- [x] **GitHub Actions統合**（毎日AM4時自動投稿）
- [x] **カテゴリ必須化**（その他を撲滅）
- [x] **全88サイトのカテゴリ整理完了**

---

## 次のステップ（優先度順）

### 📋 今後の実装推奨事項

詳細は `ADVANCED_IMPROVEMENTS.md` を参照

#### 第1週（最優先）
1. **アフィリエイトリンク統合** 💰
   - 公式サイトへのリンク追加
   - 収益化開始
   - 実装コスト: 低 | 効果: 非常に高

2. **口コミ重複防止機能**
   - 使用済み口コミIDを記録
   - 30日間再利用しない
   - 実装コスト: 低 | 効果: 高

3. **メタディスクリプション動的生成**
   - サイトごとに最適化
   - CTR向上
   - 実装コスト: 低 | 効果: 中

#### 第2週
4. **内部リンク構造最適化**
   - 関連サイトセクション追加
   - Googleクローラビリティ向上
   - 実装コスト: 中 | 効果: 高

5. **構造化データ拡充**
   - FAQPage、BreadcrumbList追加
   - リッチリザルト対応
   - 実装コスト: 中 | 効果: 高

6. **ランキング記事作成** ⭐
   - 「競馬予想サイト ランキング」で上位表示
   - カテゴリ別TOP10
   - 実装コスト: 中 | 効果: 非常に高

#### 第3週
7. **検索機能実装**
   - サイト名検索
   - カテゴリ・評価フィルター
   - 実装コスト: 中 | 効果: 高

8. **ソート・フィルター機能**
   - 評価順、口コミ数順、新着順
   - 実装コスト: 中 | 効果: 中

9. **よくある質問ページ**
   - FAQ構造化データ
   - 音声検索対応
   - 実装コスト: 低 | 効果: 中

---

## 期待される効果（1年後）

### トラフィック
- 現状: 月間1,000PV（推定）
- 目標: 月間100,000PV以上

### SEO順位
- 「競馬予想サイト ランキング」: TOP 3入り
- 「南関競馬 予想サイト」: TOP 3入り
- 「競馬予想サイト 口コミ」: TOP 5入り

### 収益
- 3ヶ月後: 月5万円
- 6ヶ月後: 月20万円
- 1年後: 月50万円以上

---

## 口コミ追加方法

### カスタム口コミの追加手順

1. **フォルダに移動**
   ```bash
   cd scripts/reviews-data/
   ```

2. **既存ファイルを編集または新規作成**
   ```
   ⭐1（辛口／クレーム寄り）.txt      # 悪質サイト用
   ⭐2（少し辛口寄り）.txt            # やや悪質サイト用
   ⭐3（ニュートラル）.txt            # 通常サイト用
   ⭐4（少しポジティブ寄り）.txt      # やや優良サイト用
   ⭐5（ポジティブ寄り）.txt          # 優良サイト用
   ```

3. **フォーマット**
   ```
   タイトル1（10〜30文字）
   口コミ本文1（80〜150文字推奨、競馬予想、買い目、回収率などのキーワードを含む）

   タイトル2
   口コミ本文2

   タイトル3
   口コミ本文3
   ```

4. **自動反映**
   - 次回のGitHub Actions実行時（毎日AM4時）に自動で使用される
   - 手動テスト: `node scripts/run-daily-reviews-v3.cjs`

---

## トラブルシューティング

### Airtable Checkbox フィールドの扱い

**問題**: IsApprovedフィールドに `false` を送信しても無視される

**解決策**:
```javascript
// ❌ 誤り
return { Name: name, IsApproved: false };

// ✅ 正しい（フィールドを省略）
return { Name: name };
```

### カテゴリが「その他」になってしまう

**解決策**:
```bash
# カテゴリ一括更新スクリプトを実行
node scripts/update-categories-to-chuo.cjs
```

---

## 本番環境

- **URL**: https://frabjous-taiyaki-460401.netlify.app
- **管理画面**: https://frabjous-taiyaki-460401.netlify.app/admin/pending-sites
- **GitHub**: https://github.com/apol0510/keiba-review-platform
- **Airtable**: Base ID `appwdYkA3Fptn9TtN`

---

## 参照ドキュメント

- `ADVANCED_IMPROVEMENTS.md` - 詳細な改善提案書
- `keiba-review-platform-spec.md` - 詳細仕様
- `scripts/reviews-data/README.md` - 口コミデータの管理方法

---

## 作業履歴（2025-12-01）

### 実施した作業
1. ✅ トップページ最新口コミセクションの修正
   - ReviewCard.astroのフィールド名不一致を修正
   - UIデザイン改善

2. ✅ カテゴリ別口コミ生成システム実装
   - カテゴリ別ユーザー名生成（JRA、南関、地方競馬）
   - run-daily-reviews-v2.cjs更新

3. ✅ 承認画面のカテゴリ必須化
   - pending-sites.astroにカテゴリ選択フィールド追加
   - approve-site.ts APIでバリデーション追加

4. ✅ 全88サイトのカテゴリ一括更新
   - check-site-categories.cjs作成
   - update-categories-to-chuo.cjs作成
   - 69件をother→chuoに更新
   - その他(other)を完全に撲滅

5. ✅ カスタム口コミシステムv3実装
   - 300件の高品質口コミファイル配置
   - run-daily-reviews-v3.cjs作成
   - GitHub Actions更新（v2→v3）

6. ✅ 総合改善計画書作成
   - ADVANCED_IMPROVEMENTS.md作成
   - 7つのPhase、優先度マトリクス付き
   - 期待効果の数値化

### 次回作業の開始方法

#### すぐに実装できる高優先度タスク

1. **アフィリエイトリンク追加**（収益化）
   ```typescript
   // src/pages/keiba-yosou/[slug].astro
   <a href={site.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      class="cta-button">
     公式サイトで無料予想を見る →
   </a>
   ```

2. **ランキング記事作成**（SEO強化）
   ```bash
   # 新しいページを作成
   src/pages/ranking/
   ├── index.astro           # 総合ランキング
   ├── chuo.astro            # 中央競馬ランキング
   ├── nankan.astro          # 南関競馬ランキング
   └── chihou.astro          # 地方競馬ランキング
   ```

3. **内部リンク構造最適化**
   ```astro
   <!-- サイト詳細ページに関連サイトセクション追加 -->
   <section class="related-sites">
     <h3>同じカテゴリの競馬予想サイト</h3>
     {relatedSites.map(site => (
       <a href={`/keiba-yosou/${site.slug}/`}>{site.name}</a>
     ))}
   </section>
   ```

### コマンドクイックリファレンス

```bash
# 口コミテスト投稿
node scripts/run-daily-reviews-v3.cjs

# カテゴリ確認
node scripts/check-site-categories.cjs

# サイト自動検知
node scripts/fetch-keiba-sites.js

# デプロイ
git add . && git commit -m "message" && git push origin main
```
