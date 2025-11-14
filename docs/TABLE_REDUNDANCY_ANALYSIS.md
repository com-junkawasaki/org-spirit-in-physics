# テーブル設計冗長性分析レポート

## 概要

PostgreSQLスキーマのマイグレーションファイルとコードベースを分析し、テーブル設計における冗長性を特定しました。本レポートでは、重複テーブル、未使用テーブル、重複インデックス、正規化不足の問題を詳細に記述します。

## 調査方法

1. **マイグレーションファイル分析**: `supabase/migrations/` 配下の全マイグレーションファイルを分析
2. **コードベース分析**: GraphQL resolver、import service、ビューでのテーブル使用状況を確認
3. **外部キー制約分析**: テーブル間の依存関係を確認

## 1. セッションテーブルの重複

### 問題

以下の2つのテーブルが同じ目的で存在しています：

- **`participant_experiment_sessions`** (20241004000001_initial_schema.sql)
  - カラム: `id`, `participant_id`, `session_id`, `session_type`, `start_time`, `end_time`
  - 外部キー: `participant_id` → `participants(id)`
  
- **`sessions`** (20250111000002_create_timeseries_tables.sql)
  - カラム: `id`, `participant_id`, `session_index`, `start_ts`, `end_ts`, `events`
  - 外部キー: `participant_id` → `participants(id)`

### 現状

- **使用状況**:
  - `sessions`: GraphQL resolver (`performers/services/graphql/src/resolvers/timeline.rs`) と import service (`performers/services/import/app/routers/sessions.py`) で使用
  - `participant_experiment_sessions`: ビュー (`participant_summary`, `participant_detail`, `session_detail`) と `participant_response_data` の外部キー参照として使用

- **リンク**: `sessions` テーブルに `experiment_session_id` カラムが追加され、`participant_experiment_sessions` への参照が設定されている (20250111000005_link_sessions_tables.sql)

### 影響

1. **データ整合性リスク**: 2つのテーブル間で同期が必要
2. **クエリの複雑化**: JOINが必要になり、パフォーマンスが低下
3. **ストレージの無駄**: 同じ情報が2つのテーブルに保存される可能性
4. **メンテナンス負荷**: データ更新時に2つのテーブルを更新する必要がある

### 推奨事項

`participant_experiment_sessions` を `sessions` に統合し、以下の手順を実行：

1. `participant_response_data.experiment_id` を `sessions.id` を参照するように変更
2. ビューを `sessions` テーブルを使用するように更新
3. `participant_experiment_sessions` テーブルを削除

## 2. 感情データテーブルの重複

### 問題

Hume AIの感情データを保存するテーブルが2セット存在します：

**旧テーブル** (20241004000008_add_hume_tables.sql):
- `participant_hume_analysis_jobs`
- `participant_hume_burst_predictions`
- `participant_hume_language_predictions`
- `participant_hume_prosody_predictions`

**新テーブル** (20250111000003_create_emotion_tables.sql):
- `burst_emotion_data`
- `face_emotion_data`
- `language_emotion_data`
- `prosody_emotion_data`

### 現状

- **使用状況**:
  - 旧テーブル (`participant_hume_*`): コードベースで使用されていない
  - 新テーブル (`*_emotion_data`): import service (`performers/services/import/app/routers/emotions.py`) で使用

- **参照関係**:
  - 旧テーブル: `participant_experiment_session_id` → `participant_experiment_sessions(id)`
  - 新テーブル: `session_id` → `sessions(id)`, `participant_id` → `participants(id)`

### 影響

1. **未使用テーブル**: 旧テーブルは定義されているが使用されていない
2. **データ移行の必要性**: 旧テーブルにデータが存在する場合、新テーブルへの移行が必要
3. **ストレージの無駄**: 未使用テーブルがストレージを占有

### 推奨事項

1. 旧テーブル (`participant_hume_*`) にデータが存在するか確認
2. データが存在する場合、新テーブル (`*_emotion_data`) へ移行
3. 旧テーブルを削除

## 3. 分析結果テーブルの重複

### 問題

分析結果を保存するテーブルが2つ存在します：

- **`analysis_results`** (20241004000004_analysis_schema.sql)
  - カラム: `id`, `run_id`, `response_id`, `p_value`, `word2vec_component`, `reaction_time_component`, `skin_potential_component`, `emotion_component`, `raw_inputs`
  - 外部キー: `run_id` → `analysis_runs(id)`, `response_id` → `participant_response_data(id)`
  
