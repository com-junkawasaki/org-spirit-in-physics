# テーブル設計冗長性調査レポート

## 調査日時
2025年11月14日

## 調査対象
- テーブル数: 23テーブル
- ビュー数: 5ビュー
- 合計: 28オブジェクト

## 発見された冗長性

### 1. セッションテーブルの重複 ⚠️ **重要**

#### 問題点
- **`sessions`テーブル**: 11件のデータ（TimescaleDB用、新規）
- **`participant_experiment_sessions`テーブル**: 0件のデータ（初期スキーマ、未使用）

#### 詳細
- `sessions`テーブルは`experiment_session_id`で`participant_experiment_sessions`を参照しているが、実際にはNULL
- `sessions`は以下のテーブルから参照されている（実際に使用中）:
  - `timeline_points` (2006件)
  - `burst_emotion_data` (531件)
  - `face_emotion_data`
  - `language_emotion_data`
  - `prosody_emotion_data`
- `participant_experiment_sessions`は以下のテーブルから参照されている:
  - `participant_hume_analysis_jobs` (0件)
  - `sessions` (experiment_session_id経由、NULL)

#### 構造の違い
- `sessions`: `start_ts` (BIGINT, Unix timestamp), `session_index` (INTEGER), `events` (JSONB)
- `participant_experiment_sessions`: `start_time` (TIMESTAMPTZ), `session_type` (ENUM), `session_id` (UUID)

#### 影響評価
- **高**: `participant_experiment_sessions`は未使用だが、ビュー（`participant_detail`, `session_detail`, `analysis_result_detail`）が参照している
- ビューが`participant_experiment_sessions`を参照しているため、ビューが機能しない可能性

#### 改善提案
1. **短期**: `participant_experiment_sessions`を`sessions`に統合するか、`sessions`から`participant_experiment_sessions`へのデータ移行
2. **長期**: ビューを`sessions`テーブルを参照するように更新

---

### 2. 分析結果テーブルの重複 ⚠️ **中程度**

#### 問題点
- **`analysis_results`テーブル**: 0件（分析パイプライン用）
- **`participant_analysis_results`テーブル**: 0件（詳細分析用）

#### 詳細
両テーブルとも現在データが0件だが、構造が異なる：

**`analysis_results`**:
- `run_id` (UUID) → `analysis_runs`を参照
- `response_id` (UUID) → `participant_response_data`を参照
- `p_value` (DOUBLE PRECISION) - 最終的な確率値

**`participant_analysis_results`**:
- `participant_id` (UUID) → `participants`を参照
- `experiment_id` (UUID) → `participant_experiment_sessions`を参照（未使用テーブル）
- `spirit_probability` (NUMERIC(5,4)) - スピリット確率
- `stimulus_word` と `word_stimulus_id` の両方を保持（正規化の問題）

#### 影響評価
- **中**: 現在データがないため影響なし。将来的に両方を使用する場合は重複の可能性

#### 改善提案
1. 用途を明確化し、1つのテーブルに統合するか、明確に分離する
2. `participant_analysis_results`の`experiment_id`を`sessions.id`に変更

---

### 3. 感情データテーブルの重複 ⚠️ **中程度**

#### 問題点
複数の感情データテーブルが存在するが、使用状況が異なる：

#### 使用中のテーブル
- **`face_emotion_data`**: 33,394件（TimescaleDB用、実際に使用中）
- **`language_emotion_data`**: 4,424件（TimescaleDB用、実際に使用中）
- **`prosody_emotion_data`**: 1,924件（TimescaleDB用、実際に使用中）
- **`burst_emotion_data`**: 531件（TimescaleDB用、実際に使用中）

#### 未使用のテーブル
- **`participant_hume_burst_predictions`**: 0件（Hume AI用）
- **`participant_hume_language_predictions`**: 0件（Hume AI用）
- **`participant_hume_prosody_predictions`**: 0件（Hume AI用）
- **`response_emotion_timeseries`**: 0件（時系列用）

#### 統合テーブル
- **`timeline_points.emotions`**: 2006件中1194件が非空（統合データ）

#### 構造の違い
- TimescaleDB用テーブル: `session_id` → `sessions`を参照、`time` (TIMESTAMPTZ)
- Hume AI用テーブル: `job_id` → `participant_hume_analysis_jobs`を参照、`begin_time`/`end_time` (DECIMAL)
- 時系列用テーブル: `response_id` → `participant_response_data`を参照（0件）

#### 影響評価
- **中**: 現在は`burst_emotion_data`のみ使用中。他のテーブルは将来の用途のために残されている可能性

#### 改善提案
1. 未使用テーブルを削除するか、使用予定を明確化
2. `timeline_points.emotions`との統合方法を検討

---

### 4. 時系列データの重複 ⚠️ **低**

#### 問題点
- **`response_skin_potential_timeseries`**: 0件（未使用）
- **`response_emotion_timeseries`**: 0件（未使用）
- **`timeline_points.physiological`**: 2006件すべてが非空（統合データ）
- **`timeline_points.emotions`**: 2006件中1194件が非空（統合データ）

#### 詳細
- `response_skin_potential_timeseries`と`response_emotion_timeseries`は`participant_response_data`を参照しているが、`participant_response_data`が0件のため未使用
- `timeline_points`が統合データとして機能している

