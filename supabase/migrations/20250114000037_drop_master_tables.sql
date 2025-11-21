-- Merkle DAG: drop_master_tables -> remove_unused_tables
-- マスターテーブルを削除（ENUM型に移行済みのため不要）

-- 1. マスターテーブルを削除
DROP TABLE IF EXISTS emotion_names CASCADE;
DROP TABLE IF EXISTS event_types CASCADE;
DROP TABLE IF EXISTS physiological_measurement_types CASCADE;

-- 2. コメント追加（削除理由を記録）
COMMENT ON TYPE emotion_name_enum IS 'Emotion name enum (82 Hume AI emotion types). Replaces emotion_names table.';
COMMENT ON TYPE session_event_type_enum IS 'Session event type enum (17 event types). Replaces event_types table.';
COMMENT ON TYPE measurement_type_enum IS 'Physiological measurement type enum. Replaces physiological_measurement_types table.';
COMMENT ON TYPE emotion_color_enum IS 'Emotion color enum (32 HEX color codes). Replaces emotion_names.color column.';
COMMENT ON TYPE measurement_unit_enum IS 'Measurement unit enum. Replaces physiological_measurement_types.unit column.';

