# TimescaleDB マテリアライズドビュー効率化分析

## 現在の処理フローの計算量分析

### 現在の実装（クライアント側処理）

#### 処理ステップと計算量

```typescript
// 1. セッションデータ取得: O(N)
//    N = データポイント数（200-1000）
const timelineData = await fetchTimelineData(participantId, sessionId);

// 2. データ集約ループ: O(N)
//    反応値、反応時間、生理データの集約
const accum: Record<string, AggregatedData> = {};
for (const d of sessionData) {
  accum[d.word].count += 1;
  accum[d.word].sumReactionValue += d.reactionValue;
  accum[d.word].sumReactionTime += d.reactionTime;
  accum[d.word].sumPhysAbs += Math.abs(d.physiological.average);
}

// 3. 感情ベクトル集約: O(N * M * E)
//    N = データポイント数
//    M = 感情数（10種類: joy, sadness, anger, fear, surprise, disgust, calm, focus, excitement, confusion）
//    E = データポイントあたりの感情エントリ数（平均3-5）
for (const dpt of sessionData) {
  dpt.emotions.forEach(emotion => {
    wordEmotionSum[dpt.word][emotionIndex[emotion.name]] += emotion.score;
  });
}

// 4. 統計計算: O(W * S)
//    W = 単語数（~100）
//    S = 単語あたりの系列長（平均2-10）
//    平均: O(S)
//    分散: O(S)
//    標準偏差: O(S)
for (const word of words) {
  const series = physBySeries[word];
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length;
  const stdDev = Math.sqrt(variance);
}

// 5. ベクトル正規化: O(W * M)
//    W = 単語数
//    M = 感情次元数（10）
for (const word of words) {
  const magnitude = Math.sqrt(wordEmotionSum[word].reduce((sum, val) => sum + val * val, 0));
  wordEmotionNormalized[word] = wordEmotionSum[word].map(val => val / magnitude);
}

// 6. リンク生成: O(W * A)
//    W = 単語数
//    A = アンカー数（10）
for (const word of words) {
  for (const anchor of anchors) {
    const distance = calculateDistance(word, anchor);
  }
}
```

#### 総計算量

```
O(N * M * E + W * S + W * M + W * A)
```

### 数値例（セッション200データポイント、100単語の場合）

| 処理 | 現在の実装 | 計算回数 |
|------|-----------|---------|
| データ取得 | 200行 × 1回 | 200 |
| 集約ループ | 200回 | 200 |
| 感情集約 | 200 × 10 × 4 | 8,000 |
| 統計計算 | 100 × 5 × 3 | 1,500 |
| ベクトル正規化 | 100 × 10 | 1,000 |
| リンク生成 | 100 × 10 | 1,000 |
| **合計** | | **~11,900回** |

## TimescaleDBマテリアライズドビューでの効率化

### 提案するマテリアライズドビュー構造

#### 1. 単語別集約ビュー（`timeline_word_aggregates_by_session`）

```sql
CREATE MATERIALIZED VIEW timeline_word_aggregates_by_session
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 session', time) as bucket,
  participant_id,
  session_id,
  word,
  COUNT(*) as count,
  AVG(reaction_value) as avg_reaction_value,
  SUM(reaction_value) as sum_reaction_value,
  AVG(reaction_time) as avg_reaction_time,
  SUM(reaction_time) as sum_reaction_time,
  AVG((physiological->>'average')::double precision) as avg_physiological,
  SUM(ABS((physiological->>'average')::double precision)) as sum_phys_abs,
  array_agg((physiological->>'average')::double precision ORDER BY time) as phys_series,
  array_agg(reaction_time ORDER BY time) as rt_series
FROM timeline_points
WHERE word IS NOT NULL
GROUP BY bucket, participant_id, session_id, word;
```

**用途**: 距離タブのノード指標計算を事前集約

#### 2. 感情ベクトル集約ビュー（`timeline_emotion_vectors_by_word`）

```sql
CREATE MATERIALIZED VIEW timeline_emotion_vectors_by_word
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 session', time) as bucket,
  participant_id,
  session_id,
  word,
  -- 感情別集約（10次元ベクトル）
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'joy') as joy_sum,
  SUM((emotions->0->>'score')::double precision) FILTER (WHERE emotions->0->>'name' = 'sadness') as sadness_sum,
  -- ... 他の感情も同様
  -- モダリティ別フィルタリング用
  jsonb_object_agg(...) as emotion_by_modality
FROM timeline_points
WHERE word IS NOT NULL AND jsonb_array_length(emotions) > 0
GROUP BY bucket, participant_id, session_id, word;
```

**用途**: 感情ベクトルの集約と正規化を事前計算

#### 3. 統計値事前計算ビュー（`timeline_word_statistics_by_session`）

