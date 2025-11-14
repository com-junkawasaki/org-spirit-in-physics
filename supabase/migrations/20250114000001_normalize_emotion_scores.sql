-- Merkle DAG: timeline_points_pk -> add_primary_key
-- timeline_pointsテーブルに主キーを追加（正規化テーブルの外部キー参照のため）

-- timeline_pointsに主キーを追加（time, participant_id, session_idの組み合わせ）
-- 既存のデータがあるため、まずUNIQUE制約を追加
ALTER TABLE timeline_points 
ADD CONSTRAINT timeline_points_pkey PRIMARY KEY (time, participant_id, session_id);

