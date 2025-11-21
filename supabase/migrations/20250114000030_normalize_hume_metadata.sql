-- Merkle DAG: normalize_hume_metadata -> hume_metadata_tables
-- Hume AIの各モダリティ（prosody, burst, face, language）のメタデータを正規化

-- 1. メタデータタイプのENUM型を作成
CREATE TYPE hume_metadata_type_enum AS ENUM (
    -- Burst (Vocal Bursts) metadata
    'vocal_type', -- バーストの種類（笑い、ため息など）
    
    -- Face (Facial Expression) metadata
    'action_unit', -- Action Unit (AU) スコア
    'face_probability', -- 顔検出の信頼度
    'face_position_x', -- 顔のX座標
    'face_position_y', -- 顔のY座標
    'face_width', -- 顔の幅
    'face_height', -- 顔の高さ
    'frame_number', -- フレーム番号
    
    -- Language (Emotional Language) metadata
    'toxicity_score', -- 毒性スコア（toxic, severe_toxic, obscene, threat, insult, identity_hate）
    'text_content', -- テキスト内容
    
    -- Prosody (音声韻律) metadata
    'pitch_f0', -- 基本周波数（F0）
    'volume_level', -- 音量レベル
    'speech_rate', -- 話速
    'pitch_range', -- ピッチ範囲
    'energy', -- エネルギー
    'spectral_centroid', -- スペクトル重心
    'spectral_rolloff', -- スペクトルロールオフ
    'zero_crossing_rate' -- ゼロクロッシングレート
);

-- 2. メタデータテーブルを作成（各モダリティ共通）
-- hume_burst_metadata
CREATE TABLE IF NOT EXISTS hume_burst_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_burst_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
    metadata_type hume_metadata_type_enum NOT NULL,
    value DOUBLE PRECISION, -- 数値メタデータ
    text_value TEXT, -- テキストメタデータ（vocal_type名など）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hume_burst_emotion_data_id, metadata_type, text_value)
);

-- hume_face_metadata
CREATE TABLE IF NOT EXISTS hume_face_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_face_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
    metadata_type hume_metadata_type_enum NOT NULL,
    value DOUBLE PRECISION, -- 数値メタデータ（AUスコア、probability、座標など）
    text_value TEXT, -- テキストメタデータ（AU名など）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hume_face_emotion_data_id, metadata_type, text_value)
);

-- hume_language_metadata
CREATE TABLE IF NOT EXISTS hume_language_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_language_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
    metadata_type hume_metadata_type_enum NOT NULL,
    value DOUBLE PRECISION, -- 数値メタデータ（toxicity_scoreなど）
    text_value TEXT, -- テキストメタデータ（text_content、toxicity_type名など）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hume_language_emotion_data_id, metadata_type, text_value)
);