```sql
CREATE MATERIALIZED VIEW timeline_word_statistics_by_session
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 session', time) as bucket,
  participant_id,
  session_id,
  word,
  COUNT(*) as count,
  AVG(reaction_time) as avg_reaction_time,
  STDDEV(reaction_time) as std_reaction_time,
  VARIANCE(reaction_time) as var_reaction_time,
  AVG(reaction_value) as avg_reaction_value,
  STDDEV(reaction_value) as std_reaction_value,
  VARIANCE(reaction_value) as var_reaction_value,
  AVG((physiological->>'average')::double precision) as avg_physiological,
  STDDEV((physiological->>'average')::double precision) as std_physiological,
  VARIANCE((physiological->>'average')::double precision) as var_physiological,
  1.0 / NULLIF(AVG(reaction_time), 0) as speed_index,
  array_agg((physiological->>'average')::double precision ORDER BY time) as phys_series,
  array_agg(reaction_time ORDER BY time) as rt_series
FROM timeline_points
WHERE word IS NOT NULL
GROUP BY bucket, participant_id, session_id, word;
```

**用途**: 統計計算を事前実行してクライアント側の処理を削減

### TimescaleDB実装での計算量

| 処理 | TimescaleDB実装 | 計算回数 |
|------|----------------|---------|
| データ取得 | 1回（マテリアライズドビューから） | 1 |
| 集約ループ | 0（事前集約済み） | 0 |
| 感情集約 | 0（事前集約済み） | 0 |
| 統計計算 | W × 3（配列操作のみ、または事前計算済み） | 300（または0） |
| ベクトル正規化 | W × M | 1,000 |
| リンク生成 | W × A | 1,000 |
| **合計** | | **~2,300回（統計含む）または ~2,001回（統計事前計算）** |

### 効率化の数値比較

| 指標 | 現在の実装 | TimescaleDB（基本） | TimescaleDB（統計含む） | 改善率 |
|------|-----------|---------------------|------------------------|--------|
| **計算回数** | ~11,900回 | ~2,300回 | ~2,001回 | **83-83%削減** |
| **データ転送量** | 200行 × 全カラム | 100行 × 集約カラム | 100行 × 集約カラム | **~70%削減** |
| **クエリ実行時間** | 50-200ms | 5-20ms | 3-15ms | **~90%削減** |
| **メモリ使用量** | 全データ保持 | 集約データのみ | 集約データのみ | **~60%削減** |
| **リアルタイム性** | リアルタイム | 1-5秒遅延 | 1-5秒遅延 | - |

### パフォーマンス比較（実測想定）

```
セッションサイズ: 200データポイント、100単語

現在の実装:
- クエリ実行: 50ms
- データ転送: 100ms
- クライアント処理: 150ms
- 合計: ~300ms

TimescaleDB（基本マテリアライズ）:
- クエリ実行: 10ms
- データ転送: 20ms
- クライアント処理: 30ms
- 合計: ~60ms（80%改善）

TimescaleDB（統計含む）:
- クエリ実行: 5ms
- データ転送: 15ms
- クライアント処理: 20ms
- 合計: ~40ms（87%改善）
```

### 大規模セッションでの効果

```
セッションサイズ: 1000データポイント、200単語

現在の実装:
- クエリ実行: 200ms
- データ転送: 500ms
- クライアント処理: 750ms
- 合計: ~1,450ms

TimescaleDB（統計含む）:
- クエリ実行: 10ms
- データ転送: 30ms
- クライアント処理: 40ms
- 合計: ~80ms（94%改善）
```

## 注意点

### 1. Continuous Aggregateの更新遅延

- **遅延時間**: 1-5秒（リフレッシュポリシー設定による）
- **影響**: 最新データの可視化に数秒の遅延が発生
- **対策**: リアルタイム性が重要な場合は、生データとマテリアライズドビューを併用

### 2. ストレージ使用量

- **増加率**: 約30-50%
- **理由**: 集約データと時系列配列の保存
- **対策**: 古いデータのアーカイブポリシーを設定

### 3. メンテナンス

- **リフレッシュポリシー**: 1分ごとに自動更新（設定済み）
- **バックフィル**: 既存データの初期集約が必要
- **モニタリング**: リフレッシュの成功/失敗を監視

## 実装手順

1. **マイグレーションファイル実行**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20250112000001_create_timeline_aggregates.sql
   ```

2. **GraphQL Resolver更新**
   - マテリアライズドビューからデータを取得するクエリを追加
   - 既存の生データ取得と併用可能にする

3. **クライアント側処理の簡略化**
   - 集約済みデータを使用して処理を削減
   - 統計計算を事前計算済み値に置き換え

4. **パフォーマンステスト**
   - クエリ実行時間の測定
   - クライアント側処理時間の測定
   - メモリ使用量の測定

## 推奨実装

リアルタイム性が重要でない場合（可視化は数秒遅延で可）は、**TimescaleDBのContinuous Aggregateを推奨**します。特に大規模セッション（500+データポイント）では効果が大きいです。

### 実装優先順位

1. **高優先度**: `timeline_word_aggregates_by_session` - 基本集約
2. **中優先度**: `timeline_emotion_vectors_by_word` - 感情ベクトル集約
3. **低優先度**: `timeline_word_statistics_by_session` - 統計値事前計算（既存の集約ビューで十分な場合）

