-- Merkle DAG: convert_emotion_names_to_enum -> emotion_name_enum
-- emotion_names.nameをENUM型に変換（動的追加不要）

-- 1. emotion_name_enum ENUM型の作成（Hume AIの82種類の感情タイプ）
CREATE TYPE emotion_name_enum AS ENUM (
    -- Basic emotions (基本感情)
    'Admiration',
    'Adoration',
    'Aesthetic Appreciation',
    'Amusement',
    'Anger',
    'Anxiety',
    'Awe',
    'Awkwardness',
    'Boredom',
    'Calmness',
    'Concentration',
    'Contemplation',
    'Confusion',
    'Contempt',
    'Contentment',
    'Craving',
    'Determination',
    'Disappointment',
    'Disgust',
    'Distress',
    'Doubt',
    'Ecstasy',
    'Embarrassment',
    'Empathic Pain',
    'Entrancement',
    'Envy',
    'Excitement',
    'Fear',
    'Guilt',
    'Horror',
    'Interest',
    'Joy',
    'Love',
    'Nostalgia',
    'Pain',
    'Pride',
    'Realization',
    'Relief',
    'Romance',
    'Sadness',
    'Satisfaction',
    'Desire',
    'Shame',
    'Surprise (negative)',
    'Surprise (positive)',
    'Surprise',
    'Sympathy',
    'Tiredness',
    'Triumph',
    -- Vocal expressions (burst emotions)
    'Cackle',
    'Cheer',
    'Chuckle',
    'Cry',
    'Gasp',
    'Giggle',
    'Groan',
    'Growl',
    'Grunt',
    'Hiss',
    'Hoot',
    'Howl',
    'Laugh',
    'Moan',
    'Pant',
    'Roar',
    'Scream',
    'Screech',
    'Shout',
    'Shriek',
    'Sigh',
    'Snicker',
    'Snort',
    'Sob',
    'Squeal',
    'Wail',
    'Wheep',
    'Whee',
    'Whew',
    'Yawn',
    'Yelp',
    'Yuck',
    -- Neutral/Metadata
    'Neutral'
);

-- 2. 依存するビューとマテリアライズドビューを一時的に削除
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 3. メタデータフィールドをemotion_scoresから削除（感情名ではないため）
-- 注意: これらは感情名ではなくメタデータ（Probability, FaceHeight, Frame, Time, Confidenceなど）
-- 使用されているメタデータフィールドのスコアを削除
DO $$
DECLARE
    metadata_fields TEXT[] := ARRAY[
        'Probability', 'FaceHeight', 'FaceWidth', 'FaceX0', 'FaceY0', 'Frame', 'Time',
        'Confidence', 'probability', 'faceheight', 'facewidth', 'facex0', 'facey0', 'frame', 'time',
        'confidence', 'beginposition', 'BeginPosition', 'endposition', 'EndPosition',
        'text', 'Text', 'id', 'Id'
    ];
    metadata_name TEXT;
    deleted_count INTEGER;
BEGIN
    FOR metadata_name IN SELECT unnest(metadata_fields)
    LOOP
        -- メタデータフィールドのスコアを削除
        DELETE FROM hume_burst_emotion_scores 
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = metadata_name);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % burst emotion scores for metadata field: %', deleted_count, metadata_name;
        END IF;
        
        DELETE FROM hume_face_emotion_scores 
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = metadata_name);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % face emotion scores for metadata field: %', deleted_count, metadata_name;
        END IF;
        
        DELETE FROM hume_language_emotion_scores 
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = metadata_name);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % language emotion scores for metadata field: %', deleted_count, metadata_name;
        END IF;
        
        DELETE FROM hume_prosody_emotion_scores 
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = metadata_name);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % prosody emotion scores for metadata field: %', deleted_count, metadata_name;
        END IF;
        
        DELETE FROM timeline_emotion_entries 
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = metadata_name);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % timeline emotion entries for metadata field: %', deleted_count, metadata_name;
        END IF;
    END LOOP;
END $$;

-- 4. ENUM型に含まれないemotion_namesを削除（使用されていない場合のみ）
DO $$
DECLARE
    invalid_emotion_name TEXT;
    emotion_usage_count INTEGER;
