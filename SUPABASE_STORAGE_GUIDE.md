# Supabase Storage 動画保存ガイド

## 📋 概要

動画データをSupabase Storageに参加者・セッションごとに保存する機能を実装しました。

## 🗂️ ストレージ構造

動画ファイルは以下の構造で保存されます：

```
participant-videos/
  {participantId}/
    {sessionId}/
      {sessionType}-video.webm
```

**例:**
```
participant-videos/
  participant-001/
    participant-001-session-1/
      session-1-video.webm
    participant-001-session-2/
      session-2-video.webm
```

## 🚀 セットアップ

### 1. Supabase Storageバケットの作成

マイグレーションファイルを実行してバケットを作成：

```bash
# Supabase CLIを使用する場合
supabase db reset

# または、SQLを直接実行
psql $DATABASE_URL -f supabase/migrations/20251102000001_create_video_storage_bucket.sql
```

### 2. 環境変数の確認

以下の環境変数が設定されていることを確認：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# または
SUPABASE_ANON_KEY=your-anon-key
```

## 📝 使用方法

### 動画ファイルのアップロード

#### API経由

```typescript
// POST /api/save-artifact
const formData = new FormData();
formData.append('file', videoFile);
formData.append('participantId', 'participant-001');
formData.append('sessionId', 'participant-001-session-1');
formData.append('fileName', 'session-1-video.webm');

const response = await fetch('/api/save-artifact', {
  method: 'POST',
  body: formData,
});
```

#### プログラムから直接

```typescript
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

// Bufferからアップロード
const videoBuffer = Buffer.from(videoData);
const url = await supabaseManager.uploadVideoToStorage(
  'participant-001',
  'participant-001-session-1',
  videoBuffer,
  'session-1-video.webm'
);

// ファイルパスからアップロード
const url = await supabaseManager.uploadVideoToStorage(
  'participant-001',
  'participant-001-session-1',
  '/path/to/video.webm',
  'session-1-video.webm'
);
```

### 動画ファイルの取得

#### 動画URLの取得

```typescript
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

// 署名付きURLを取得（1時間有効）
const url = await supabaseManager.getVideoFileUrl(
  'participant-001',
  'participant-001-session-1',
  'session-1-video.webm'
);
```

#### 動画ファイル一覧の取得

```typescript
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

// 参加者の全動画を取得
const videos = await supabaseManager.listVideoFiles('participant-001');

// 特定セッションの動画を取得
const sessionVideos = await supabaseManager.listVideoFiles(
  'participant-001',
  'participant-001-session-1'
);
```

## 🔐 セキュリティポリシー

Supabase StorageのRLS（Row Level Security）ポリシーにより：

1. **Service Role**: 全ての操作が可能（サーバーサイドコード用）
2. **Admin Role**: 全ての動画を管理可能
3. **Authenticated Users**: 自分のフォルダ（participantId = auth.uid()）のみアクセス可能

## 📊 データベース連携

動画ファイルの存在は、参加者データ取得時に自動的にチェックされます：

```typescript
const participant = await supabaseManager.getParticipant('participant-001');
console.log(participant.hasVideoFiles); // true/false
console.log(participant.videoFiles); // 動画ファイル情報の配列
```

## 🔄 移行について

既存のVercel Blob StorageからSupabase Storageへの移行が必要な場合：

1. Vercel Blob Storageから動画をダウンロード
2. `supabaseManager.uploadVideoToStorage()`を使用してSupabase Storageにアップロード
3. 既存のコードをSupabase Storage対応に更新

## ⚠️ 注意事項

1. **ファイルサイズ制限**: バケットは500MB/ファイルに設定されています
2. **MIMEタイプ**: `video/webm`, `video/mp4`, `video/quicktime`のみ許可
3. **プライベートバケット**: バケットは非公開です。アクセスには署名付きURLが必要です
4. **署名付きURL**: デフォルトで1時間有効です。必要に応じて有効期限を調整

## 🐛 トラブルシューティング

### エラー: "Bucket not found"

バケットが作成されていない可能性があります。マイグレーションを実行してください。

### エラー: "Policy violation"

RLSポリシーに違反しています。Service Role Keyを使用しているか確認してください。

### エラー: "File size limit exceeded"

ファイルサイズが500MBを超えています。ファイルを圧縮するか、バケットのサイズ制限を変更してください。

## 📚 関連ファイル

- `supabase/migrations/20251102000001_create_video_storage_bucket.sql` - バケット作成とポリシー設定
- `apps/patient/scripts/src/lib/database/supabase-manager.ts` - 動画アップロード・取得機能
- `apps/patient/scripts/src/50_adapters/storage-adapter.ts` - ストレージアダプター
- `apps/patient/app/api/save-artifact/route.ts` - APIエンドポイント