#### 影響評価
- **低**: 現在は`timeline_points`が使用されており、他のテーブルは未使用

#### 改善提案
1. `response_skin_potential_timeseries`と`response_emotion_timeseries`を削除するか、使用予定を明確化
2. `timeline_points`が統合データとして機能していることを文書化

---

### 5. 正規化の問題 ⚠️ **低**

#### 問題点
- **`participant_response_data`**: `stimulus_word` (TEXT) と `word_stimulus_id` (INTEGER) の両方を保持
- **`participant_analysis_results`**: `stimulus_word` (TEXT) と `word_stimulus_id` (INTEGER) の両方を保持

#### 詳細
- `word_stimuli`テーブルに単語が正規化されているが、テーブルに`stimulus_word`も保持している
- 現在`participant_response_data`は0件のため影響なし
- 不一致は0件（データがないため確認不可）

#### 影響評価
- **低**: 現在データがないため影響なし。将来的にデータ整合性の問題が発生する可能性

#### 改善提案
1. `stimulus_word`を削除し、`word_stimulus_id`からJOINで取得する
2. または、`stimulus_word`を保持する場合は、トリガーで整合性を保証

---

### 6. ビューとテーブルの関係 ⚠️ **重要**

#### 問題点
以下のビューが`participant_experiment_sessions`（0件）を参照している：

- **`participant_detail`**: `participant_experiment_sessions`を参照
- **`session_detail`**: `participant_experiment_sessions`を参照
- **`analysis_result_detail`**: `participant_experiment_sessions`を参照（`experiment_id`経由）

#### 詳細
- ビューは`participant_experiment_sessions`を参照しているが、このテーブルは0件
- 実際のデータは`sessions`テーブルにある（11件）
- ビューが正しく機能しない可能性

#### 影響評価
- **高**: ビューが使用できない可能性がある

#### 改善提案
1. ビューを`sessions`テーブルを参照するように更新
2. `experiment_id`を`sessions.id`に変更

---

## データ件数サマリー

### 使用中のテーブル（データあり）
- `face_emotion_data`: 33,394件
- `language_emotion_data`: 4,424件
- `timeline_points`: 2,006件
- `prosody_emotion_data`: 1,924件
- `burst_emotion_data`: 531件
- `sessions`: 11件
- `participants`: 11件

### 未使用のテーブル（データなし）
- `participant_experiment_sessions`: 0件
- `participant_response_data`: 0件
- `analysis_results`: 0件
- `participant_analysis_results`: 0件
- `participant_hume_*`: 0件
- `response_*_timeseries`: 0件

---

## 優先度別改善提案

### 🔴 高優先度

1. **`participant_experiment_sessions`と`sessions`の統合**
   - `sessions`テーブルが実際に使用されている
   - ビューが`participant_experiment_sessions`を参照しているため、ビューを更新する必要がある
   - 影響: ビューが機能しない

2. **ビューの更新**
   - `participant_detail`, `session_detail`, `analysis_result_detail`を`sessions`テーブルを参照するように更新
   - `experiment_id`を`sessions.id`に変更

### 🟡 中優先度

3. **感情データテーブルの整理**
   - 未使用の`participant_hume_*`テーブルを削除するか、使用予定を明確化
   - `timeline_points.emotions`との統合方法を検討

4. **分析結果テーブルの用途明確化**
   - `analysis_results`と`participant_analysis_results`の用途を明確化
   - 1つに統合するか、明確に分離する

### 🟢 低優先度

5. **正規化の改善**
   - `stimulus_word`を削除し、`word_stimulus_id`からJOINで取得
   - または、トリガーで整合性を保証

6. **未使用テーブルの削除**
   - `response_skin_potential_timeseries`と`response_emotion_timeseries`を削除するか、使用予定を明確化

---

## 推奨されるリファクタリング手順

### フェーズ1: ビューの修正（即座に実行可能）
1. `participant_detail`ビューを`sessions`テーブルを参照するように更新
2. `session_detail`ビューを`sessions`テーブルを参照するように更新
3. `analysis_result_detail`ビューを`sessions`テーブルを参照するように更新

### フェーズ2: テーブル統合（データ移行が必要）
1. `participant_experiment_sessions`のデータを`sessions`に移行（現在0件のため不要）
2. `participant_experiment_sessions`を参照している外部キーを更新
3. `participant_experiment_sessions`テーブルを削除（または非推奨としてマーク）

### フェーズ3: 未使用テーブルの整理
1. 未使用テーブルの使用予定を確認
2. 使用予定がない場合は削除
3. 使用予定がある場合は文書化

---

## 結論

主な冗長性は以下の通り：

1. **`sessions`と`participant_experiment_sessions`の重複**: 高優先度で対応が必要
2. **ビューが未使用テーブルを参照**: 高優先度で対応が必要
3. **感情データテーブルの重複**: 中優先度で整理が必要
4. **分析結果テーブルの重複**: 中優先度で用途明確化が必要
5. **正規化の問題**: 低優先度で改善可能

最も重要な問題は、実際に使用されている`sessions`テーブルと、ビューが参照している`participant_experiment_sessions`テーブルの不一致です。これを解決することで、ビューが正常に機能するようになります。

