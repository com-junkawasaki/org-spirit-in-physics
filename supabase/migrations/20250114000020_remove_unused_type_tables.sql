-- Merkle DAG: cleanup_type_tables -> remove_unused_type_tables
-- ENUM型に変換したため不要になったマスターテーブルの削除

-- 1. agreement_typesテーブルの削除（consent_agreementsテーブルが存在しない場合）
-- 注意: consent_agreementsテーブルが存在する場合は削除しない
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'consent_agreements'
    ) THEN
        -- consent_agreementsが存在しない場合、agreement_typesを削除
        DROP TABLE IF EXISTS agreement_types CASCADE;
        RAISE NOTICE 'agreement_types table dropped (consent_agreements does not exist)';
    ELSE
        RAISE NOTICE 'agreement_types table kept (consent_agreements exists)';
    END IF;
END $$;

-- 2. event_typesとphysiological_measurement_typesはENUM型に変換していないため、
--    動的な値の追加に対応する必要があるため、削除しない
-- 注意: これらはマスターテーブルとしてTEXT型のまま維持

-- 3. 使用されていないprosody_feature_typesテーブルの確認と削除
-- prosody_featuresテーブルが空または使用されていない場合
DO $$
DECLARE
    prosody_features_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO prosody_features_count
    FROM prosody_features;
    
    IF prosody_features_count = 0 THEN
        -- prosody_featuresが空の場合、prosody_feature_typesも削除
        DROP TABLE IF EXISTS prosody_features CASCADE;
        DROP TABLE IF EXISTS prosody_feature_types CASCADE;
        RAISE NOTICE 'prosody_feature_types and prosody_features tables dropped (empty)';
    ELSE
        RAISE NOTICE 'prosody_feature_types table kept (prosody_features has data)';
    END IF;
END $$;

