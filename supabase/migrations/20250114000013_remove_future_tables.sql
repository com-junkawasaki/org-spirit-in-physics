-- Merkle DAG: cleanup_future_tables -> remove_unused_future_tables
-- 将来用として保持していたが不要なテーブルを削除

-- action_unit_scores テーブルを削除
DROP TABLE IF EXISTS action_unit_scores CASCADE;

-- toxicity_scores テーブルを削除
DROP TABLE IF EXISTS toxicity_scores CASCADE;

-- vocal_type_entries テーブルを削除
DROP TABLE IF EXISTS vocal_type_entries CASCADE;

