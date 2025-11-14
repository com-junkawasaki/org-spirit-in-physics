-- Merkle DAG: fix_emotion_tables_without_master -> recreate_with_enums
-- emotion_namesテーブルが削除済みのため、emotion_name_idからemotion_name ENUM型への変換を完了

-- 注意: このマイグレーションは、emotion_namesテーブルが既に削除されている状態で実行されます
-- したがって、emotion_name_idの値からemotion_name ENUM型の値を推測することはできません
-- 既存のデータは一旦削除し、ENUM型カラムを持つ新しい構造に変更します

-- 1. hume_burst_emotion_scores: emotion_name_id → emotion_name ENUM型
DO $$
BEGIN
    -- emotion_name_idカラムが存在し、emotion_nameカラムが存在しない場合
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_burst_emotion_scores' 
        AND column_name = 'emotion_name_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_burst_emotion_scores' 
        AND column_name = 'emotion_name'
    ) THEN
        -- 既存のデータを削除（emotion_namesテーブルが削除済みのため、データを保持できない）
        -- 注意: 実際の運用では、データを保持する必要がある場合は、別の方法を検討してください
        DELETE FROM hume_burst_emotion_scores;
        
        -- emotion_name_idカラムを削除し、emotion_name ENUM型カラムを追加
        ALTER TABLE hume_burst_emotion_scores 
            DROP COLUMN IF EXISTS emotion_name_id CASCADE;
        
        ALTER TABLE hume_burst_emotion_scores 
            ADD COLUMN emotion_name emotion_name_enum NOT NULL;
        
        -- UNIQUE制約を更新
        ALTER TABLE hume_burst_emotion_scores 
            DROP CONSTRAINT IF EXISTS hume_burst_emotion_scores_hume_burst_emotion_data_id_emotion_name_id_key;
        
        ALTER TABLE hume_burst_emotion_scores 
            ADD CONSTRAINT hume_burst_emotion_scores_hume_burst_emotion_data_id_emotion_name_key 
            UNIQUE (hume_burst_emotion_data_id, emotion_name);
        
        -- インデックスを再作成
        DROP INDEX IF EXISTS idx_hume_burst_emotion_scores_emotion_name;
        CREATE INDEX idx_hume_burst_emotion_scores_emotion_name 
            ON hume_burst_emotion_scores(emotion_name);
        
        RAISE NOTICE 'hume_burst_emotion_scores converted to emotion_name ENUM (data cleared)';
    END IF;
END $$;

-- 2. hume_face_emotion_scores: emotion_name_id → emotion_name ENUM型
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_face_emotion_scores' 
        AND column_name = 'emotion_name_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_face_emotion_scores' 
        AND column_name = 'emotion_name'
    ) THEN
        DELETE FROM hume_face_emotion_scores;
        
        ALTER TABLE hume_face_emotion_scores 
            DROP COLUMN IF EXISTS emotion_name_id CASCADE;
        
        ALTER TABLE hume_face_emotion_scores 
            ADD COLUMN emotion_name emotion_name_enum NOT NULL;
        
        ALTER TABLE hume_face_emotion_scores 
            DROP CONSTRAINT IF EXISTS hume_face_emotion_scores_hume_face_emotion_data_id_emotion_name_id_key;
        
        ALTER TABLE hume_face_emotion_scores 
            ADD CONSTRAINT hume_face_emotion_scores_hume_face_emotion_data_id_emotion_name_key 
            UNIQUE (hume_face_emotion_data_id, emotion_name);
        
        DROP INDEX IF EXISTS idx_hume_face_emotion_scores_emotion_name;
        CREATE INDEX idx_hume_face_emotion_scores_emotion_name 
            ON hume_face_emotion_scores(emotion_name);
        
        RAISE NOTICE 'hume_face_emotion_scores converted to emotion_name ENUM (data cleared)';
    END IF;
END $$;

