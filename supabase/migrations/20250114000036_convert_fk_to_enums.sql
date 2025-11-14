-- Merkle DAG: convert_fk_to_enums -> direct_enum_references
-- 外部キー参照をINTEGER IDから直接ENUM型に変更

-- 1. 依存するビューとマテリアライズドビューを一時的に削除
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_word_aggregates_by_session CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_word_statistics_by_session CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 2. hume_burst_emotion_scores: emotion_name_id INTEGER → emotion_name emotion_name_enum
DO $$
BEGIN
    -- 既存の外部キー制約を削除
    ALTER TABLE hume_burst_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_burst_emotion_scores_emotion_name_id_fkey;
    
    -- カラム名を変更（一時的に）
    ALTER TABLE hume_burst_emotion_scores 
        RENAME COLUMN emotion_name_id TO emotion_name_id_old;
    
    -- 新しいENUM型カラムを追加
    ALTER TABLE hume_burst_emotion_scores 
        ADD COLUMN emotion_name emotion_name_enum;
    
    -- データを移行
    UPDATE hume_burst_emotion_scores 
    SET emotion_name = (SELECT name FROM emotion_names WHERE id = emotion_name_id_old)::emotion_name_enum
    WHERE emotion_name_id_old IS NOT NULL;
    
    -- 古いカラムを削除
    ALTER TABLE hume_burst_emotion_scores 
        DROP COLUMN emotion_name_id_old;
    
    -- NOT NULL制約を追加
    ALTER TABLE hume_burst_emotion_scores 
        ALTER COLUMN emotion_name SET NOT NULL;
    
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
END $$;

-- 3. hume_face_emotion_scores: emotion_name_id INTEGER → emotion_name emotion_name_enum
DO $$
BEGIN
    ALTER TABLE hume_face_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_face_emotion_scores_emotion_name_id_fkey;
    
    ALTER TABLE hume_face_emotion_scores 
        RENAME COLUMN emotion_name_id TO emotion_name_id_old;
    
    ALTER TABLE hume_face_emotion_scores 
        ADD COLUMN emotion_name emotion_name_enum;
    
    UPDATE hume_face_emotion_scores 
    SET emotion_name = (SELECT name FROM emotion_names WHERE id = emotion_name_id_old)::emotion_name_enum
    WHERE emotion_name_id_old IS NOT NULL;
    
    ALTER TABLE hume_face_emotion_scores 
        DROP COLUMN emotion_name_id_old;
    
    ALTER TABLE hume_face_emotion_scores 
        ALTER COLUMN emotion_name SET NOT NULL;
    
    ALTER TABLE hume_face_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_face_emotion_scores_hume_face_emotion_data_id_emotion_name_id_key;
    
    ALTER TABLE hume_face_emotion_scores 
        ADD CONSTRAINT hume_face_emotion_scores_hume_face_emotion_data_id_emotion_name_key 
        UNIQUE (hume_face_emotion_data_id, emotion_name);
    
    DROP INDEX IF EXISTS idx_hume_face_emotion_scores_emotion_name;
    CREATE INDEX idx_hume_face_emotion_scores_emotion_name 
        ON hume_face_emotion_scores(emotion_name);
END $$;

