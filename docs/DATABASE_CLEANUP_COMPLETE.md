# データベースクリーンアップ完了報告

## 実施日
2025年1月14日

## 実施内容

### 削除されたテーブル ✅

以下の0件で使用されていないテーブルを削除しました：

1. **分析関連テーブル（非推奨）**
   - `analysis_cache` - 0件
   - `analysis_job_dependencies` - 0件
   - `analysis_jobs` - 0件
   - `analysis_results` - 0件（非推奨）
   - `analysis_runs` - 0件（非推奨）

2. **参加者関連テーブル（0件）**
   - `participant_analysis_results` - 0件
   - `participant_response_data` - 0件
   - `participant_consents` - 0件
   - `consent_agreements` - 0件
   - `agreement_types` - 0件

3. **単語刺激テーブル（0件）**
   - `word_stimuli` - 0件（`session_events.word_id`の外部キー制約を削除してから削除）

4. **Prosody特徴テーブル（0件）**
   - `prosody_features` - 0件
   - `prosody_feature_types` - 0件

### 保持されたテーブル（将来使用される可能性があるため）

以下のテーブルは0件ですが、将来のデータインポートで使用される可能性があるため保持しました：

- `action_unit_scores` - 0件（`face_emotion_data`に依存、将来使用される可能性あり）
- `toxicity_scores` - 0件（`language_emotion_data`に依存、将来使用される可能性あり）
- `vocal_type_entries` - 0件（`burst_emotion_data`に依存、将来使用される可能性あり）

### 削除されたビュー

以下のビューは削除されたテーブルに依存していたため削除され、再作成されました：

- `participant_summary` - 再作成（`participant_analysis_results`への参照を削除）
- `session_detail` - 再作成
- `analysis_result_detail` - 削除（`participant_analysis_results`テーブルが削除されたため）

### GraphQLリゾルバの修正 ✅

マテリアライズドビューが存在しないため、以下のリゾルバを直接テーブルから集約するように修正しました：

1. **`word_aggregates`**
   - `timeline_word_aggregates_by_session` → `timeline_points`から直接集約

2. **`emotion_vectors`**
   - `timeline_emotion_vectors_by_word` → `timeline_emotion_entries`から直接集約

3. **`word_statistics`**
   - `timeline_word_statistics_by_session` → `timeline_points`から直接集約

## 削除後のテーブル一覧

現在のデータベースには以下の20テーブルが存在します：

1. `action_unit_scores`
2. `burst_emotion_data`
3. `burst_emotion_scores`
4. `emotion_names`
5. `event_types`
6. `face_emotion_data`
7. `face_emotion_scores`
8. `language_emotion_data`
9. `language_emotion_scores`
10. `participants`
11. `physiological_measurement_types`
12. `physiological_measurements`
13. `prosody_emotion_data`
14. `prosody_emotion_scores`
15. `session_events`
16. `sessions`
17. `timeline_emotion_entries`
18. `timeline_points`
19. `toxicity_scores`
20. `vocal_type_entries`

## 削除されたビュー

- `analysis_result_detail` - `participant_analysis_results`テーブルが削除されたため

## 再作成されたビュー

- `participant_summary` - `participant_analysis_results`への参照を削除して再作成
- `session_detail` - 再作成

## 変更されたファイル

### マイグレーション
- `supabase/migrations/20250114000011_remove_unused_tables.sql` - 不要なテーブルの削除
- `supabase/migrations/20250114000012_recreate_views.sql` - ビューの再作成

### GraphQLサービス
- `performers/services/graphql/src/resolvers/timeline.rs` - マテリアライズドビュー参照を直接テーブル集約に変更

## 影響

- **削除されたテーブル**: 13テーブル
- **削除されたビュー**: 1ビュー（`analysis_result_detail`）
- **再作成されたビュー**: 2ビュー（`participant_summary`, `session_detail`）
- **修正されたGraphQLリゾルバ**: 3リゾルバ（`word_aggregates`, `emotion_vectors`, `word_statistics`）

## 完了日時

2025年1月14日

