-- Merkle DAG: session_event_types -> session_event_type_enum
-- Domain first: Rust側で定義したSessionEventType ENUMをPostgreSQLに登録

-- 1. session_event_type_enum ENUM型の作成（Rust側の定義に基づく）
CREATE TYPE session_event_type_enum AS ENUM (
    'participant_initialized',
    'preflight_started',
    'preflight_devices_acquired',
    'recording_started',
    'recording_stopped_and_saved',
    'session_started',
    'word_displayed',
    'response_window_opened',
    'speech_detected',
    'response_window_closed',
    'session_data_saved',
    'session_1_completed',
    'session_1_video_saved',
    'session_2_completed',
    'test_completed',
    'test_reset',
    'media_recorder_setup_failed'
);

-- 2. event_typesテーブルに既存の値を登録（存在しない場合のみ）
-- 注意: event_typesテーブルのevent_typeカラムが既にevent_type_enum型の場合は、
-- まずsession_event_type_enumに変換してからINSERTする
DO $$
BEGIN
    -- event_typesテーブルが存在し、event_typeカラムがevent_type_enum型の場合
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_types' 
        AND column_name = 'event_type'
        AND udt_name = 'event_type_enum'
    ) THEN
        -- 既存のevent_type_enum値をsession_event_type_enumに変換してINSERT
        INSERT INTO event_types (event_type)
        SELECT event_type::text::session_event_type_enum
        FROM event_types
        WHERE event_type::text IN (
            'participant_initialized',
            'preflight_started',
            'preflight_devices_acquired',
            'recording_started',
            'recording_stopped_and_saved',
            'session_started',
            'word_displayed',
            'response_window_opened',
            'speech_detected',
            'response_window_closed',
            'session_data_saved',
            'session_1_completed',
            'session_1_video_saved',
            'session_2_completed',
            'test_completed',
            'test_reset',
            'media_recorder_setup_failed'
        )
        ON CONFLICT (event_type) DO NOTHING;
    ELSE
        -- event_typesテーブルが存在しないか、event_typeカラムがTEXT型の場合
        INSERT INTO event_types (event_type)
        SELECT unnest(ARRAY[
            'participant_initialized',
            'preflight_started',
            'preflight_devices_acquired',
            'recording_started',
            'recording_stopped_and_saved',
            'session_started',
            'word_displayed',
            'response_window_opened',
            'speech_detected',
            'response_window_closed',
            'session_data_saved',
            'session_1_completed',
            'session_1_video_saved',
            'session_2_completed',
            'test_completed',
            'test_reset',
            'media_recorder_setup_failed'
        ]::session_event_type_enum[])
        ON CONFLICT (event_type) DO NOTHING;
    END IF;
END $$;

-- 3. 既存のevent_type_enumがある場合は、session_event_type_enumに移行
-- 注意: 既存のevent_type_enumとsession_event_type_enumが競合する場合は、
-- 既存のevent_type_enumを削除してsession_event_type_enumに統一する
DO $$
BEGIN
    -- 既存のevent_type_enumが存在する場合、session_event_type_enumに移行
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type_enum') THEN
        -- 依存するビューとマテリアライズドビューを一時的に削除
        DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
        DROP VIEW IF EXISTS session_detail CASCADE;
        DROP VIEW IF EXISTS participant_detail CASCADE;
        DROP VIEW IF EXISTS participant_summary CASCADE;
        
        -- event_typesテーブルのevent_typeカラムをsession_event_type_enumに変更
        -- 既存のevent_type_enum値をtextに変換してからsession_event_type_enumに変換
        ALTER TABLE event_types 
            ALTER COLUMN event_type TYPE session_event_type_enum 
            USING event_type::text::session_event_type_enum;
        
        -- 古いevent_type_enumを削除（依存関係がなくなった後）
        -- 注意: 他のテーブルやビューがevent_type_enumを使用している場合は削除できない
        -- その場合は、それらも更新する必要がある
        DROP TYPE IF EXISTS event_type_enum CASCADE;
        
        RAISE NOTICE 'Migrated from event_type_enum to session_event_type_enum';
    ELSE
        -- event_type_enumが存在しない場合、event_typesテーブルをsession_event_type_enumに変更
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_types' 
            AND column_name = 'event_type'
            AND data_type = 'text'
        ) THEN
            -- 依存するビューとマテリアライズドビューを一時的に削除
            DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
            DROP VIEW IF EXISTS session_detail CASCADE;
            DROP VIEW IF EXISTS participant_detail CASCADE;
            DROP VIEW IF EXISTS participant_summary CASCADE;
            
            -- event_typesテーブルのevent_typeカラムをsession_event_type_enumに変更
            ALTER TABLE event_types 
                ALTER COLUMN event_type TYPE session_event_type_enum 
                USING event_type::session_event_type_enum;
            
            RAISE NOTICE 'Converted event_types.event_type to session_event_type_enum';
        END IF;
    END IF;
END $$;

-- 4. インデックスの再作成
CREATE INDEX IF NOT EXISTS idx_event_types_event_type 
    ON event_types(event_type);

-- 5. コメント追加
COMMENT ON TYPE session_event_type_enum IS 'Domain first: Session event types extracted from application code (Rust -> PostgreSQL -> GraphQL -> TypeScript)';
COMMENT ON COLUMN event_types.event_type IS 'Session event type enum (domain first definition)';

