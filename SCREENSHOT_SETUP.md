# スクリーンショット自動取得セットアップガイド

## 概要

GitHub Actionsで毎日午前4時（JST）に、承認済みサイトのスクリーンショットを自動取得します。

## セットアップ手順

### 1. Cloudinaryアカウント作成

1. https://cloudinary.com/ にアクセス
2. 「Sign Up for Free」をクリック
3. 無料プラン（Free）で登録
   - 月間25GBの帯域幅
   - 25GBのストレージ
   - 十分な容量です

4. ダッシュボードで以下の情報を確認:
   - **Cloud Name**: `dxxxxx` のような文字列
   - **API Key**: 数字の文字列
   - **API Secret**: 英数字の文字列（「👁️ Reveal」をクリックして表示）

### 2. GitHub Secretsを設定

1. https://github.com/apol0510/keiba-review-platform/settings/secrets/actions にアクセス

2. 以下の3つのSecretを追加:

**CLOUDINARY_CLOUD_NAME**
```
dxxxxx
```

**CLOUDINARY_API_KEY**
```
123456789012345
```

**CLOUDINARY_API_SECRET**
```
abcdefghijklmnopqrstuvwxyz123456
```

### 3. デプロイ

```bash
git add .
git commit -m "スクリーンショット自動取得機能を追加"
git push origin main
```

### 4. 動作確認

#### 手動実行（推奨）

1. https://github.com/apol0510/keiba-review-platform/actions にアクセス
2. 「Auto Screenshot Capture」ワークフローを選択
3. 「Run workflow」をクリック
4. 「Run workflow」を再度クリック
5. 実行結果を確認

#### 自動実行

毎日午前4時（JST）に自動実行されます。

### 5. Airtableで確認

1. https://airtable.com/appwdYkA3Fptn9TtN にアクセス
2. Sitesテーブルを開く
3. `ScreenshotURL` フィールドに画像URLが設定されているか確認
4. URLをクリックして、スクリーンショットが表示されるか確認

## 仕組み

### ワークフロー

1. **毎日午前4時（JST）に自動実行**
   - または、GitHub Actionsから手動実行

2. **承認済みサイトを取得**
   - `IsApproved = TRUE` かつ `ScreenshotURL` が空のサイト
   - 最大20サイトまで一度に処理

3. **スクリーンショット取得**
   - Puppeteerでブラウザを起動
   - 各サイトにアクセスして1200x800のスクリーンショット取得
   - 3サイトずつ並行処理

4. **Cloudinaryにアップロード**
   - PNG形式でアップロード
   - `keiba-review-screenshots/` フォルダに保存
   - 公開URLを取得

5. **AirtableのScreenshotURLフィールドを更新**
   - 各サイトのレコードに画像URLを保存

### スクリプト

- **scripts/auto-capture-screenshots.cjs**
  - スクリーンショット取得 + Cloudinaryアップロード + Airtable更新

- **.github/workflows/auto-screenshots.yml**
  - GitHub Actionsワークフロー定義

## トラブルシューティング

### GitHub Actionsが失敗する場合

1. **GitHub Secretsが正しく設定されているか確認**
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - AIRTABLE_API_KEY（既存）
   - AIRTABLE_BASE_ID（既存）

2. **ワークフローのログを確認**
   - https://github.com/apol0510/keiba-review-platform/actions
   - 失敗したワークフローをクリック
   - 詳細なエラーメッセージを確認

3. **Cloudinaryの無料枠を超えていないか確認**
   - https://cloudinary.com/console
   - Usage（使用状況）を確認

### スクリーンショットが取得できない場合

**原因1: サイトがアクセスを拒否している**
- 一部のサイトは自動化ツールをブロックします
- 手動でアクセスして確認してください

**原因2: タイムアウト**
- サイトの読み込みが遅い場合、30秒でタイムアウトします
- ワークフローのログで確認できます

**原因3: ScreenshotURLが既に設定されている**
- スクリプトは `ScreenshotURL` が空のサイトのみを処理します
- Airtableで `ScreenshotURL` フィールドを空にしてください

## コマンド

### ローカルで手動実行

```bash
AIRTABLE_API_KEY="xxx" \
AIRTABLE_BASE_ID="xxx" \
CLOUDINARY_CLOUD_NAME="xxx" \
CLOUDINARY_API_KEY="xxx" \
CLOUDINARY_API_SECRET="xxx" \
node scripts/auto-capture-screenshots.cjs
```

### GitHub Actionsで手動実行

```bash
gh workflow run auto-screenshots.yml
```

または、Webから:
1. https://github.com/apol0510/keiba-review-platform/actions
2. 「Auto Screenshot Capture」
3. 「Run workflow」

## 参考リンク

- Cloudinary: https://cloudinary.com/
- Cloudinaryドキュメント: https://cloudinary.com/documentation
- Puppeteerドキュメント: https://pptr.dev/