- **`participant_analysis_results`** (20241004000009_add_analysis_results.sql)
  - カラム: `id`, `participant_id`, `experiment_id`, `word_stimulus_id`, `stimulus_word`, `response_word`, `reaction_time_ms`, `spirit_probability`, `word2vec_component`, `reaction_time_component`, `skin_potential_component`, `emotion_component`, `emotion_data`, `physiological_data`
  - 外部キー: `participant_id` → `participants(id)`, `word_stimulus_id` → `word_stimuli(id)`

### 現状

- **使用状況**:
  - `analysis_results`: コードベースで使用されていない
  - `participant_analysis_results`: ビュー (`participant_summary`, `participant_detail`, `session_detail`, `analysis_result_detail`) で使用

### 影響

1. **データの重複保存リスク**: 同じ分析結果が2つのテーブルに保存される可能性
2. **クエリの複雑化**: どちらのテーブルを使用すべきか判断が必要
3. **ストレージの無駄**: 未使用テーブルがストレージを占有

### 推奨事項

1. `analysis_results` テーブルにデータが存在するか確認
2. データが存在する場合、`participant_analysis_results` へ移行
3. `analysis_results` テーブルを削除

## 4. 時系列データテーブルの重複

### 問題

時系列データを保存するテーブルが2セット存在します：

**旧テーブル** (20241004000004_analysis_schema.sql):
- `response_skin_potential_timeseries`
- `response_emotion_timeseries`

**新テーブル** (20250111000002_create_timeseries_tables.sql):
- `timeline_points` (TimescaleDBハイパーテーブル)

### 現状

- **使用状況**:
  - 旧テーブル: コードベースで使用されていない
  - 新テーブル (`timeline_points`): GraphQL resolver (`performers/services/graphql/src/resolvers/timeline.rs`) と import service (`performers/services/import/app/routers/timeline.py`) で使用

- **参照関係**:
  - 旧テーブル: `response_id` → `participant_response_data(id)`
  - 新テーブル: `session_id` → `sessions(id)`, `participant_id` → `participants(id)`

### 影響

1. **同じデータが異なる構造で保存される可能性**: 旧テーブルと新テーブルでデータ構造が異なる
2. **ストレージの無駄**: 未使用テーブルがストレージを占有
3. **データ整合性の問題**: 2つのテーブル間で同期が必要

### 推奨事項

1. 旧テーブル (`response_skin_potential_timeseries`, `response_emotion_timeseries`) にデータが存在するか確認
2. データが存在する場合、`timeline_points` へ移行
3. 旧テーブルを削除

## 5. インデックスの重複

### 問題

同じカラムに複数のインデックスが作成されている可能性があります。

### 特定された重複インデックス

#### 5.1 感情データテーブルのインデックス重複

**`burst_emotion_data` テーブル**:
- `idx_burst_emotion_session_time` (20250111000003_create_emotion_tables.sql)
  - カラム: `session_id, time DESC`
- `idx_burst_emotion_participant_session_time` (20250111000004_create_indexes.sql)
  - カラム: `participant_id, session_id, time DESC`

**問題**: `idx_burst_emotion_participant_session_time` は `idx_burst_emotion_session_time` を含んでいるため、後者は冗長です。

同様の問題が以下のテーブルでも発生：
- `face_emotion_data`
- `language_emotion_data`
- `prosody_emotion_data`

#### 5.2 タイムラインポイントテーブルのインデックス重複

**`timeline_points` テーブル**:
- `idx_timeline_points_participant_time` (20250111000002_create_timeseries_tables.sql)
  - カラム: `participant_id, time DESC`
- `idx_timeline_points_session_time` (20250111000002_create_timeseries_tables.sql)
  - カラム: `session_id, time DESC`
- `idx_timeline_points_participant_session_time` (20250111000004_create_indexes.sql)
  - カラム: `participant_id, session_id, time DESC`

**問題**: `idx_timeline_points_participant_session_time` は他の2つのインデックスを包含しているため、単一のインデックスで十分です。

### 影響

1. **書き込みパフォーマンスの低下**: インデックスが多いほど、INSERT/UPDATE/DELETEのパフォーマンスが低下
2. **ストレージの無駄**: 冗長なインデックスがストレージを占有
3. **クエリプランナーの混乱**: 複数のインデックスから選択する必要があり、最適なインデックスが選択されない可能性

### 推奨事項