BEGIN
    -- ENUM型に含まれないemotion_namesを確認
    FOR invalid_emotion_name IN 
        SELECT DISTINCT name::text FROM emotion_names 
        WHERE name::text NOT IN (
            SELECT unnest(ARRAY[
                'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
                'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness',
                'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment',
                'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress',
                'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement',
                'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror',
                'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
                'Pride', 'Realization', 'Relief', 'Romance', 'Sadness',
                'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)',
                'Surprise', 'Sympathy', 'Tiredness', 'Triumph',
                'Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp',
                'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss',
                'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant',
                'Roar', 'Scream', 'Screech', 'Shout', 'Shriek',
                'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal',
                'Wail', 'Wheep', 'Whee', 'Whew', 'Yawn',
                'Yelp', 'Yuck', 'Neutral'
            ]::text[])
        )
    LOOP
        -- 使用状況を確認
        SELECT COUNT(*) INTO emotion_usage_count
        FROM (
            SELECT emotion_name_id FROM hume_burst_emotion_scores
            UNION ALL
            SELECT emotion_name_id FROM hume_face_emotion_scores
            UNION ALL
            SELECT emotion_name_id FROM hume_language_emotion_scores
            UNION ALL
            SELECT emotion_name_id FROM hume_prosody_emotion_scores
            UNION ALL
            SELECT emotion_name_id FROM timeline_emotion_entries
        ) usage_check
        WHERE emotion_name_id IN (SELECT id FROM emotion_names WHERE name = invalid_emotion_name);
        
        IF emotion_usage_count = 0 THEN
            -- 使用されていない場合のみ削除
            BEGIN
                DELETE FROM emotion_names WHERE name = invalid_emotion_name;
                RAISE NOTICE 'Deleted unused invalid emotion name: %', invalid_emotion_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Could not delete emotion name %: %', invalid_emotion_name, SQLERRM;
            END;
        ELSE
            RAISE WARNING 'Emotion name % is still used % times after cleanup, cannot delete', invalid_emotion_name, emotion_usage_count;
        END IF;
    END LOOP;
END $$;

-- 4. 既存のemotion_namesテーブルに存在しないENUM値を登録
INSERT INTO emotion_names (name, category)
SELECT 
    unnest(ARRAY[
        'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
        'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness',
        'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment',
        'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress',
        'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement',
        'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror',
        'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
        'Pride', 'Realization', 'Relief', 'Romance', 'Sadness',
        'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)',
        'Surprise', 'Sympathy', 'Tiredness', 'Triumph',
        'Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp',
        'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss',
        'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant',
        'Roar', 'Scream', 'Screech', 'Shout', 'Shriek',
        'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal',
        'Wail', 'Wheep', 'Whee', 'Whew', 'Yawn',
        'Yelp', 'Yuck', 'Neutral'
    ]::emotion_name_enum[]) as name,
    CASE 
        WHEN unnest(ARRAY[
            'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
            'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness',
            'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment',
            'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress',
            'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement',
            'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror',
            'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain',
            'Pride', 'Realization', 'Relief', 'Romance', 'Sadness',
            'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)',
            'Surprise', 'Sympathy', 'Tiredness', 'Triumph',
            'Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp',
            'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss',
            'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant',
            'Roar', 'Scream', 'Screech', 'Shout', 'Shriek',
            'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal',
            'Wail', 'Wheep', 'Whee', 'Whew', 'Yawn',
            'Yelp', 'Yuck', 'Neutral'
        ]::emotion_name_enum[]) IN (
            'Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp', 'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss',
            'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant', 'Roar', 'Scream', 'Screech', 'Shout', 'Shriek',
            'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal', 'Wail', 'Wheep', 'Whee', 'Whew', 'Yawn',
            'Yelp', 'Yuck'
        ) THEN 'burst'
        ELSE 'general'
    END as category
ON CONFLICT (name) DO NOTHING;

-- 5. emotion_names.nameをENUM型に変換
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emotion_names' 
        AND column_name = 'name'
        AND data_type = 'text'
    ) THEN
        -- 既存のTEXT値をENUM型にキャストして変換
        -- 注意: ENUM型に存在しない値はエラーになるため、事前に削除済み
        ALTER TABLE emotion_names 
            ALTER COLUMN name TYPE emotion_name_enum 
            USING name::emotion_name_enum;
        
        RAISE NOTICE 'Converted emotion_names.name to emotion_name_enum';
    END IF;
END $$;

-- 4. UNIQUE制約の確認（既に存在するはず）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'emotion_names_name_key'
    ) THEN
        ALTER TABLE emotion_names ADD CONSTRAINT emotion_names_name_key UNIQUE (name);
    END IF;
END $$;

-- 5. インデックスの再作成
CREATE INDEX IF NOT EXISTS idx_emotion_names_name 
    ON emotion_names(name);

-- 6. コメント追加
COMMENT ON TYPE emotion_name_enum IS 'Hume AI emotion types (82 types) - static enum, no dynamic addition';
COMMENT ON COLUMN emotion_names.name IS 'Emotion name enum (Hume AI emotion types)';

