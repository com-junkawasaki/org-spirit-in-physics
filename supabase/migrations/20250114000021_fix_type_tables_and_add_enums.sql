-- Merkle DAG: fix_type_tables -> add_missing_columns_and_enums
-- event_typesとphysiological_measurement_typesテーブルに不足しているカラムを追加し、ENUM型に変換

-- 1. event_typesテーブルにevent_typeカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_types' 
        AND column_name = 'event_type'
    ) THEN
        ALTER TABLE event_types ADD COLUMN event_type TEXT;
        RAISE NOTICE 'event_type column added to event_types table';
    END IF;
END $$;

-- 2. 既存のevent_type_idからevent_typeを復元（実際のデータから取得）
-- 注意: 重複を避けるため、既存のevent_type_enumから値を取得
DO $$
DECLARE
    enum_value TEXT;
    event_id INTEGER;
    counter INTEGER := 1;
BEGIN
    -- event_type_enumから値を取得してevent_typesテーブルを更新
    FOR enum_value IN 
        SELECT enumlabel::TEXT 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'event_type_enum'
        ORDER BY enumsortorder
    LOOP
        -- 既存のevent_typesテーブルにevent_typeがNULLの場合、enum値を設定
        UPDATE event_types 
        SET event_type = enum_value
        WHERE id = counter AND event_type IS NULL;
        
        counter := counter + 1;
        
        -- 14個のevent_type_idがあるため、ループを制限
        EXIT WHEN counter > 14;
    END LOOP;
END $$;

-- 3. event_typeにUNIQUE制約を追加（重複を解決してから）
-- 重複がある場合は、重複を削除してからUNIQUE制約を追加
DO $$
BEGIN
    -- 重複したevent_typeを持つ行を削除（idが大きい方を残す）
    DELETE FROM event_types et1
    WHERE EXISTS (
        SELECT 1 FROM event_types et2
        WHERE et2.event_type = et1.event_type
        AND et2.id > et1.id
    );
    
    -- UNIQUE制約を追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_types_event_type_key'
    ) THEN
        ALTER TABLE event_types ADD CONSTRAINT event_types_event_type_key UNIQUE (event_type);
    END IF;
END $$;

-- 4. physiological_measurement_typesテーブルにmeasurement_typeカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'physiological_measurement_types' 
        AND column_name = 'measurement_type'
    ) THEN
        ALTER TABLE physiological_measurement_types ADD COLUMN measurement_type TEXT;
        RAISE NOTICE 'measurement_type column added to physiological_measurement_types table';
    END IF;
END $$;

-- 5. 既存のphysiological_measurement_typesテーブルにmeasurement_typeを設定
-- 注意: 実際のmeasurement_type_enumから値を取得
DO $$
DECLARE
    enum_value TEXT;
    measurement_id INTEGER;
    counter INTEGER := 1;
BEGIN
    -- measurement_type_enumから値を取得してphysiological_measurement_typesテーブルを更新
    FOR enum_value IN 
        SELECT enumlabel::TEXT 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'measurement_type_enum'
        ORDER BY enumsortorder
    LOOP
        -- 既存のphysiological_measurement_typesテーブルにmeasurement_typeがNULLの場合、enum値を設定
        UPDATE physiological_measurement_types 
        SET measurement_type = enum_value
        WHERE id = counter AND measurement_type IS NULL;
        
        counter := counter + 1;
        
        -- 4個のmeasurement_type_idがあるため、ループを制限
        EXIT WHEN counter > 4;
    END LOOP;
END $$;

-- 6. measurement_typeにUNIQUE制約を追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'physiological_measurement_types_measurement_type_key'
    ) THEN
        ALTER TABLE physiological_measurement_types ADD CONSTRAINT physiological_measurement_types_measurement_type_key UNIQUE (measurement_type);
    END IF;
END $$;
