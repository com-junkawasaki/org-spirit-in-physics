-- Merkle DAG: convert_type_tables_to_enums -> enum_conversion_final
-- event_typesとphysiological_measurement_typesをENUM型に変換

-- 1. event_type_enum ENUM型の作成（既存のevent_typesテーブルから値を動的に抽出）
DO $$
DECLARE
    enum_values TEXT;
    sql_stmt TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type_enum') THEN
        SELECT string_agg(quote_literal(event_type), ', ' ORDER BY event_type)
        INTO enum_values
        FROM event_types
        WHERE event_type IS NOT NULL;
        
        IF enum_values IS NOT NULL THEN
            sql_stmt := format('CREATE TYPE event_type_enum AS ENUM (%s)', enum_values);
            EXECUTE sql_stmt;
            RAISE NOTICE 'Created event_type_enum with values: %', enum_values;
        END IF;
    END IF;
END $$;

-- 2. measurement_type_enum ENUM型の作成（既存のphysiological_measurement_typesテーブルから値を動的に抽出）
DO $$
DECLARE
    enum_values TEXT;
    sql_stmt TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_type_enum') THEN
        SELECT string_agg(quote_literal(measurement_type), ', ' ORDER BY measurement_type)
        INTO enum_values
        FROM physiological_measurement_types
        WHERE measurement_type IS NOT NULL;
        
        IF enum_values IS NOT NULL THEN
            sql_stmt := format('CREATE TYPE measurement_type_enum AS ENUM (%s)', enum_values);
            EXECUTE sql_stmt;
            RAISE NOTICE 'Created measurement_type_enum with values: %', enum_values;
        END IF;
    END IF;
END $$;

-- 3. 依存するビューとマテリアライズドビューを一時的に削除（依存関係を解除）
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 4. session_eventsテーブルのevent_type_idを直接ENUM型に変更する代わりに、
--    event_typesテーブル経由でENUM型を使用（外部キー制約を維持）
-- 注意: session_events.event_type_idはINTEGERのまま維持し、event_types.event_typeをENUM型に変更

-- 5. event_types.event_typeをENUM型に変更
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_types' 
        AND column_name = 'event_type'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE event_types 
            ALTER COLUMN event_type TYPE event_type_enum 
            USING event_type::event_type_enum;
        RAISE NOTICE 'Converted event_types.event_type to event_type_enum';
    END IF;
END $$;

-- 6. physiological_measurement_types.measurement_typeをENUM型に変更
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'physiological_measurement_types' 
        AND column_name = 'measurement_type'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE physiological_measurement_types 
            ALTER COLUMN measurement_type TYPE measurement_type_enum 
            USING measurement_type::measurement_type_enum;
        RAISE NOTICE 'Converted physiological_measurement_types.measurement_type to measurement_type_enum';
    END IF;
END $$;

-- 7. インデックスの再作成（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_event_types_event_type 
    ON event_types(event_type);

CREATE INDEX IF NOT EXISTS idx_physiological_measurement_types_measurement_type 
    ON physiological_measurement_types(measurement_type);

