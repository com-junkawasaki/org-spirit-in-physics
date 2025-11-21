-- Merkle DAG: extend_metadata_enums -> enhanced_metadata
-- Hume AIメタデータタイプENUMを拡張し、APIレスポンスに完全対応

-- 1. 既存のhume_metadata_type_enumを拡張
DO $$
BEGIN
    -- 既存のENUMタイプを確認
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'hume_metadata_type_enum'
    ) THEN
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
            'zero_crossing_rate', -- ゼロクロッシングレート

            -- 追加する新しいメタデータタイプ
            'detected_language', -- Prosody: 検出された言語
            'sentiment', -- Language: 感情分析（positive/negative/neutral）
            'speaker_confidence', -- Language: 話者信頼度
            'face_box_x', -- Face: 顔のバウンディングボックスX座標
            'face_box_y', -- Face: 顔のバウンディングボックスY座標
            'face_box_w', -- Face: 顔のバウンディングボックス幅
            'face_box_h', -- Face: 顔のバウンディングボックス高さ
            'begin_position', -- Language: 開始位置（文字単位）
            'end_position', -- Language: 終了位置（文字単位）
            'confidence' -- 一般的な信頼度スコア
        );

        RAISE NOTICE 'Created hume_metadata_type_enum with extended types';
    ELSE
        -- ENUMを拡張（PostgreSQLでは直接拡張できないため、新しいENUMを作成して置き換え）
        -- 既存のENUM値を取得
        CREATE TYPE hume_metadata_type_enum_new AS ENUM (
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
            'zero_crossing_rate', -- ゼロクロッシングレート

            -- 追加する新しいメタデータタイプ
            'detected_language', -- Prosody: 検出された言語
            'sentiment', -- Language: 感情分析（positive/negative/neutral）
            'speaker_confidence', -- Language: 話者信頼度
            'face_box_x', -- Face: 顔のバウンディングボックスX座標
            'face_box_y', -- Face: 顔のバウンディングボックスY座標
            'face_box_w', -- Face: 顔のバウンディングボックス幅
            'face_box_h', -- Face: 顔のバウンディングボックス高さ
            'begin_position', -- Language: 開始位置（文字単位）
            'end_position', -- Language: 終了位置（文字単位）
            'confidence' -- 一般的な信頼度スコア
        );

        -- カラムタイプを変更
        ALTER TABLE hume_burst_metadata ALTER COLUMN metadata_type TYPE hume_metadata_type_enum_new USING metadata_type::text::hume_metadata_type_enum_new;
        ALTER TABLE hume_face_metadata ALTER COLUMN metadata_type TYPE hume_metadata_type_enum_new USING metadata_type::text::hume_metadata_type_enum_new;
        ALTER TABLE hume_language_metadata ALTER COLUMN metadata_type TYPE hume_metadata_type_enum_new USING metadata_type::text::hume_metadata_type_enum_new;
        ALTER TABLE hume_prosody_metadata ALTER COLUMN metadata_type TYPE hume_metadata_type_enum_new USING metadata_type::text::hume_metadata_type_enum_new;

        -- 古いENUMを削除して新しいENUMに置き換え
        DROP TYPE hume_metadata_type_enum;
        ALTER TYPE hume_metadata_type_enum_new RENAME TO hume_metadata_type_enum;

        RAISE NOTICE 'Extended hume_metadata_type_enum with new types';
    END IF;
END $$;

-- 2. コメントを更新
COMMENT ON TYPE hume_metadata_type_enum IS 'Extended ENUM type for all Hume AI metadata fields across modalities (prosody, burst, face, language) - complete API response coverage';