-- hume_prosody_metadata
CREATE TABLE IF NOT EXISTS hume_prosody_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hume_prosody_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
    metadata_type hume_metadata_type_enum NOT NULL,
    value DOUBLE PRECISION NOT NULL, -- 数値メタデータ（F0、音量、話速など）
    text_value TEXT, -- テキストメタデータ（必要に応じて）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hume_prosody_emotion_data_id, metadata_type)
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_hume_burst_metadata_data_id 
    ON hume_burst_metadata(hume_burst_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_burst_metadata_type 
    ON hume_burst_metadata(metadata_type);

CREATE INDEX IF NOT EXISTS idx_hume_face_metadata_data_id 
    ON hume_face_metadata(hume_face_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_face_metadata_type 
    ON hume_face_metadata(metadata_type);

CREATE INDEX IF NOT EXISTS idx_hume_language_metadata_data_id 
    ON hume_language_metadata(hume_language_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_language_metadata_type 
    ON hume_language_metadata(metadata_type);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_metadata_data_id 
    ON hume_prosody_metadata(hume_prosody_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_metadata_type 
    ON hume_prosody_metadata(metadata_type);

-- 4. 既存のJSONBメタデータを正規化テーブルに移行
-- Burst: vocal_types JSONB → hume_burst_metadata
DO $$
DECLARE
    burst_record RECORD;
    vocal_type_name TEXT;
    vocal_type_score DOUBLE PRECISION;
BEGIN
    FOR burst_record IN 
        SELECT id, vocal_types 
        FROM hume_burst_emotion_data 
        WHERE vocal_types IS NOT NULL AND vocal_types != '[]'::jsonb
    LOOP
        -- vocal_types JSONBを展開
        FOR vocal_type_name, vocal_type_score IN 
            SELECT key, value::text FROM jsonb_each(burst_record.vocal_types)
        LOOP
            BEGIN
                INSERT INTO hume_burst_metadata (
                    hume_burst_emotion_data_id, 
                    metadata_type, 
                    text_value, 
                    value
                )
                VALUES (
                    burst_record.id,
                    'vocal_type'::hume_metadata_type_enum,
                    vocal_type_name,
                    vocal_type_score::DOUBLE PRECISION
                )
                ON CONFLICT (hume_burst_emotion_data_id, metadata_type, text_value) DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error migrating vocal_type % for burst %: %', vocal_type_name, burst_record.id, SQLERRM;
            END;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Migrated vocal_types from hume_burst_emotion_data to hume_burst_metadata';
END $$;

-- Face: au_scores JSONB → hume_face_metadata
DO $$
DECLARE
    face_record RECORD;
    au_name TEXT;
    au_score DOUBLE PRECISION;
BEGIN
    FOR face_record IN 
        SELECT id, au_scores, probability, face_x0, face_y0, face_width, face_height, frame
        FROM hume_face_emotion_data
    LOOP
        -- au_scores JSONBを展開
        IF face_record.au_scores IS NOT NULL AND face_record.au_scores != '{}'::jsonb THEN
            FOR au_name, au_score IN 
                SELECT key, value::text FROM jsonb_each(face_record.au_scores)
            LOOP
                BEGIN
                    INSERT INTO hume_face_metadata (
                        hume_face_emotion_data_id, 
                        metadata_type, 
                        text_value, 
                        value
                    )
                    VALUES (
                        face_record.id,
                        'action_unit'::hume_metadata_type_enum,
                        au_name,
                        au_score::DOUBLE PRECISION
                    )
                    ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error migrating AU % for face %: %', au_name, face_record.id, SQLERRM;
                END;
            END LOOP;
        END IF;
        
        -- probability, face_x0, face_y0, face_width, face_height, frameを移行
        IF face_record.probability IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'face_probability'::hume_metadata_type_enum, face_record.probability)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
        
        IF face_record.face_x0 IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'face_position_x'::hume_metadata_type_enum, face_record.face_x0::DOUBLE PRECISION)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
        
        IF face_record.face_y0 IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'face_position_y'::hume_metadata_type_enum, face_record.face_y0::DOUBLE PRECISION)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
        
        IF face_record.face_width IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'face_width'::hume_metadata_type_enum, face_record.face_width::DOUBLE PRECISION)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
        
        IF face_record.face_height IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'face_height'::hume_metadata_type_enum, face_record.face_height::DOUBLE PRECISION)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
        
        IF face_record.frame IS NOT NULL THEN
            INSERT INTO hume_face_metadata (hume_face_emotion_data_id, metadata_type, value)
            VALUES (face_record.id, 'frame_number'::hume_metadata_type_enum, face_record.frame::DOUBLE PRECISION)
            ON CONFLICT (hume_face_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated face metadata from hume_face_emotion_data to hume_face_metadata';
END $$;

-- Language: toxicity_scores JSONB → hume_language_metadata
DO $$
DECLARE
    language_record RECORD;
    toxicity_type TEXT;
    toxicity_score DOUBLE PRECISION;
BEGIN
    FOR language_record IN 
        SELECT id, toxicity_scores, text
        FROM hume_language_emotion_data
    LOOP
        -- toxicity_scores JSONBを展開
        IF language_record.toxicity_scores IS NOT NULL AND language_record.toxicity_scores != '{}'::jsonb THEN
            FOR toxicity_type, toxicity_score IN 
                SELECT key, value::text FROM jsonb_each(language_record.toxicity_scores)
            LOOP
                BEGIN
                    INSERT INTO hume_language_metadata (
                        hume_language_emotion_data_id, 
                        metadata_type, 
                        text_value, 
                        value
                    )
                    VALUES (
                        language_record.id,
                        'toxicity_score'::hume_metadata_type_enum,
                        toxicity_type,
                        toxicity_score::DOUBLE PRECISION
                    )
                    ON CONFLICT (hume_language_emotion_data_id, metadata_type, text_value) DO NOTHING;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Error migrating toxicity_score % for language %: %', toxicity_type, language_record.id, SQLERRM;
                END;
            END LOOP;
        END IF;
        
        -- textを移行
        IF language_record.text IS NOT NULL AND language_record.text != '' THEN
            INSERT INTO hume_language_metadata (hume_language_emotion_data_id, metadata_type, text_value)
            VALUES (language_record.id, 'text_content'::hume_metadata_type_enum, language_record.text)
            ON CONFLICT (hume_language_emotion_data_id, metadata_type, text_value) DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated language metadata from hume_language_emotion_data to hume_language_metadata';
END $$;

-- 5. コメント追加
COMMENT ON TYPE hume_metadata_type_enum IS 'Hume AI metadata types for prosody, burst, face, and language modalities';
COMMENT ON TABLE hume_burst_metadata IS 'Normalized metadata for hume_burst_emotion_data (vocal_types)';
COMMENT ON TABLE hume_face_metadata IS 'Normalized metadata for hume_face_emotion_data (AU scores, face position, probability, frame)';
COMMENT ON TABLE hume_language_metadata IS 'Normalized metadata for hume_language_emotion_data (toxicity_scores, text)';
COMMENT ON TABLE hume_prosody_metadata IS 'Normalized metadata for hume_prosody_emotion_data (pitch, volume, speech rate, etc.)';

