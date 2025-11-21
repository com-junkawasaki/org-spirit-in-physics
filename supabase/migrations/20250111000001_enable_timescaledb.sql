-- Merkle DAG: timescaledb_extension -> enable_timescaledb
-- TimescaleDB拡張機能を有効化
-- PostgreSQL 15を使用（PostgreSQL 17では非推奨）

-- TimescaleDB拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 拡張機能のバージョンを確認（デバッグ用）
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