1. 包含関係にあるインデックスを削除
2. 複合インデックス (`participant_id, session_id, time`) を優先的に使用
3. 単一カラムのインデックスは、クエリパターンに応じて必要最小限に

## 6. 正規化不足

### 問題

`participant_response_data` テーブルに以下のカラムが存在しますが、これらは他のテーブルに正規化すべきです：

- `skin_potential DECIMAL(10,4)`: `response_skin_potential_timeseries` または `timeline_points` に移動すべき
- `emotion TEXT`, `emotion_confidence DECIMAL(5,4)`: `response_emotion_timeseries` または `timeline_points` に移動すべき

### 現状

- `participant_response_data` テーブルは基本的な応答データ（単語、反応時間など）を保存
- 時系列データ（皮膚電位、感情）は別テーブルに保存されているが、`participant_response_data` にも一部のデータが保存されている

### 影響

1. **データの重複**: 同じ情報が複数のテーブルに保存される可能性
2. **更新の複雑化**: データ更新時に複数のテーブルを更新する必要がある
3. **整合性の問題**: テーブル間でデータが一致しない可能性

### 推奨事項

1. `participant_response_data` から `skin_potential`, `emotion`, `emotion_confidence` カラムを削除
2. これらのデータは `timeline_points` テーブルで管理

## 7. 未使用テーブル

### 特定された未使用テーブル

以下のテーブルは定義されていますが、コードベースで使用されていません：

1. **`participant_hume_analysis_jobs`**: import serviceは `*_emotion_data` テーブルを使用
2. **`participant_hume_burst_predictions`**: 同上
3. **`participant_hume_language_predictions`**: 同上
4. **`participant_hume_prosody_predictions`**: 同上
5. **`analysis_results`**: ビューは `participant_analysis_results` を使用
6. **`response_skin_potential_timeseries`**: import serviceは `timeline_points` を使用
7. **`response_emotion_timeseries`**: 同上

### 推奨事項

1. 各テーブルにデータが存在するか確認
2. データが存在しない場合、テーブルを削除
3. データが存在する場合、新テーブルへ移行後に削除

## 8. ビューの依存関係

### 問題

以下のビューが `participant_experiment_sessions` テーブルに依存しています：

- `participant_summary`
- `participant_detail`
- `session_detail`

### 影響

`participant_experiment_sessions` を `sessions` に統合する場合、これらのビューを更新する必要があります。

### 推奨事項

1. ビューを `sessions` テーブルを使用するように更新
2. `participant_experiment_sessions` への参照を `sessions` への参照に変更

## まとめ

### 優先度別の推奨事項

#### 高優先度

1. **セッションテーブルの統合**: `participant_experiment_sessions` → `sessions`
2. **未使用テーブルの削除**: `participant_hume_*`, `analysis_results`, `response_*_timeseries`
3. **インデックスの整理**: 重複インデックスの削除

#### 中優先度

1. **ビューの更新**: `participant_experiment_sessions` 依存のビューを `sessions` に更新
2. **正規化の実施**: `participant_response_data` から時系列データカラムを削除

#### 低優先度

1. **データ移行**: 旧テーブルから新テーブルへのデータ移行（データが存在する場合）

### 期待される効果

1. **ストレージ削減**: 未使用テーブルと重複インデックスの削除により、ストレージ使用量を削減
2. **パフォーマンス向上**: インデックスの整理により、書き込みパフォーマンスが向上
3. **メンテナンス性向上**: テーブル構造の簡素化により、メンテナンスが容易になる
4. **データ整合性向上**: 重複テーブルの統合により、データ整合性が向上

## マイグレーション計画

### フェーズ1: データ確認と準備

#### 1.1 データ存在確認クエリ

```sql
-- セッションテーブルのデータ確認
SELECT 
  'participant_experiment_sessions' as table_name,
  COUNT(*) as row_count
FROM participant_experiment_sessions
UNION ALL
SELECT 
  'sessions' as table_name,
  COUNT(*) as row_count
FROM sessions;

-- 感情データテーブルのデータ確認
SELECT 
  'participant_hume_analysis_jobs' as table_name,
  COUNT(*) as row_count
FROM participant_hume_analysis_jobs
UNION ALL
SELECT 
  'burst_emotion_data' as table_name,
  COUNT(*) as row_count
FROM burst_emotion_data;

-- 分析結果テーブルのデータ確認
SELECT 
  'analysis_results' as table_name,
  COUNT(*) as row_count
FROM analysis_results
UNION ALL
SELECT 
  'participant_analysis_results' as table_name,
  COUNT(*) as row_count
FROM participant_analysis_results;

-- 時系列データテーブルのデータ確認
SELECT 
  'response_skin_potential_timeseries' as table_name,
  COUNT(*) as row_count
FROM response_skin_potential_timeseries
UNION ALL
SELECT 
  'response_emotion_timeseries' as table_name,
  COUNT(*) as row_count
FROM response_emotion_timeseries
UNION ALL
SELECT 
  'timeline_points' as table_name,
  COUNT(*) as row_count
FROM timeline_points;
```