-- 4. hume_language_emotion_scores: emotion_name_id INTEGER → emotion_name emotion_name_enum
DO $$
BEGIN
    ALTER TABLE hume_language_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_language_emotion_scores_emotion_name_id_fkey;
    
    ALTER TABLE hume_language_emotion_scores 
        RENAME COLUMN emotion_name_id TO emotion_name_id_old;
    
    ALTER TABLE hume_language_emotion_scores 
        ADD COLUMN emotion_name emotion_name_enum;
    
    UPDATE hume_language_emotion_scores 
    SET emotion_name = (SELECT name FROM emotion_names WHERE id = emotion_name_id_old)::emotion_name_enum
    WHERE emotion_name_id_old IS NOT NULL;
    
    ALTER TABLE hume_language_emotion_scores 
        DROP COLUMN emotion_name_id_old;
    
    ALTER TABLE hume_language_emotion_scores 
        ALTER COLUMN emotion_name SET NOT NULL;
    
    ALTER TABLE hume_language_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_language_emotion_scores_hume_language_emotion_data_id_emotion_name_id_key;
    
    ALTER TABLE hume_language_emotion_scores 
        ADD CONSTRAINT hume_language_emotion_scores_hume_language_emotion_data_id_emotion_name_key 
        UNIQUE (hume_language_emotion_data_id, emotion_name);
    
    DROP INDEX IF EXISTS idx_hume_language_emotion_scores_emotion_name;
    CREATE INDEX idx_hume_language_emotion_scores_emotion_name 
        ON hume_language_emotion_scores(emotion_name);
END $$;

-- 5. hume_prosody_emotion_scores: emotion_name_id INTEGER → emotion_name emotion_name_enum
DO $$
BEGIN
    ALTER TABLE hume_prosody_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_prosody_emotion_scores_emotion_name_id_fkey;
    
    ALTER TABLE hume_prosody_emotion_scores 
        RENAME COLUMN emotion_name_id TO emotion_name_id_old;
    
    ALTER TABLE hume_prosody_emotion_scores 
        ADD COLUMN emotion_name emotion_name_enum;
    
    UPDATE hume_prosody_emotion_scores 
    SET emotion_name = (SELECT name FROM emotion_names WHERE id = emotion_name_id_old)::emotion_name_enum
    WHERE emotion_name_id_old IS NOT NULL;
    
    ALTER TABLE hume_prosody_emotion_scores 
        DROP COLUMN emotion_name_id_old;
    
    ALTER TABLE hume_prosody_emotion_scores 
        ALTER COLUMN emotion_name SET NOT NULL;
    
    ALTER TABLE hume_prosody_emotion_scores 
        DROP CONSTRAINT IF EXISTS hume_prosody_emotion_scores_hume_prosody_emotion_data_id_emotion_name_id_key;
    
    ALTER TABLE hume_prosody_emotion_scores 
        ADD CONSTRAINT hume_prosody_emotion_scores_hume_prosody_emotion_data_id_emotion_name_key 
        UNIQUE (hume_prosody_emotion_data_id, emotion_name);
    
    DROP INDEX IF EXISTS idx_hume_prosody_emotion_scores_emotion_name;
    CREATE INDEX idx_hume_prosody_emotion_scores_emotion_name 
        ON hume_prosody_emotion_scores(emotion_name);
END $$;

-- 6. timeline_emotion_entries: emotion_name_id INTEGER → emotion_name emotion_name_enum
DO $$
BEGIN
    ALTER TABLE timeline_emotion_entries 
        DROP CONSTRAINT IF EXISTS timeline_emotion_entries_emotion_name_id_fkey;
    
    ALTER TABLE timeline_emotion_entries 
        RENAME COLUMN emotion_name_id TO emotion_name_id_old;
    
    ALTER TABLE timeline_emotion_entries 
        ADD COLUMN emotion_name emotion_name_enum;
    
    UPDATE timeline_emotion_entries 
    SET emotion_name = (SELECT name FROM emotion_names WHERE id = emotion_name_id_old)::emotion_name_enum
    WHERE emotion_name_id_old IS NOT NULL;
    
    ALTER TABLE timeline_emotion_entries 
        DROP COLUMN emotion_name_id_old;
    
    ALTER TABLE timeline_emotion_entries 
        ALTER COLUMN emotion_name SET NOT NULL;
    
    ALTER TABLE timeline_emotion_entries 
        DROP CONSTRAINT IF EXISTS timeline_emotion_entries_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_emotion_name_id_file_type_key;
    
    ALTER TABLE timeline_emotion_entries 
        ADD CONSTRAINT timeline_emotion_entries_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_emotion_name_file_type_key 
        UNIQUE (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name, file_type);
    
    DROP INDEX IF EXISTS idx_timeline_emotion_entries_emotion_name;
    CREATE INDEX idx_timeline_emotion_entries_emotion_name 
        ON timeline_emotion_entries(emotion_name);
