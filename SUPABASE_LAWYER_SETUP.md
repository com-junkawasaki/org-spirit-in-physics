# Supabase Lawyerプロジェクト設定

## ✅ 現在の設定

lawyerプロジェクトが正常に起動しており、動画ストレージバケットも作成済みです。

### Supabaseローカル環境情報

```
プロジェクトID: lawyer
API URL: http://127.0.0.1:54321
Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Publishable key: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
Secret key: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

### 動画ストレージバケット

- **バケット名**: `participant-videos`
- **公開設定**: 非公開（プライベート）
- **ファイルサイズ制限**: 500MB
- **許可MIMEタイプ**: `video/webm`, `video/mp4`, `video/quicktime`

## 🔧 環境変数の設定

### ルート `.envrc` に追加

```bash
# Supabase Lawyerプロジェクト設定
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
export SUPABASE_URL="http://127.0.0.1:54321"
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

### `apps/patient/.envrc` にも同様に設定

```bash
# Supabase Lawyerプロジェクト設定
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
```

## 📝 使用方法

### 1. 環境変数の読み込み

```bash
# direnvを使用している場合
direnv allow

# または手動で設定
source .envrc
```

### 2. Supabase Studioで確認

ブラウザで以下にアクセス:
- **Studio URL**: http://127.0.0.1:54323
- **Storage**: Storage → Buckets → `participant-videos` を確認

### 3. 動画アップロードのテスト

```typescript
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

// 動画をアップロード
const url = await supabaseManager.uploadVideoToStorage(
  'participant-001',
  'participant-001-session-1',
  videoBuffer,
  'session-1-video.webm'
);
```

## 🚀 プロジェクト起動コマンド

```bash
# Supabase起動
supabase start

# 状態確認
supabase status

# 停止
supabase stop
```

## 📊 確認済み項目

- ✅ lawyerプロジェクトが起動中
- ✅ 動画ストレージバケット `participant-videos` が作成済み
- ✅ RLSポリシーが設定済み（4つのポリシー）
- ✅ マイグレーションが適用済み

## 🔍 トラブルシューティング

### ポートが使用中の場合

```bash
# 他のプロジェクトを停止
supabase stop --project-id producer

# lawyerプロジェクトを起動
supabase start
```

### 環境変数が読み込まれない場合

```bash
# direnvを再読み込み
direnv allow

# または手動でexport
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
```

## 📚 関連ドキュメント

- `SUPABASE_STORAGE_GUIDE.md` - 動画ストレージ使用ガイド
- `supabase/config.toml` - Supabase設定ファイル

