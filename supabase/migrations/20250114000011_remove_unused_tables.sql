-- Merkle DAG: cleanup_unused_tables -> remove_zero_row_tables
-- 0件で使用されていないテーブルを削除

-- 注意: 外部キー制約の順序を考慮して削除

-- 1. 分析関連テーブル（0件、非推奨）
-- analysis_cache -> analysis_jobs に依存
DROP TABLE IF EXISTS analysis_cache CASCADE;

-- analysis_job_dependencies -> analysis_jobs に依存
DROP TABLE IF EXISTS analysis_job_dependencies CASCADE;

-- analysis_jobs -> participant_response_data, analysis_runs に依存
DROP TABLE IF EXISTS analysis_jobs CASCADE;

-- analysis_results -> participant_response_data, analysis_runs に依存（非推奨）
DROP TABLE IF EXISTS analysis_results CASCADE;

-- analysis_runs（非推奨）
DROP TABLE IF EXISTS analysis_runs CASCADE;

-- 2. 参加者関連テーブル（0件）
-- participant_analysis_results -> word_stimuli に依存
DROP TABLE IF EXISTS participant_analysis_results CASCADE;

-- participant_response_data -> word_stimuli に依存
DROP TABLE IF EXISTS participant_response_data CASCADE;

-- participant_consents -> consent_agreements に依存
DROP TABLE IF EXISTS participant_consents CASCADE;

-- consent_agreements -> agreement_types, participant_consents に依存
DROP TABLE IF EXISTS consent_agreements CASCADE;

-- agreement_types
DROP TABLE IF EXISTS agreement_types CASCADE;

-- 3. 単語刺激テーブル（0件）
-- word_stimuli -> participant_analysis_results, participant_response_data, session_events に参照される
-- session_events.word_id は NULL 許容なので、word_stimuli を削除可能
-- ただし、session_events.word_id の外部キー制約を先に削除
ALTER TABLE session_events DROP CONSTRAINT IF EXISTS session_events_word_id_fkey;
DROP TABLE IF EXISTS word_stimuli CASCADE;

-- 4. Prosody特徴テーブル（0件）
-- prosody_features -> prosody_feature_types に依存
DROP TABLE IF EXISTS prosody_features CASCADE;

-- prosody_feature_types
DROP TABLE IF EXISTS prosody_feature_types CASCADE;

-- 5. 感情データ関連テーブル（0件だが、将来使用される可能性があるためコメントアウト）
-- 注意: これらのテーブルは将来使用される可能性があるため、削除しない
-- action_unit_scores -> face_emotion_data に依存（将来使用される可能性あり）
-- toxicity_scores -> language_emotion_data に依存（将来使用される可能性あり）
-- vocal_type_entries -> burst_emotion_data に依存（将来使用される可能性あり）

-- コメント: これらのテーブルは0件だが、将来のデータインポートで使用される可能性があるため保持
-- DROP TABLE IF EXISTS action_unit_scores CASCADE;
-- DROP TABLE IF EXISTS toxicity_scores CASCADE;
-- DROP TABLE IF EXISTS vocal_type_entries CASCADE;

-- 6. 使用されていないビューの削除
-- lfs_objects ビューは Supabase の内部ビューなので削除しない
-- participant_detail ビューは削除済み（20250114000007_update_views.sql で再作成）

-- 7. マテリアライズドビューの確認と削除（存在しない場合はスキップ）
-- 注意: GraphQLリゾルバで参照されているが、実際には存在しない
-- これらのビューが存在する場合は削除
DROP MATERIALIZED VIEW IF EXISTS timeline_word_aggregates_by_session CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP MATERIALIZED VIEW IF EXISTS timeline_word_statistics_by_session CASCADE;

-- 8. 未使用インデックスの削除（自動的に削除されるが、明示的に削除）
-- 注意: テーブルを削除すると、関連するインデックスも自動的に削除される

