# Supabase Storage動画バケット作成 - リモートプロジェクト向け

## 方法1: Supabaseダッシュボードから実行（推奨）

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. SQL Editorを開く
4. 以下のSQLをコピー＆ペーストして実行:

```sql
-- Create video storage bucket for participant videos
-- Merkle DAG: storage.bucket.creation -> video_file_management

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'participant-videos',
  'participant-videos',
  false, -- Private bucket (authenticated access only)
  524288000, -- 500MB limit per file
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'objects'
    AND n.nspname = 'storage'
    AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage all videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all videos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view their own videos" ON storage.objects;

-- Policy: Service role (server-side) can do everything
CREATE POLICY "Service role can manage all videos" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'participant-videos')
  WITH CHECK (bucket_id = 'participant-videos');

-- Policy: Authenticated users can upload videos to their own folder
-- Path format: {participantId}/{sessionId}/{filename}
CREATE POLICY "Participants can upload their own videos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'participant-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated users can view videos in their own folder
CREATE POLICY "Participants can view their own videos" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'participant-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Admin can manage all videos (for backend operations)
-- This allows server-side code to upload/manage videos for any participant
CREATE POLICY "Admin can manage all videos" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'participant-videos'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'participant-videos'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

## 方法2: psqlコマンドで実行

### データベースURLの取得

1. Supabaseダッシュボード → Project Settings → Database
2. Connection stringをコピー（例: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`）

### マイグレーション実行

```bash
# 環境変数に設定
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# マイグレーション実行
psql "$DATABASE_URL" -f supabase/migrations/20251102000001_create_video_storage_bucket.sql
```

または、スクリプトを使用:

```bash
./scripts/apply-video-storage-migration.sh
```

## 方法3: Supabase CLIでリモート接続

```bash
# リモートプロジェクトにリンク
supabase link --project-ref your-project-ref

# マイグレーションをプッシュ
supabase db push
```

## 確認方法

マイグレーション実行後、以下で確認:

1. **Supabaseダッシュボード**: Storage → Buckets → `participant-videos`が表示される
2. **SQLで確認**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'participant-videos';
   ```
3. **ポリシー確認**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%video%';
   ```

## トラブルシューティング

### エラー: "permission denied"

Service Role Keyを使用していることを確認してください。SupabaseダッシュボードのSQL Editorから実行する場合は問題ありません。

### エラー: "bucket already exists"

バケットが既に存在する場合は、`ON CONFLICT DO NOTHING`によりスキップされます。ポリシーのみが更新されます。

### エラー: "policy already exists"

`DROP POLICY IF EXISTS`により既存のポリシーは削除されてから再作成されます。