END $$;

-- 7. session_events: event_type_id INTEGER → event_type session_event_type_enum
DO $$
BEGIN
    ALTER TABLE session_events 
        DROP CONSTRAINT IF EXISTS session_events_event_type_id_fkey;
    
    ALTER TABLE session_events 
        RENAME COLUMN event_type_id TO event_type_id_old;
    
    ALTER TABLE session_events 
        ADD COLUMN event_type session_event_type_enum;
    
    UPDATE session_events 
    SET event_type = (SELECT event_type FROM event_types WHERE id = event_type_id_old)::session_event_type_enum
    WHERE event_type_id_old IS NOT NULL;
    
    ALTER TABLE session_events 
        DROP COLUMN event_type_id_old;
    
    ALTER TABLE session_events 
        ALTER COLUMN event_type SET NOT NULL;
    
    DROP INDEX IF EXISTS idx_session_events_event_type;
    CREATE INDEX idx_session_events_event_type 
        ON session_events(event_type);
END $$;

-- 8. physiological_measurements: measurement_type_id INTEGER → measurement_type measurement_type_enum
DO $$
BEGIN
    ALTER TABLE physiological_measurements 
        DROP CONSTRAINT IF EXISTS physiological_measurements_measurement_type_id_fkey;
    
    ALTER TABLE physiological_measurements 
        RENAME COLUMN measurement_type_id TO measurement_type_id_old;
    
    ALTER TABLE physiological_measurements 
        ADD COLUMN measurement_type measurement_type_enum;
    
    UPDATE physiological_measurements 
    SET measurement_type = (SELECT measurement_type FROM physiological_measurement_types WHERE id = measurement_type_id_old)::measurement_type_enum
    WHERE measurement_type_id_old IS NOT NULL;
    
    ALTER TABLE physiological_measurements 
        DROP COLUMN measurement_type_id_old;
    
    ALTER TABLE physiological_measurements 
        ALTER COLUMN measurement_type SET NOT NULL;
    
    ALTER TABLE physiological_measurements 
        DROP CONSTRAINT IF EXISTS physiological_measurements_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_measurement_type_id_key;
    
    ALTER TABLE physiological_measurements 
        ADD CONSTRAINT physiological_measurements_timeline_point_time_timeline_point_participant_id_timeline_point_session_id_measurement_type_key 
        UNIQUE (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, measurement_type);
    
    DROP INDEX IF EXISTS idx_physiological_measurements_type;
    CREATE INDEX idx_physiological_measurements_type 
        ON physiological_measurements(measurement_type);
END $$;

-- 9. physiological_measurementsにunitカラムを追加（ENUM型）
ALTER TABLE physiological_measurements 
    ADD COLUMN unit measurement_unit_enum;

-- unitのデフォルト値を設定（既存データには'unknown'を設定）
UPDATE physiological_measurements 
SET unit = 'unknown'::measurement_unit_enum 
WHERE unit IS NULL;

-- コメント追加
COMMENT ON COLUMN hume_burst_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key)';
COMMENT ON COLUMN hume_face_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key)';
COMMENT ON COLUMN hume_language_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key)';
COMMENT ON COLUMN hume_prosody_emotion_scores.emotion_name IS 'Emotion name enum (direct reference, no foreign key)';
COMMENT ON COLUMN timeline_emotion_entries.emotion_name IS 'Emotion name enum (direct reference, no foreign key)';
COMMENT ON COLUMN session_events.event_type IS 'Session event type enum (direct reference, no foreign key)';
COMMENT ON COLUMN physiological_measurements.measurement_type IS 'Measurement type enum (direct reference, no foreign key)';
COMMENT ON COLUMN physiological_measurements.unit IS 'Measurement unit enum';

