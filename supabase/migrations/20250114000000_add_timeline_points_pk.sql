-- Merkle DAG: timeline_points_pk -> add_primary_key
-- timeline_pointsテーブルに主キーを追加（正規化テーブルの外部キー参照のため）

-- timeline_pointsに主キーを追加（time, participant_id, session_idの組み合わせ）
-- 既存のデータがあるため、重複がないことを確認してから追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'timeline_points_pkey' 
    AND conrelid = 'timeline_points'::regclass
  ) THEN
    -- 重複チェック
    IF EXISTS (
      SELECT 1 FROM timeline_points 
      GROUP BY time, participant_id, session_id 
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Duplicate rows found in timeline_points. Cannot add primary key.';
    END IF;
    
    ALTER TABLE timeline_points 
    ADD CONSTRAINT timeline_points_pkey PRIMARY KEY (time, participant_id, session_id);
  END IF;
END $$;

