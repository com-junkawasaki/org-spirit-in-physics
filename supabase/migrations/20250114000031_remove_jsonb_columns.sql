-- Merkle DAG: remove_jsonb_columns -> complete_normalization
-- JSONBカラムを完全に削除し、正規化を完了させる

-- 1. 依存するビューとマテリアライズドビューを一時的に削除
DROP MATERIALIZED VIEW IF EXISTS timeline_word_aggregates_by_session CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_word_statistics_by_session CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 2. Hume AIデータテーブルからJSONBカラムを削除
DO $$
BEGIN
    -- hume_burst_emotion_data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_burst_emotion_data'
        AND column_name = 'emotion_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_burst_emotion_data DROP COLUMN emotion_scores;
        RAISE NOTICE 'Dropped emotion_scores column from hume_burst_emotion_data';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_burst_emotion_data'
        AND column_name = 'vocal_types'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_burst_emotion_data DROP COLUMN vocal_types;
        RAISE NOTICE 'Dropped vocal_types column from hume_burst_emotion_data';
    END IF;

    -- hume_face_emotion_data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_face_emotion_data'
        AND column_name = 'emotion_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_face_emotion_data DROP COLUMN emotion_scores;
        RAISE NOTICE 'Dropped emotion_scores column from hume_face_emotion_data';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_face_emotion_data'
        AND column_name = 'au_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_face_emotion_data DROP COLUMN au_scores;
        RAISE NOTICE 'Dropped au_scores column from hume_face_emotion_data';
    END IF;

    -- hume_language_emotion_data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_language_emotion_data'
        AND column_name = 'emotion_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_language_emotion_data DROP COLUMN emotion_scores;
        RAISE NOTICE 'Dropped emotion_scores column from hume_language_emotion_data';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_language_emotion_data'
        AND column_name = 'toxicity_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_language_emotion_data DROP COLUMN toxicity_scores;
        RAISE NOTICE 'Dropped toxicity_scores column from hume_language_emotion_data';
    END IF;

    -- hume_prosody_emotion_data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hume_prosody_emotion_data'
        AND column_name = 'emotion_scores'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE hume_prosody_emotion_data DROP COLUMN emotion_scores;
        RAISE NOTICE 'Dropped emotion_scores column from hume_prosody_emotion_data';
    END IF;

END $$;

-- 3. セッションテーブルからJSONBカラムを削除
DO $$
BEGIN
    -- sessions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions'
        AND column_name = 'events'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE sessions DROP COLUMN events;
        RAISE NOTICE 'Dropped events column from sessions';
    END IF;

END $$;

-- 4. timeline_pointsテーブルからJSONBカラムを削除
DO $$
BEGIN
    -- timeline_points
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'timeline_points'
        AND column_name = 'emotions'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE timeline_points DROP COLUMN emotions;
        RAISE NOTICE 'Dropped emotions column from timeline_points';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'timeline_points'
        AND column_name = 'physiological'
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE timeline_points DROP COLUMN physiological;
        RAISE NOTICE 'Dropped physiological column from timeline_points';
    END IF;

END $$;

-- 5. ビューとマテリアライズドビューを再作成
-- (これらは次のマイグレーションファイルで再作成されるため、ここでは作成しない)

-- 6. コメント追加
COMMENT ON TABLE hume_burst_emotion_data IS 'Hume AI burst emotion data (normalized, no JSONB columns)';
COMMENT ON TABLE hume_face_emotion_data IS 'Hume AI face emotion data (normalized, no JSONB columns)';
COMMENT ON TABLE hume_language_emotion_data IS 'Hume AI language emotion data (normalized, no JSONB columns)';
COMMENT ON TABLE hume_prosody_emotion_data IS 'Hume AI prosody emotion data (normalized, no JSONB columns)';
COMMENT ON TABLE timeline_points IS 'Timeline points data (normalized, no JSONB columns)';
