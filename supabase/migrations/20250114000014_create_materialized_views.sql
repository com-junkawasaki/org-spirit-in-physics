-- Merkle DAG: materialized_views -> optimized_aggregates
-- 正規化テーブルベースのマテリアライズドビューを作成

-- 既存のマテリアライズドビューを削除（TimescaleDB前提のもの）
DROP MATERIALIZED VIEW IF EXISTS timeline_word_aggregates_by_session CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_word_statistics_by_session CASCADE;

-- 1. 単語別集約ビュー（セッション単位）
-- 用途: 距離タブのノード指標計算を事前集約
CREATE MATERIALIZED VIEW timeline_word_aggregates_by_session AS
SELECT 
  tp.participant_id,
  tp.session_id,
  tp.word,
  -- 基本統計
  COUNT(*)::bigint as count,
  AVG(tp.reaction_value) as avg_reaction_value,
  SUM(tp.reaction_value) as sum_reaction_value,
  AVG(tp.reaction_time) as avg_reaction_time,
  SUM(tp.reaction_time) as sum_reaction_time,
  -- 生理データ統計（JOINで効率化）
  AVG(pm_agg.avg_value) as avg_physiological,
  SUM(ABS(pm_agg.avg_value)) as sum_phys_abs,
  -- 時系列データ
  ARRAY_AGG(tp.reaction_value ORDER BY tp.time) FILTER (WHERE tp.reaction_value IS NOT NULL) as rv_series,
  ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series,
  ARRAY_AGG(pm_agg.avg_value ORDER BY tp.time) FILTER (WHERE pm_agg.avg_value IS NOT NULL) as phys_series,
  -- メタデータ
  MIN(tp.time) as first_time,
  MAX(tp.time) as last_time
FROM timeline_points tp
LEFT JOIN (
  SELECT 
    timeline_point_time,
    timeline_point_participant_id,
    timeline_point_session_id,
    AVG(value) as avg_value
  FROM physiological_measurements
  GROUP BY timeline_point_time, timeline_point_participant_id, timeline_point_session_id
) pm_agg ON 
  pm_agg.timeline_point_time = tp.time AND
  pm_agg.timeline_point_participant_id = tp.participant_id AND
  pm_agg.timeline_point_session_id = tp.session_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

-- 2. 感情ベクトル集約ビュー（単語別・セッション別）
-- 用途: 感情ベクトルの集約と正規化を事前計算
CREATE MATERIALIZED VIEW timeline_emotion_vectors_by_word AS
SELECT 
  tp.participant_id,
  tp.session_id,
  tp.word,
  -- 感情別集約（正規化テーブルから、大文字小文字を正規化）
  SUM(CASE WHEN LOWER(en.name) IN ('joy', 'happiness') THEN tee.score ELSE 0 END) as joy_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('sadness', 'sad') THEN tee.score ELSE 0 END) as sadness_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('anger', 'angry') THEN tee.score ELSE 0 END) as anger_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('fear', 'anxiety') THEN tee.score ELSE 0 END) as fear_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('surprise', 'surprised') THEN tee.score ELSE 0 END) as surprise_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('disgust', 'disgusted') THEN tee.score ELSE 0 END) as disgust_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('calm', 'calmness') THEN tee.score ELSE 0 END) as calm_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('focus', 'concentration') THEN tee.score ELSE 0 END) as focus_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('excitement', 'excited') THEN tee.score ELSE 0 END) as excitement_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('confusion', 'confused') THEN tee.score ELSE 0 END) as confusion_sum,
  -- 感情エントリ数
  COUNT(tee.id)::bigint as emotion_entry_count,
  -- モダリティ別集約（サブクエリで事前集約）
  COALESCE(
    (SELECT json_object_agg(file_type, total_score)
     FROM (
       SELECT 
         tee2.file_type,
         SUM(tee2.score) as total_score
       FROM timeline_emotion_entries tee2
       WHERE tee2.timeline_point_participant_id = tp.participant_id
       AND tee2.timeline_point_session_id = tp.session_id
       AND EXISTS (
         SELECT 1 FROM timeline_points tp2
         WHERE tp2.participant_id = tee2.timeline_point_participant_id
         AND tp2.session_id = tee2.timeline_point_session_id
         AND tp2.time = tee2.timeline_point_time
         AND tp2.word = tp.word
       )
       GROUP BY tee2.file_type
     ) subq),
    '{}'::json
  ) as emotion_by_modality
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON 
  tee.timeline_point_time = tp.time AND
  tee.timeline_point_participant_id = tp.participant_id AND
  tee.timeline_point_session_id = tp.session_id
LEFT JOIN emotion_names en ON en.id = tee.emotion_name_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

-- 3. 統計値事前計算ビュー（分散・標準偏差含む）
-- 用途: 統計計算を事前実行してクライアント側の処理を削減
CREATE MATERIALIZED VIEW timeline_word_statistics_by_session AS
SELECT 
  tp.participant_id,
  tp.session_id,
  tp.word,
  -- 基本統計
  COUNT(*)::bigint as count,
  AVG(tp.reaction_time) as avg_reaction_time,
  STDDEV(tp.reaction_time) as std_reaction_time,
  VARIANCE(tp.reaction_time) as var_reaction_time,
  AVG(tp.reaction_value) as avg_reaction_value,
  STDDEV(tp.reaction_value) as std_reaction_value,
  VARIANCE(tp.reaction_value) as var_reaction_value,
  -- 生理データ統計（JOINで効率化）
  AVG(pm_agg.avg_value) as avg_physiological,
  STDDEV(pm_agg.avg_value) as std_physiological,
  VARIANCE(pm_agg.avg_value) as var_physiological,
  -- 速度指標（事前計算）
  CASE 
    WHEN AVG(tp.reaction_time) > 0 THEN 1.0 / AVG(tp.reaction_time)
    ELSE NULL
  END as speed_index,
  -- 時系列データ
  ARRAY_AGG(pm_agg.avg_value ORDER BY tp.time) FILTER (WHERE pm_agg.avg_value IS NOT NULL) as phys_series,
  ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series
FROM timeline_points tp
LEFT JOIN (
  SELECT 
    timeline_point_time,
    timeline_point_participant_id,
    timeline_point_session_id,
    AVG(value) as avg_value
  FROM physiological_measurements
  GROUP BY timeline_point_time, timeline_point_participant_id, timeline_point_session_id
) pm_agg ON 
  pm_agg.timeline_point_time = tp.time AND
  pm_agg.timeline_point_participant_id = tp.participant_id AND
  pm_agg.timeline_point_session_id = tp.session_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

-- インデックス作成（クエリパフォーマンス向上）
CREATE UNIQUE INDEX idx_word_aggregates_pk
ON timeline_word_aggregates_by_session (participant_id, session_id, word);

CREATE INDEX idx_word_aggregates_participant_session
ON timeline_word_aggregates_by_session (participant_id, session_id);

CREATE UNIQUE INDEX idx_emotion_vectors_pk
ON timeline_emotion_vectors_by_word (participant_id, session_id, word);

CREATE INDEX idx_emotion_vectors_participant_session
ON timeline_emotion_vectors_by_word (participant_id, session_id);

CREATE UNIQUE INDEX idx_word_statistics_pk
ON timeline_word_statistics_by_session (participant_id, session_id, word);

CREATE INDEX idx_word_statistics_participant_session
ON timeline_word_statistics_by_session (participant_id, session_id);

