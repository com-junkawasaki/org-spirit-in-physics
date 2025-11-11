-- Merkle DAG: sessions_tables_link -> participant_experiment_sessions_integration
-- sessionsテーブルとparticipant_experiment_sessionsテーブルの統合

-- sessionsテーブルにparticipant_experiment_sessionsへの外部キーを追加（オプション）
-- 既存のparticipant_experiment_sessionsとsessionsを関連付ける
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS experiment_session_id UUID REFERENCES participant_experiment_sessions(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sessions_experiment_session_id 
ON sessions (experiment_session_id);

-- participant_experiment_sessionsからsessionsへの参照を追加（双方向の関係を維持）
-- これは既存のデータとの互換性のため

