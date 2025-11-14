-- Merkle DAG: cleanup_final -> remove_unused_tables_final
-- 最終的な不要テーブルの削除

-- 1. word_stimuliテーブルの削除確認
-- session_events.word_idがNULL許容で、word_stimuliテーブルへの参照が存在しない場合
DO $$
BEGIN
    -- word_stimuliテーブルが存在するか確認
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'word_stimuli'
    ) THEN
        -- session_events.word_idの外部キー制約を削除（存在する場合）
        ALTER TABLE session_events 
        DROP CONSTRAINT IF EXISTS session_events_word_id_fkey;
        
        -- word_stimuliテーブルを削除
        DROP TABLE IF EXISTS word_stimuli CASCADE;
        
        RAISE NOTICE 'word_stimuli table dropped';
    ELSE
        RAISE NOTICE 'word_stimuli table does not exist';
    END IF;
END $$;

-- 2. 既に削除されているテーブルの確認（agreement_types, prosody_feature_types, prosody_features）
-- これらは既に20250114000020_remove_unused_type_tables.sqlで削除されているはず
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agreement_types'
    ) THEN
        DROP TABLE IF EXISTS agreement_types CASCADE;
        RAISE NOTICE 'agreement_types table dropped';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prosody_feature_types'
    ) THEN
        DROP TABLE IF EXISTS prosody_feature_types CASCADE;
        RAISE NOTICE 'prosody_feature_types table dropped';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prosody_features'
    ) THEN
        DROP TABLE IF EXISTS prosody_features CASCADE;
        RAISE NOTICE 'prosody_features table dropped';
    END IF;
END $$;

-- 3. 注意: event_typesとphysiological_measurement_typesは削除しない
-- 理由:
-- - session_events.event_type_idがevent_types.idを参照（外部キー制約）
-- - physiological_measurements.measurement_type_idがphysiological_measurement_types.idを参照（外部キー制約）
-- - ENUM型に変換されても、マスターテーブルは外部キー参照とメタデータ（description、unitなど）のために必要
-- - 将来的な拡張性のため

-- 4. コメント追加（event_typesとphysiological_measurement_typesがENUM型を使用していることを明記）
COMMENT ON TABLE event_types IS 'Master table for session event types. event_type column uses session_event_type_enum ENUM type. Required for foreign key references from session_events table.';
COMMENT ON TABLE physiological_measurement_types IS 'Master table for physiological measurement types. measurement_type column uses measurement_type_enum ENUM type. Required for foreign key references from physiological_measurements table.';