#### 1.2 外部キー依存関係の確認

```sql
-- participant_experiment_sessionsを参照しているテーブルを確認
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'participant_experiment_sessions';
```

### フェーズ2: セッションテーブルの統合

#### 2.1 データ移行スクリプト

```sql
-- participant_experiment_sessions から sessions へのデータ移行
-- 注意: 既存のsessionsテーブルにデータが存在する場合は、事前に確認が必要

-- 1. sessionsテーブルにexperiment_session_idを設定（既存データがある場合）
UPDATE sessions s
SET experiment_session_id = pes.id
FROM participant_experiment_sessions pes
WHERE s.participant_id = pes.participant_id
  AND s.session_index = CASE 
    WHEN pes.session_type = 'session-1' THEN 0
    WHEN pes.session_type = 'session-2' THEN 1
    ELSE NULL
  END
  AND s.experiment_session_id IS NULL;

-- 2. participant_response_dataのexperiment_idをsessions.idに更新
UPDATE participant_response_data prd
SET experiment_id = s.id
FROM sessions s
WHERE prd.experiment_id = s.experiment_session_id
  AND s.experiment_session_id IS NOT NULL;
```

#### 2.2 ビューの更新

```sql
-- participant_summary ビューの更新
CREATE OR REPLACE VIEW participant_summary AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  -- Session statistics
  COUNT(DISTINCT s.id) as session_count,
  COUNT(prd.id) as total_responses,
  -- Analysis statistics
  AVG(par.spirit_probability) as average_spirit_probability,
  MAX(par.created_at) as last_analysis_date,
  MAX(to_timestamp(s.start_ts / 1000)) as last_activity,
  -- Latest session info
  (
    SELECT json_agg(
      json_build_object(
        'id', s2.id,
        'session_type', CASE WHEN s2.session_index = 0 THEN 'session-1' ELSE 'session-2' END,
        'start_time', to_timestamp(s2.start_ts / 1000),
        'end_time', CASE WHEN s2.end_ts IS NOT NULL THEN to_timestamp(s2.end_ts / 1000) ELSE NULL END,
        'response_count', (
          SELECT COUNT(*) FROM participant_response_data prd2
          WHERE prd2.participant_id = p.id
          AND prd2.experiment_id = s2.id
        )
      ) ORDER BY s2.start_ts DESC
    )
    FROM sessions s2
    WHERE s2.participant_id = p.id
  ) as sessions
FROM participants p
LEFT JOIN sessions s ON p.id = s.participant_id
LEFT JOIN participant_response_data prd ON p.id = prd.participant_id
LEFT JOIN participant_analysis_results par ON p.id = par.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- participant_detail ビューの更新（同様の変更を適用）
-- session_detail ビューの更新（同様の変更を適用）
-- analysis_result_detail ビューの更新（同様の変更を適用）
```

#### 2.3 テーブル削除

```sql
-- 外部キー制約を削除
ALTER TABLE participant_response_data DROP CONSTRAINT IF EXISTS participant_response_data_experiment_id_fkey;

-- participant_experiment_sessionsテーブルを削除
DROP TABLE IF EXISTS participant_experiment_sessions CASCADE;
```

### フェーズ3: 未使用テーブルの削除

#### 3.1 データ移行（必要に応じて）

```sql
-- participant_hume_* テーブルから *_emotion_data への移行
-- 注意: データ構造が異なるため、慎重に移行する必要がある

-- 例: participant_hume_burst_predictions → burst_emotion_data
INSERT INTO burst_emotion_data (
  time,
  session_id,
  participant_id,
  record_id,
  begin_time,
  end_time,
  emotion_scores,
  vocal_types,
  created_at
)
SELECT
  to_timestamp(pes.start_time) + (phbp.begin_time || ' seconds')::interval as time,
  s.id as session_id,
  pes.participant_id,
  phaj.id::text as record_id,
  phbp.begin_time,
  phbp.end_time,
  phbp.emotions as emotion_scores,
  phbp.expressions as vocal_types,
  phbp.created_at
FROM participant_hume_burst_predictions phbp
JOIN participant_hume_analysis_jobs phaj ON phbp.job_id = phaj.id
JOIN participant_experiment_sessions pes ON phaj.participant_experiment_session_id = pes.id
JOIN sessions s ON s.experiment_session_id = pes.id
ON CONFLICT DO NOTHING;
```

