-- Supabase本番データベーススキーマ確認用SQL
-- Merkle DAG: schema.check.supabase

-- 1. timeline_pointsテーブルの構造確認
\d timeline_points

-- 2. timeline_pointsテーブルのカラム詳細
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'timeline_points'
ORDER BY ordinal_position;

-- 3. timeline_pointsテーブルのインデックス確認
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'timeline_points'
ORDER BY indexname;

-- 4. timeline_pointsテーブルの制約確認
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'timeline_points'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 5. metadataカラムの存在確認
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'timeline_points' 
              AND column_name = 'metadata'
        ) THEN '✅ metadataカラムが存在します'
        ELSE '❌ metadataカラムが存在しません'
    END as metadata_status;

-- 6. TimescaleDB拡張機能の確認
SELECT 
    extname,
    extversion
FROM pg_extension
WHERE extname = 'timescaledb';

-- 7. ハイパーテーブルの確認
SELECT 
    hypertable_schema,
    hypertable_name,
    num_dimensions
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'timeline_points';

-- 8. 全テーブル一覧
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

