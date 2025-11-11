-- Merkle DAG: timeseries_aggregates -> timeline_word_aggregates
-- TimescaleDB Continuous Aggregate による効率化
-- 単語別・感情別の集約を事前計算してクライアント側の処理を削減

-- 前提条件チェック: timeline_pointsテーブルが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timeline_points') THEN
    RAISE EXCEPTION 'timeline_points table does not exist. Please run migration 20250111000002_create_timeseries_tables.sql first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    RAISE EXCEPTION 'TimescaleDB extension is not installed. Please install TimescaleDB first.';
  END IF;
END $$;

-- 1. 単語別集約ビュー（セッション単位）
-- 用途: 距離タブのノード指標計算を事前集約
-- 注意: Continuous Aggregateにはtime_bucketが必要なため、1分単位でバケット化
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_aggregates_by_session
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 minute', time) as bucket,
  participant_id,
  session_id,
  word,
  -- 基本統計
  COUNT(*) as count,
  AVG(reaction_value) as avg_reaction_value,
  SUM(reaction_value) as sum_reaction_value,
  AVG(reaction_time) as avg_reaction_time,
  SUM(reaction_time) as sum_reaction_time,
  -- 生理データ統計
  AVG((physiological->>'average')::double precision) as avg_physiological,
  SUM(ABS((physiological->>'average')::double precision)) as sum_phys_abs,
  -- 時系列データ（配列として保存）- 統計計算用
  array_agg((physiological->>'average')::double precision ORDER BY time) FILTER (WHERE physiological->>'average' IS NOT NULL) as phys_series,
  array_agg(reaction_time ORDER BY time) FILTER (WHERE reaction_time IS NOT NULL) as rt_series,
  array_agg(reaction_value ORDER BY time) FILTER (WHERE reaction_value IS NOT NULL) as rv_series,
  -- メタデータ
  MIN(time) as first_time,
  MAX(time) as last_time
FROM timeline_points
WHERE word IS NOT NULL
GROUP BY bucket, participant_id, session_id, word;

-- 2. 感情ベクトル集約ビュー（単語別・セッション別）
-- 用途: 感情ベクトルの集約と正規化を事前計算
-- 注意: Continuous Aggregateにはtime_bucketが必要なため、1分単位でバケット化
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_emotion_vectors_by_word
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 minute', time) as bucket,
  participant_id,
  session_id,
  word,
  -- 感情別集約（10次元ベクトル）
  -- joy, sadness, anger, fear, surprise, disgust, calm, focus, excitement, confusion
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'joy') as joy_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'sadness') as sadness_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'anger') as anger_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'fear') as fear_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'surprise') as surprise_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'disgust') as disgust_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'calm') as calm_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'focus') as focus_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'excitement') as excitement_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'confusion') as confusion_sum,
  -- 感情エントリ数
  COUNT(*) FILTER (WHERE jsonb_array_length(emotions) > 0) as emotion_entry_count,
  -- モダリティ別集約（fileType別）- 簡略化版（ネストした集約を避ける）
  NULL::jsonb as emotion_by_modality
FROM timeline_points
WHERE word IS NOT NULL AND jsonb_array_length(emotions) > 0
GROUP BY bucket, participant_id, session_id, word;

-- 3. 統計値事前計算ビュー（分散・標準偏差含む）
-- 用途: 統計計算を事前実行してクライアント側の処理を削減
-- 注意: Continuous Aggregateにはtime_bucketが必要なため、1分単位でバケット化
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_statistics_by_session
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 minute', time) as bucket,
  participant_id,
  session_id,
  word,
  -- 基本統計
  COUNT(*) as count,
  AVG(reaction_time) as avg_reaction_time,
  STDDEV(reaction_time) as std_reaction_time,
  VARIANCE(reaction_time) as var_reaction_time,
  AVG(reaction_value) as avg_reaction_value,
  STDDEV(reaction_value) as std_reaction_value,
  VARIANCE(reaction_value) as var_reaction_value,
  -- 生理データ統計
  AVG((physiological->>'average')::double precision) as avg_physiological,
  STDDEV((physiological->>'average')::double precision) as std_physiological,
  VARIANCE((physiological->>'average')::double precision) as var_physiological,
  -- 速度指標（事前計算）
  1.0 / NULLIF(AVG(reaction_time), 0) as speed_index,
  -- 時系列データ（配列）- クライアント側での追加統計計算用
  array_agg((physiological->>'average')::double precision ORDER BY time) FILTER (WHERE physiological->>'average' IS NOT NULL) as phys_series,
  array_agg(reaction_time ORDER BY time) FILTER (WHERE reaction_time IS NOT NULL) as rt_series
FROM timeline_points
WHERE word IS NOT NULL
GROUP BY bucket, participant_id, session_id, word;

-- インデックス作成（クエリパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_word_aggregates_participant_session
ON timeline_word_aggregates_by_session (participant_id, session_id, word);

CREATE INDEX IF NOT EXISTS idx_emotion_vectors_participant_session
ON timeline_emotion_vectors_by_word (participant_id, session_id, word);

CREATE INDEX IF NOT EXISTS idx_word_statistics_participant_session
ON timeline_word_statistics_by_session (participant_id, session_id, word);

-- Continuous Aggregate のリフレッシュポリシー設定
-- 1分ごとに自動リフレッシュ（最新データを反映）
-- 注意: テーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_word_aggregates_by_session') THEN
    PERFORM add_continuous_aggregate_policy('timeline_word_aggregates_by_session',
      start_offset => INTERVAL '1 hour',
      end_offset => INTERVAL '1 minute',
      schedule_interval => INTERVAL '1 minute',
      if_not_exists => TRUE
    );
  END IF;

  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_emotion_vectors_by_word') THEN
    PERFORM add_continuous_aggregate_policy('timeline_emotion_vectors_by_word',
      start_offset => INTERVAL '1 hour',
      end_offset => INTERVAL '1 minute',
      schedule_interval => INTERVAL '1 minute',
      if_not_exists => TRUE
    );
  END IF;

  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_word_statistics_by_session') THEN
    PERFORM add_continuous_aggregate_policy('timeline_word_statistics_by_session',
      start_offset => INTERVAL '1 hour',
      end_offset => INTERVAL '1 minute',
      schedule_interval => INTERVAL '1 minute',
      if_not_exists => TRUE
    );
  END IF;
END $$;

-- 既存データの初期バックフィル（過去データを集約）
-- 注意: テーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_word_aggregates_by_session') THEN
    CALL refresh_continuous_aggregate('timeline_word_aggregates_by_session', NULL, NULL);
  END IF;

  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_emotion_vectors_by_word') THEN
    CALL refresh_continuous_aggregate('timeline_emotion_vectors_by_word', NULL, NULL);
  END IF;

  IF EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'timeline_word_statistics_by_session') THEN
    CALL refresh_continuous_aggregate('timeline_word_statistics_by_session', NULL, NULL);
  END IF;
END $$;

