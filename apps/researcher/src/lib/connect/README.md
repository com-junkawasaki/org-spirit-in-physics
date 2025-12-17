# Connect RPC Client

Connect RPCクライアント実装。GraphQLからConnect RPCへの移行をサポートします。

## 使用方法

### Participant Service

```typescript
import { useParticipants, useParticipant } from '@/lib/connect/hooks/useParticipants';

// 参加者一覧を取得
const { data: participants } = useParticipants(true);

// 特定の参加者を取得
const { data: participant } = useParticipant(participantId);
```

### Session Service

```typescript
import { useSessions } from '@/lib/connect/hooks/useSessions';

// セッション一覧を取得
const { data: sessions } = useSessions(participantId);
```

### Timeline Service

```typescript
import { useTimeline } from '@/lib/connect/hooks/useTimeline';
import { useWordAggregates, useEmotionVectors, useWordStatistics } from '@/lib/connect/hooks/useWordAggregates';

// タイムラインデータを取得
const { data: timelinePoints } = useTimeline(participantId, sessionId, startTime, endTime);

// 単語集計データを取得
const { data: wordAggregates } = useWordAggregates(participantId, sessionId);
const { data: emotionVectors } = useEmotionVectors(participantId, sessionId);
const { data: wordStatistics } = useWordStatistics(participantId, sessionId);
```

### 互換性ラッパー

既存のGraphQLフックと同じインターフェースを提供：

```typescript
import { useWordAggregatesCompat } from '@/lib/connect/hooks/useWordAggregatesCompat';

// GraphQL版と同じインターフェース
const { wordAggregates, emotionVectors, wordStatistics, loading, error, refetch } = 
  useWordAggregatesCompat(participantId, sessionId);
```

## 環境変数

```env
# サーバー側
GRPC_API_URL=http://grpc-service:8080

# クライアント側
NEXT_PUBLIC_GRPC_API_URL=/api/grpc
```

## 型生成

Protobuf型を生成するには：

```bash
cd apps/researcher
pnpm proto:generate
```

## 移行ガイド

詳細は `MIGRATION_GUIDE.md` を参照してください。
