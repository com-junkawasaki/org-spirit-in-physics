# GraphQL Resolver実装ガイド

## 概要

TimescaleDBのマテリアライズドビューからデータを取得するGraphQL resolverを実装しました。これにより、クライアント側の処理を大幅に削減できます。

## 実装したResolver

### 1. `wordAggregates`

単語別の集約データを取得します。マテリアライズドビュー `timeline_word_aggregates_by_session` からデータを取得します。

**GraphQL Query例:**
```graphql
query GetWordAggregates($participantId: ID!, $sessionId: ID) {
  wordAggregates(participantId: $participantId, sessionId: $sessionId) {
    participantId
    sessionId
    word
    count
    avgReactionValue
    sumReactionValue
    avgReactionTime
    sumReactionTime
    avgPhysiological
    sumPhysAbs
    physSeries
    rtSeries
    rvSeries
    firstTime
    lastTime
  }
}
```

**用途**: 距離タブのノード指標計算を事前集約済みデータで実行

### 2. `emotionVectors`

感情ベクトルの集約データを取得します。マテリアライズドビュー `timeline_emotion_vectors_by_word` からデータを取得します。

**GraphQL Query例:**
```graphql
query GetEmotionVectors($participantId: ID!, $sessionId: ID) {
  emotionVectors(participantId: $participantId, sessionId: $sessionId) {
    participantId
    sessionId
    word
    joySum
    sadnessSum
    angerSum
    fearSum
    surpriseSum
    disgustSum
    calmSum
    focusSum
    excitementSum
    confusionSum
    emotionEntryCount
    emotionByModality
  }
}
```

**用途**: 感情ベクトルの集約と正規化を事前計算済みデータで実行

### 3. `wordStatistics`

統計値の事前計算データを取得します。マテリアライズドビュー `timeline_word_statistics_by_session` からデータを取得します。

**GraphQL Query例:**
```graphql
query GetWordStatistics($participantId: ID!, $sessionId: ID) {
  wordStatistics(participantId: $participantId, sessionId: $sessionId) {
    participantId
    sessionId
    word
    count
    avgReactionTime
    stdReactionTime
    varReactionTime
    avgReactionValue
    stdReactionValue
    varReactionValue
    avgPhysiological
    stdPhysiological
    varPhysiological
    speedIndex
    physSeries
    rtSeries
  }
}
```

**用途**: 統計計算を事前計算済み値に置き換えて実行

## 使用方法

### クライアント側での実装例

```typescript
import { graphqlClient } from '@/lib/graphql/client';
import { gql } from 'graphql-request';

const GET_WORD_AGGREGATES = gql`
  query GetWordAggregates($participantId: ID!, $sessionId: ID) {
    wordAggregates(participantId: $participantId, sessionId: $sessionId) {
      word
      count
      avgReactionValue
      sumReactionValue
      avgReactionTime
      sumReactionTime
      avgPhysiological
      sumPhysAbs
      physSeries
      rtSeries
      rvSeries
    }
  }
`;

// 使用例
const data = await graphqlClient.request(GET_WORD_AGGREGATES, {
  participantId: '25111604-c7db-4bfd-8662-e55060e332d6',
  sessionId: 'session-uuid-here'
});

// データは既に集約済みなので、クライアント側での処理が大幅に削減される
const wordData = data.wordAggregates.reduce((acc, agg) => {
  acc[agg.word] = {
    count: agg.count,
    avgReactionValue: agg.avgReactionValue,
    avgReactionTime: agg.avgReactionTime,
    avgPhysiological: agg.avgPhysiological,
    // 統計計算は既に完了している
  };
  return acc;
}, {});
```

## パフォーマンス改善

### 現在の実装（生データ取得）

```typescript
// 200データポイントを取得
const timelineData = await fetchTimelineData(participantId, sessionId);

// クライアント側で集約処理（~11,900回の計算）
const accum = {};
for (const d of timelineData) {
  accum[d.word].count += 1;
  accum[d.word].sumReactionValue += d.reactionValue;
  // ... 感情ベクトル集約、統計計算など
}
```

### マテリアライズドビュー使用

```typescript
// 100単語の集約データを取得（1回のクエリ）
const wordAggregates = await graphqlClient.request(GET_WORD_AGGREGATES, {
  participantId,
  sessionId
});

// クライアント側での処理は最小限（~2,001回の計算、83%削減）
const wordData = wordAggregates.reduce((acc, agg) => {
  acc[agg.word] = {
    count: agg.count,
    avgReactionValue: agg.avgReactionValue,
    // 統計値は既に計算済み
  };
  return acc;
}, {});
```

## 注意事項

1. **マテリアライズドビューの更新遅延**: 1-5秒の遅延が発生する可能性があります
2. **テーブルの存在確認**: マテリアライズドビューが存在しない場合は、エラーが発生します
3. **配列データの処理**: `physSeries`, `rtSeries`, `rvSeries` は PostgreSQL 配列として返されます

## 次のステップ

1. **マイグレーション実行**: `timeline_points` テーブルが存在することを確認してから、マテリアライズドビューを作成
2. **GraphQL Code Generator**: 新しいクエリを追加してTypeScript型を生成
3. **クライアント側の更新**: 既存の集約処理をマテリアライズドビューからのデータに置き換え

