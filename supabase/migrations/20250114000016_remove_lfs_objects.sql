-- Merkle DAG: cleanup_storage -> remove_lfs_objects
-- lfs_objectsビューを削除（使用されていないSupabase内部ビュー）

-- lfs_objectsビューを削除（storageスキーマ内）
DROP VIEW IF EXISTS storage.lfs_objects CASCADE;

