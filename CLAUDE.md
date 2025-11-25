# 競馬予想サイト口コミプラットフォーム

## プロジェクト概要
競馬予想サイトの口コミ・評判を収集し、SEOに最適化されたレビューサイト。
nankan-analytics プロジェクトへの動線としても機能。

## 技術スタック
- **フレームワーク**: Astro 4.x + React (インタラクティブ部分)
- **スタイリング**: Tailwind CSS 4
- **データベース**: Airtable
- **ホスティング**: Netlify (SSR)
- **自動化**: Make.com
- **メール通知**: SendGrid

## デプロイ情報
- **本番URL**: https://frabjous-taiyaki-460401.netlify.app/
- **Netlifyサイト名**: frabjous-taiyaki-460401

## 環境変数（Netlifyに設定必要）
```
AIRTABLE_API_KEY=pat...  # Airtable Personal Access Token
AIRTABLE_BASE_ID=app...  # Airtable Base ID
```

## Airtable 構成

### Sites テーブル
| フィールド | タイプ |
|-----------|--------|
| Name | Single line text |
| Slug | Single line text |
| URL | URL |
| Description | Long text |
| Category | Single select (nankan/chuo/chihou/other) |
| ScreenshotURL | URL |
| IsApproved | Checkbox |
| CreatedAt | Created time |

### Reviews テーブル
| フィールド | タイプ |
|-----------|--------|
| Title | Single line text |
| Content | Long text |
| Rating | Number (1-5) |
| UserName | Single line text |
| UserEmail | Email |
| Site | Link to Sites |
| IsApproved | Checkbox |
| IsSpam | Checkbox |
| CreatedAt | Created time |

## 最近の更新 (2025-11-25)

### デザイン刷新 - モダンUI実装完了 ✅
トップページ（`src/pages/index.astro`）とヘッダー（`src/layouts/BaseLayout.astro`）を現代風のデザインに全面刷新。

#### 1. ヒーローセクション
- ✅ ダークグラデーション背景（slate-900 → blue-900）
- ✅ ブラーエフェクトを使った抽象的な背景パターン
- ✅ アニメーション付きバッジ（緑の点滅）
- ✅ グラデーションテキスト（white → blue-300 → purple-300）
- ✅ ガラスモーフィズム検索バー（backdrop-blur）
- ✅ クイックリンク（カテゴリへの素早いアクセス）
- ✅ モバイルファースト対応（レスポンシブデザイン）

#### 2. Stats Section
- ✅ グラデーション背景（slate-50 → white）
- ✅ カード型デザイン（白背景、シャドウ、ホバーエフェクト）
- ✅ グラデーションテキスト（blue-600 → purple-600）

#### 3. Popular Sites Section
- ✅ セクション説明文を追加
- ✅ 「すべて見る」リンクにアイコンとホバーアニメーション
- ✅ ランキングバッジをグラデーションに変更

#### 4. Latest Reviews Section
- ✅ グラデーション背景
- ✅ セクション説明文を追加

#### 5. Category Section
- ✅ カードをグラデーション背景に（white → slate-50）
- ✅ ホバー時に上に浮き上がるアニメーション
- ✅ アイコンがホバー時に拡大

#### 6. CTA Section
- ✅ ヒーローセクションと同じスタイル（グラデーション背景）
- ✅ ガラスモーフィズムカード
- ✅ 背景パターン追加
- ✅ ボタンに矢印アイコン追加

#### 7. ヘッダーメニュー
- ✅ ガラスモーフィズム効果（bg-white/95 backdrop-blur-md）
- ✅ グラデーションアイコン（星マーク）を追加
- ✅ ロゴテキストをブランドカラーのグラデーションに変更
- ✅ ナビゲーションを囲んだピルボタンスタイル（bg-slate-100）
- ✅ メニュー項目間に区切り線を追加

### デザインシステム
- **メインカラー**: Blue-600 → Purple-600 グラデーション
- **背景**: Slate-900/Blue-900（ダークセクション）、White/Slate-50（ライトセクション）
- **エフェクト**: Backdrop-blur、Box-shadow、Transform animations
- **レスポンシブ**: モバイルファースト設計

## 次回作業 (TODO)

### 1. フッターのデザイン改善
- [ ] フッターをモダンなデザインに刷新
- [ ] ヘッダーとの統一感を持たせる

### 2. SiteCard / ReviewCard コンポーネントの改善
- [ ] カードデザインを新しいUIに合わせる
- [ ] ホバーエフェクトの追加

### 3. 他のページのデザイン刷新
- [ ] サイト一覧ページ（`/keiba-yosou/`）
- [ ] カテゴリページ（`/keiba-yosou/[category]/`）
- [ ] サイト詳細ページ（`/keiba-yosou/[slug]/`）
- [ ] 管理画面

### 4. Airtable API設定
- [ ] https://airtable.com/create/tokens でトークン作成
  - Scopes: `data.records:read`, `data.records:write`
  - Access: 作成したbaseを選択
- [ ] Base IDを取得（URLの `appXXXXXX` 部分）
- [ ] Netlify環境変数に設定
- [ ] 再デプロイ

### 5. Make.com 自動化設定
- [ ] シナリオ作成: Airtable Watch Records → SendGrid Send Email
  - トリガー: Reviews テーブルに新規レコード追加
  - アクション: 管理者にメール通知
- [ ] スケジュール設定（15分ごと推奨）

### 6. テストデータ投入
- [ ] Airtableに2-3件のサイトを手動追加
- [ ] 本番サイトで表示確認

## コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run preview  # ビルド結果プレビュー
```

## デモモード
環境変数が未設定の場合、`src/lib/airtable.ts` のデモデータが表示される。
本番環境では必ず環境変数を設定すること。

## カテゴリ
- `nankan` - 南関競馬
- `chuo` - 中央競馬
- `chihou` - 地方競馬
- `other` - その他

## 運用フロー
1. ユーザーが口コミ投稿 → Airtableに保存（IsApproved=false）
2. Make.comが検知 → SendGridで管理者に通知
3. 管理者がAirtableで内容確認
4. 問題なければ IsApproved にチェック → サイトに公開
