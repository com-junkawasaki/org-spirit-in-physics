-- Merkle DAG: refresh_functions -> materialized_view_refresh
-- マテリアライズドビューのリフレッシュ関数とスケジュール

-- リフレッシュ関数（CONCURRENTLYでロックを回避）
CREATE OR REPLACE FUNCTION refresh_timeline_materialized_views()
RETURNS void AS $$
BEGIN
  -- CONCURRENTLYリフレッシュにはUNIQUEインデックスが必要
  REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_aggregates_by_session;
  REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_emotion_vectors_by_word;
  REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_statistics_by_session;
END;
$$ LANGUAGE plpgsql;

-- インポート後の自動リフレッシュトリガー
-- 注意: パフォーマンスを考慮して、バッチ処理後に手動リフレッシュを推奨
CREATE OR REPLACE FUNCTION trigger_refresh_timeline_views()
RETURNS TRIGGER AS $$
BEGIN
  -- 非同期でリフレッシュ（パフォーマンス向上）
  -- 実際のリフレッシュは手動で実行することを推奨
  -- PERFORM pg_notify('refresh_timeline_views', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- timeline_pointsへの変更時に通知（実際のリフレッシュは手動）
CREATE TRIGGER refresh_timeline_views_trigger
AFTER INSERT OR UPDATE OR DELETE ON timeline_points
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_timeline_views();

-- timeline_emotion_entriesへの変更時もトリガー
CREATE TRIGGER refresh_timeline_views_emotion_trigger
AFTER INSERT OR UPDATE OR DELETE ON timeline_emotion_entries
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_timeline_views();

-- physiological_measurementsへの変更時もトリガー
CREATE TRIGGER refresh_timeline_views_physio_trigger
AFTER INSERT OR UPDATE OR DELETE ON physiological_measurements
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_timeline_views();

