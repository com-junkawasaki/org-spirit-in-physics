# 非推奨レイヤー

このプロジェクトは **GraphQL + Apollo Client** のシンプルな設計に移行しました。

以下のレイヤーは非推奨となり、段階的に削除予定です：

## 非推奨レイヤー

- `10_events/` - CQRSイベント定義（削除予定）
- `20_ports/` - Port抽象化（削除予定）
- `30_fold/` - MerkleDAG投影（削除予定）
- `40_domain/` - XStateマシン（一部保持、UI側で使用）
- `50_adapters/` - Adapterパターン（削除予定）
- `60_projection/` - プロジェクション（削除予定）
- `70_supervisors/` - スーパーバイザー（削除予定）

## 新しいアーキテクチャ

```
src/
├── lib/
│   └── graphql/          # GraphQL client configuration
│       ├── client.ts      # Apollo Client setup
│       ├── queries/       # GraphQL queries
│       ├── mutations/     # GraphQL mutations
│       └── hooks.ts       # React hooks for GraphQL
├── shared/
│   └── schemas/          # Zod schemas
└── app/                 # Next.js App Router
```

## 移行ガイド

既存のコードは以下のように移行してください：

### 以前（Port/Adapter）
```typescript
import { StoragePort } from 'scripts/src/20_ports';
import { storageAdapter } from 'scripts/src/50_adapters';
await storageAdapter.saveStructuredData(payload);
```

### 現在（GraphQL）
```typescript
import { useSaveSession } from '@/lib/graphql/hooks';
// Or using Apollo Client directly
import { apolloClient } from '@/lib/graphql/client';
import { SAVE_SESSION } from '@/lib/graphql/mutations/sessions';
await apolloClient.mutate({
  mutation: SAVE_SESSION,
  variables: { input: sessionData }
});
```

## 注意事項

- 一部のXStateマシンはUI側で使用されているため、保持します
- Inngestワークフローはバックグラウンド処理として維持します
- GraphQLサーバーはRustで実装されています（`apps/graphql-server`）
- 段階的に移行し、動作確認しながら削除します