#### 3.2 テーブル削除

```sql
-- 未使用テーブルの削除
DROP TABLE IF EXISTS participant_hume_prosody_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_language_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_burst_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_analysis_jobs CASCADE;

DROP TABLE IF EXISTS analysis_results CASCADE;

DROP TABLE IF EXISTS response_emotion_timeseries CASCADE;
DROP TABLE IF EXISTS response_skin_potential_timeseries CASCADE;
```

### フェーズ4: インデックスの整理

#### 4.1 重複インデックスの削除

```sql
-- 感情データテーブルの重複インデックス削除
DROP INDEX IF EXISTS idx_burst_emotion_session_time;
DROP INDEX IF EXISTS idx_burst_emotion_participant_time;
DROP INDEX IF EXISTS idx_face_emotion_session_time;
DROP INDEX IF EXISTS idx_face_emotion_participant_time;
DROP INDEX IF EXISTS idx_language_emotion_session_time;
DROP INDEX IF EXISTS idx_language_emotion_participant_time;
DROP INDEX IF EXISTS idx_prosody_emotion_session_time;
DROP INDEX IF EXISTS idx_prosody_emotion_participant_time;

-- タイムラインポイントテーブルの重複インデックス削除
DROP INDEX IF EXISTS idx_timeline_points_participant_time;
DROP INDEX IF EXISTS idx_timeline_points_session_time;
-- idx_timeline_points_participant_session_time は保持
```

#### 4.2 最適化されたインデックスの確認

```sql
-- 残存するインデックスの確認
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'burst_emotion_data',
    'face_emotion_data',
    'language_emotion_data',
    'prosody_emotion_data',
    'timeline_points'
  )
ORDER BY tablename, indexname;
```

### フェーズ5: 正規化の実施

#### 5.1 participant_response_dataからのカラム削除

```sql
-- データの移行確認（必要に応じて）
SELECT 
  COUNT(*) as rows_with_skin_potential
FROM participant_response_data
WHERE skin_potential IS NOT NULL;

SELECT 
  COUNT(*) as rows_with_emotion
FROM participant_response_data
WHERE emotion IS NOT NULL;

-- カラムの削除
ALTER TABLE participant_response_data 
  DROP COLUMN IF EXISTS skin_potential,
  DROP COLUMN IF EXISTS emotion,
  DROP COLUMN IF EXISTS emotion_confidence;
```

## 実行順序と注意事項

### 実行順序

1. **フェーズ1**: データ確認と準備（必須）
2. **フェーズ2**: セッションテーブルの統合（高優先度）
3. **フェーズ4**: インデックスの整理（中優先度、フェーズ2の後）
4. **フェーズ3**: 未使用テーブルの削除（データ移行が必要な場合のみ）
5. **フェーズ5**: 正規化の実施（低優先度）

### 注意事項

1. **バックアップ**: マイグレーション実行前に必ずデータベースのバックアップを取得
2. **段階的実行**: 各フェーズを個別に実行し、問題がないことを確認してから次に進む
3. **ダウンタイム**: ビューの更新やテーブル削除は、アプリケーションのダウンタイムが必要な場合がある
4. **テスト環境**: 本番環境に適用する前に、テスト環境で十分にテストする
5. **ロールバック計画**: 各フェーズでロールバック計画を準備する

### ロールバック計画

各フェーズで以下のロールバック手順を準備：

1. **フェーズ2のロールバック**: `participant_experiment_sessions` テーブルを再作成し、データを復元
2. **フェーズ3のロールバック**: 削除したテーブルを再作成（スキーマのみ）
3. **フェーズ4のロールバック**: 削除したインデックスを再作成
4. **フェーズ5のロールバック**: 削除したカラムを再追加（データは復元不可）

## 次のステップ

1. 本レポートをレビューし、優先順位を決定
2. テスト環境でマイグレーションスクリプトを実行
3. パフォーマンステストを実施
4. 本番環境への適用計画を策定
5. 段階的に統合を実施

