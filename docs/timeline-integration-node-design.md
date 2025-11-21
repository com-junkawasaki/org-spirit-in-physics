# TimelineIntegrationPoint ノード設計

## 概要

`TimelineIntegrationPoint`ノードは、事前計算された統合分析結果をNeo4jに保存するためのノード設計です。リアルタイム統合処理の負荷を削減し、タイムライン可視化APIの応答時間を大幅に改善します。

## 設計目的

- **パフォーマンス改善**: リアルタイム統合処理（30秒以上）を事前計算済みデータ取得（数秒）に短縮
- **データ整合性**: 統合処理結果を一元的に管理し、データの一貫性を保証
- **拡張性**: 将来のスキーマ変更に対応できるバージョン管理機能

## ノード構造

### ノードラベル
- `TimelineIntegrationPoint`

### プロパティ定義

| プロパティ名 | 型 | 説明 | 必須 |
|------------|-----|------|------|
| `id` | string | 一意ID（`{participantId}_{sessionId}_{timestamp}`形式） | ✓ |
| `participant_id` | string | 参加者ID | ✓ |
| `session_id` | string | セッションID | ✓ |
| `timestamp` | integer | タイムスタンプ（ミリ秒、Unix timestamp） | ✓ |
| `word` | string | 刺激語 | ✓ |
| `event_type` | string | イベントタイプ（`word_displayed`, `speech_detected`など） | ✓ |
| `reaction_time` | integer \| null | 反応時間（ミリ秒、nullable） | ✓ |
| `reaction_value` | float | 統合反応値 | ✓ |
| `emotions` | JSON array | 感情データ配列 | ✓ |
| `physiological` | JSON object | 生理データ | ✓ |
| `metadata` | JSON object | メタデータ | ✓ |
| `created_at` | datetime | 作成日時 | ✓ |
| `updated_at` | datetime | 更新日時 | ✓ |
| `version` | integer | データバージョン（現在は1） | ✓ |

### 感情データ構造（emotions配列）

```typescript
Array<{
  name: string;              // 感情名（'joy', 'sadness', 'anger'など）
  score: number;             // 感情スコア（0-1）
  fileType: 'burst' | 'face' | 'language' | 'prosody';  // データソース
}>
```

### 生理データ構造（physiologicalオブジェクト）

```typescript
{
  average: number;           // 平均値
  max: number;               // 最大値
  min: number;               // 最小値
  channels: Record<string, number>;  // チャンネル別データ（Ch1-Ch8）
}
```

### メタデータ構造（metadataオブジェクト）

```typescript
{
  emotionCount: number;      // 関連する感情データ数
  physiologicalCount: number; // 関連する生理データ数
}
```

## リレーションシップ

- `(Participant)-[:HAS_TIMELINE_POINT]->(TimelineIntegrationPoint)`
- `(Session)-[:HAS_TIMELINE_POINT]->(TimelineIntegrationPoint)`

## スキーマ制約

### ユニーク制約
- `timeline_integration_point_id_unique`: `id`プロパティのユニーク制約

### ノードキー制約
- `timeline_integration_point_node_key`: `(id, participant_id, session_id, timestamp)`の複合キー

### 存在制約
- `timeline_integration_point_participant_exists`: `participant_id`必須
- `timeline_integration_point_session_exists`: `session_id`必須
- `timeline_integration_point_timestamp_exists`: `timestamp`必須

## インデックス

### 複合インデックス
- `timeline_integration_point_participant_session_timestamp`: `(participant_id, session_id, timestamp)`
- `timeline_integration_point_session_timestamp`: `(session_id, timestamp)`

### 単一インデックス
- `timeline_integration_point_word`: `word`
- `timeline_integration_point_timestamp_range`: `timestamp`

## 使用方法

### 1. スキーマ初期化

```bash
# スキーマ初期化スクリプトを実行
ts-node apps/visualizer/src/scripts/init-timeline-schema.ts
```

### 2. 統合処理結果の保存

```typescript
import { TimelineIntegrationPointManager } from '@/lib/neo4j-timeline-manager';
import { convertIntegratedDataToTimelinePoints } from '@/lib/timeline-integration-converter';

const manager = new TimelineIntegrationPointManager();

// 統合処理結果を取得（既存のintegrateTimelineData関数を使用）
const integratedData = integrateTimelineData(sessionData, emotionData, physiologicalData);

// TimelineIntegrationPoint形式に変換
const timelinePoints = convertIntegratedDataToTimelinePoints(
  integratedData,
  participantId,
  sessionId
);

// 一括作成
await manager.createTimelinePointsBulk(timelinePoints);
```

### 3. 統合処理結果の取得

```typescript
import { TimelineIntegrationPointManager } from '@/lib/neo4j-timeline-manager';
import { convertTimelinePointsToApiResponse } from '@/lib/timeline-integration-converter';

const manager = new TimelineIntegrationPointManager();

// 存在確認
const checkResult = await manager.checkTimelinePointsExist(participantId, sessionId);
if (checkResult.exists) {
  // 事前計算済みデータを取得
  const timelinePoints = await manager.getTimelinePoints(participantId, sessionId);
  const apiResponse = convertTimelinePointsToApiResponse(timelinePoints);
  return apiResponse;
} else {
  // リアルタイム統合処理を実行
  // ...
}
```

## パフォーマンス改善

### 現在の処理時間（リアルタイム統合）
- セッションデータ取得: ~100ms
- 感情データ取得: ~5000ms（3561件のlanguageデータ）
- 生理データ取得: ~200ms
- 統合処理: ~30000ms（199イベント × 3561感情データ）
- **合計: ~35秒以上**

### 改善後の処理時間（事前計算済みデータ取得）
- TimelineIntegrationPoint取得: ~500ms（インデックス使用）
- データ変換: ~100ms
- **合計: ~600ms**

**約58倍のパフォーマンス改善**

## データ更新戦略

### 初回生成
- セッションデータインポート時に統合処理を実行し、TimelineIntegrationPointノードを作成

### 更新タイミング
- 感情データが追加・更新された場合
- 生理データが追加・更新された場合
- セッションデータが更新された場合

### 更新方法
1. 既存のTimelineIntegrationPointノードを削除
2. 最新データで統合処理を再実行
3. 新しいTimelineIntegrationPointノードを作成

## 将来の拡張

### バージョン管理
- `version`プロパティを使用して、スキーマ変更に対応
- バージョン2以降では、新しいプロパティを追加可能

### 部分更新
- 特定のタイムスタンプ範囲のみを更新する機能
- 増分更新によるパフォーマンス最適化

### キャッシュ戦略
- 頻繁にアクセスされるセッションのデータをメモリキャッシュ
- Redis等の外部キャッシュとの統合

## 関連ファイル

- `apps/visualizer/src/lib/neo4j-timeline-schema.ts`: スキーマ定義
- `apps/visualizer/src/lib/neo4j-timeline-manager.ts`: ノード操作管理クラス
- `apps/visualizer/src/lib/timeline-integration-converter.ts`: データ変換関数
- `apps/visualizer/src/scripts/init-timeline-schema.ts`: スキーマ初期化スクリプト

## DoDAF v2 DM2 マッピング

- **InformationType**: `TimelineIntegrationPoint`
- **DataType**: `timestamp`, `word`, `reactionTime`, `reactionValue`, `emotions`, `physiological`, `metadata`
- **RepresentationType**: `JSON`, `Neo4j Node`
- **Performer**: `TimelineIntegrationPointManager`
- **Activity**: `createTimelinePoint`, `getTimelinePoints`, `deleteTimelinePointsBySession`

