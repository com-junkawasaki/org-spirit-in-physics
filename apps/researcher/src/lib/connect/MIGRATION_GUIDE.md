# GraphQLからConnect RPCへの移行ガイド

## 概要

既存のGraphQLクエリをConnect RPCに段階的に移行します。

## 移行マッピング

### Participant Service

| GraphQL | Connect RPC |
|---------|-------------|
| `GetParticipants` | `participantClient.getParticipants()` |
| `GetParticipant` | `participantClient.getParticipant()` |

### Session Service

| GraphQL | Connect RPC |
|---------|-------------|
| `GetSessions` | `sessionClient.getSessions()` |

### Timeline Service

| GraphQL | Connect RPC |
|---------|-------------|
| `GetTimeline` | `timelineClient.getTimeline()` |
| `GetWordAggregates` | `timelineClient.getWordAggregates()` |
| `GetEmotionVectors` | `timelineClient.getEmotionVectors()` |
| `GetWordStatistics` | `timelineClient.getWordStatistics()` |

## 移行手順

### 1. GraphQLクライアントからConnectクライアントへ

**Before (GraphQL):**
```typescript
import { graphqlClient, GetParticipantsDocument } from '@/lib/graphql/client';
import type { GetParticipantsQueryResult } from '@/generated/graphql';

const data = await graphqlClient.request<GetParticipantsQueryResult>(
  GetParticipantsDocument
);
```

**After (Connect RPC):**
```typescript
import { participantClient } from '@/lib/connect/client';
import { useParticipants } from '@/lib/connect/hooks/useParticipants';

// In component
const { data: participants } = useParticipants(true);
```

### 2. React Hooksの使用

**Before:**
```typescript
import { useWordAggregates } from '@/hooks/useWordAggregates';

const { wordAggregates, emotionVectors, wordStatistics } = useWordAggregates(
  participantId,
  sessionId
);
```

**After:**
```typescript
import { 
  useWordAggregates, 
  useEmotionVectors, 
  useWordStatistics 
} from '@/lib/connect/hooks/useWordAggregates';

const { data: wordAggregates } = useWordAggregates(participantId, sessionId);
const { data: emotionVectors } = useEmotionVectors(participantId, sessionId);
const { data: wordStatistics } = useWordStatistics(participantId, sessionId);
```

## 移行チェックリスト

### Phase 1: 基盤実装 ✅
- [x] Connectクライアント実装
- [x] Connect APIプロキシルート
- [x] React Hooks実装
- [x] Protobuf型生成設定

### Phase 2: Participant & Session移行
- [ ] `DashboardOverview.tsx` - GetParticipants移行
- [ ] `participants/[id]/page.tsx` - GetParticipant移行
- [ ] `participants/[id]/sessions/page.tsx` - GetSessions移行

### Phase 3: Timeline移行
- [ ] `useWordAggregates.ts` - Connect RPCに移行
- [ ] `TimelineVisualization.tsx` - GetTimeline移行
- [ ] `participants/[id]/timeline/route.ts` - APIルート移行

### Phase 4: クリーンアップ
- [ ] 未使用のGraphQLクライアントコード削除
- [ ] GraphQL APIプロキシルート削除（オプション）
- [ ] ドキュメント更新

## 注意事項

1. **段階的移行**: GraphQLとConnect RPCを並行して使用可能
2. **型安全性**: Protobuf型生成により、型安全性が向上
3. **エラーハンドリング**: Connect RPCのエラーハンドリングに統一
4. **パフォーマンス**: gRPC-Webにより、パフォーマンスが向上する可能性

## トラブルシューティング

### Protobuf型が生成されない場合

```bash
cd apps/researcher
pnpm proto:generate
```

### Connectクライアントが動作しない場合

1. バックエンドサーバーが起動しているか確認
2. 環境変数 `GRPC_API_URL` が正しく設定されているか確認
3. Connect APIプロキシルートが正しく動作しているか確認
