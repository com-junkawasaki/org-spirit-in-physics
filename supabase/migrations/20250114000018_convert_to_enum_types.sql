-- Merkle DAG: enum_conversion -> convert_text_to_enum
-- TEXT型カラムをENUM型に変換

-- 1. 既存のevent_typesテーブルから値を取得してENUM型を動的に作成
DO $$
DECLARE
    enum_values TEXT;
    sql_stmt TEXT;
BEGIN
    -- 既存のevent_type値を取得してENUM型を作成
    SELECT string_agg(DISTINCT quote_literal(event_type), ', ' ORDER BY quote_literal(event_type))
    INTO enum_values
    FROM event_types;
    
    IF enum_values IS NOT NULL THEN
        -- 既存のENUM型を削除（存在する場合）
        DROP TYPE IF EXISTS event_type_enum CASCADE;
        
        -- 動的にENUM型を作成
        sql_stmt := format('CREATE TYPE event_type_enum AS ENUM (%s)', enum_values);
        EXECUTE sql_stmt;
    END IF;
END $$;

-- 2. 既存のagreement_typesテーブルから値を取得してENUM型を動的に作成
DO $$
DECLARE
    enum_values TEXT;
    sql_stmt TEXT;
BEGIN
    SELECT string_agg(DISTINCT quote_literal(agreement_type), ', ' ORDER BY quote_literal(agreement_type))
    INTO enum_values
    FROM agreement_types;
    
    IF enum_values IS NOT NULL THEN
        DROP TYPE IF EXISTS agreement_type_enum CASCADE;
        sql_stmt := format('CREATE TYPE agreement_type_enum AS ENUM (%s)', enum_values);
        EXECUTE sql_stmt;
    END IF;
END $$;

-- 3. 既存のphysiological_measurement_typesテーブルから値を取得してENUM型を動的に作成
DO $$
DECLARE
    enum_values TEXT;
    sql_stmt TEXT;
BEGIN
    SELECT string_agg(DISTINCT quote_literal(measurement_type), ', ' ORDER BY quote_literal(measurement_type))
    INTO enum_values
    FROM physiological_measurement_types;
    
    IF enum_values IS NOT NULL THEN
        DROP TYPE IF EXISTS measurement_type_enum CASCADE;
        sql_stmt := format('CREATE TYPE measurement_type_enum AS ENUM (%s)', enum_values);
        EXECUTE sql_stmt;
    END IF;
END $$;

-- 4. マテリアライズドビューとビューを一時的に削除（依存関係を解除）
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 5. timeline_emotion_entries.file_type をENUM型に変更
ALTER TABLE timeline_emotion_entries 
  ALTER COLUMN file_type TYPE emotion_file_type USING file_type::emotion_file_type;

-- 6. participants.handedness をENUM型に変更（既存の値をマッピング）
-- 注意: handednessが既にENUM型の場合はスキップ
DO $$
BEGIN
    -- カラムが存在し、TEXT型の場合のみ変換
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' 
        AND column_name = 'handedness' 
        AND data_type = 'text'
    ) THEN
        -- TEXT型からENUM型に変換
        ALTER TABLE participants 
          ALTER COLUMN handedness TYPE handedness_type 
          USING CASE 
            WHEN handedness IS NULL THEN NULL::handedness_type
            WHEN LOWER(handedness) IN ('left', 'l') THEN 'left'::handedness_type
            WHEN LOWER(handedness) IN ('right', 'r') THEN 'right'::handedness_type
            WHEN LOWER(handedness) IN ('ambidextrous', 'both', 'ambidexterity') THEN 'ambidextrous'::handedness_type
            ELSE 'unknown'::handedness_type
          END;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' 
        AND column_name = 'handedness' 
        AND data_type = 'USER-DEFINED'
        AND udt_name = 'handedness_type'
    ) THEN
        -- 既にENUM型の場合は何もしない
        RAISE NOTICE 'handedness is already ENUM type';
    END IF;
END $$;

-- 6-8. マスターテーブルのカラムはENUM型に変換しない
-- 理由: マスターテーブルは動的な値の追加に対応する必要があるため、
--       TEXT型のままにして、ENUM型は参照テーブルでのみ使用する
-- 注意: event_types, agreement_types, physiological_measurement_typesは
--       マスターテーブルとしてTEXT型のまま維持

-- 9. session_eventsテーブルのevent_type_idを直接ENUM型に変更する代わりに、
--    event_typesテーブル経由でENUM型を使用（外部キー制約を維持）

-- 10. consent_agreementsテーブルのagreement_type_idも同様にevent_types経由でENUM型を使用

-- 11. physiological_measurementsテーブルのmeasurement_type_idも同様にphysiological_measurement_types経由でENUM型を使用

-- インデックスの再作成（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_timeline_emotion_entries_file_type 
  ON timeline_emotion_entries(file_type);

CREATE INDEX IF NOT EXISTS idx_participants_handedness 
  ON participants(handedness);