-- 3. hume_language_emotion_scores: emotion_name_id → emotion_name ENUM型
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_language_emotion_scores' 
        AND column_name = 'emotion_name_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_language_emotion_scores' 
        AND column_name = 'emotion_name'
    ) THEN
        DELETE FROM hume_language_emotion_scores;
        
        ALTER TABLE hume_language_emotion_scores 
            DROP COLUMN IF EXISTS emotion_name_id CASCADE;
        
        ALTER TABLE hume_language_emotion_scores 
            ADD COLUMN emotion_name emotion_name_enum NOT NULL;
        
        ALTER TABLE hume_language_emotion_scores 
            DROP CONSTRAINT IF EXISTS hume_language_emotion_scores_hume_language_emotion_data_id_emotion_name_id_key;
        
        ALTER TABLE hume_language_emotion_scores 
            ADD CONSTRAINT hume_language_emotion_scores_hume_language_emotion_data_id_emotion_name_key 
            UNIQUE (hume_language_emotion_data_id, emotion_name);
        
        DROP INDEX IF EXISTS idx_hume_language_emotion_scores_emotion_name;
        CREATE INDEX idx_hume_language_emotion_scores_emotion_name 
            ON hume_language_emotion_scores(emotion_name);
        
        RAISE NOTICE 'hume_language_emotion_scores converted to emotion_name ENUM (data cleared)';
    END IF;
END $$;

-- 4. hume_prosody_emotion_scores: emotion_name_id → emotion_name ENUM型
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_prosody_emotion_scores' 
        AND column_name = 'emotion_name_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hume_prosody_emotion_scores' 
        AND column_name = 'emotion_name'
    ) THEN
        DELETE FROM hume_prosody_emotion_scores;
        
        ALTER TABLE hume_prosody_emotion_scores 
            DROP COLUMN IF EXISTS emotion_name_id CASCADE;
        
        ALTER TABLE hume_prosody_emotion_scores 
            ADD COLUMN emotion_name emotion_name_enum NOT NULL;
        
        ALTER TABLE hume_prosody_emotion_scores 
            DROP CONSTRAINT IF EXISTS hume_prosody_emotion_scores_hume_prosody_emotion_data_id_emotion_name_id_key;
        
        ALTER TABLE hume_prosody_emotion_scores 
            ADD CONSTRAINT hume_prosody_emotion_scores_hume_prosody_emotion_data_id_emotion_name_key 
            UNIQUE (hume_prosody_emotion_data_id, emotion_name);
        
        DROP INDEX IF EXISTS idx_hume_prosody_emotion_scores_emotion_name;
        CREATE INDEX idx_hume_prosody_emotion_scores_emotion_name 
            ON hume_prosody_emotion_scores(emotion_name);
        
        RAISE NOTICE 'hume_prosody_emotion_scores converted to emotion_name ENUM (data cleared)';
    END IF;
END $$;

-- 5. timeline_emotion_entries: emotion_name_id → emotion_name ENUM型
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timeline_emotion_entries' 
        AND column_name = 'emotion_name_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timeline_emotion_entries' 
        AND column_name = 'emotion_name'
    ) THEN
        DELETE FROM timeline_emotion_entries;
        
        ALTER TABLE timeline_emotion_entries 
            DROP COLUMN IF EXISTS emotion_name_id CASCADE;
        
        ALTER TABLE timeline_emotion_entries 
            ADD COLUMN emotion_name emotion_name_enum NOT NULL;
        
        ALTER TABLE timeline_emotion_entries 
            DROP CONSTRAINT IF EXISTS timeline_emotion_entries_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_emotion_name_id_file_type_key;
        
        ALTER TABLE timeline_emotion_entries 
            ADD CONSTRAINT timeline_emotion_entries_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_emotion_name_file_type_key 
            UNIQUE (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name, file_type);
        
        DROP INDEX IF EXISTS idx_timeline_emotion_entries_emotion_name;
        CREATE INDEX idx_timeline_emotion_entries_emotion_name 
            ON timeline_emotion_entries(emotion_name);
        
        RAISE NOTICE 'timeline_emotion_entries converted to emotion_name ENUM (data cleared)';
    END IF;
END $$;

-- コメント追加
COMMENT ON COLUMN hume_burst_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key). Data cleared during migration.';
COMMENT ON COLUMN hume_face_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key). Data cleared during migration.';
COMMENT ON COLUMN hume_language_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key). Data cleared during migration.';
COMMENT ON COLUMN hume_prosody_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key). Data cleared during migration.';
COMMENT ON COLUMN timeline_emotion_entries.emotion_name IS 'Emotion name enum (direct reference, no foreign key). Data cleared during migration.';

