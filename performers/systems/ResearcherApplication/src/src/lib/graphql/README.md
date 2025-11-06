# GraphQL Client (Type-Safe)

型安全なGraphQLクライアント実装。

## 使用方法

### React Hooks

```tsx
import { useParticipants, useExecuteActivity } from '@/lib/graphql';

function ParticipantsList() {
  const { data, loading, error } = useParticipants();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.participants.map((participant) => (
        <li key={participant.id}>{participant.id}</li>
      ))}
    </ul>
  );
}

function ActivityButton() {
  const [executeActivity, { loading }] = useExecuteActivity();

  const handleClick = async () => {
    const result = await executeActivity({
      variables: {
        activityId: 'https://spirit-in-physics.gftd.ai/activity/AnalysisProcess',
        inputs: [
          {
            id: 'input-1',
            type: 'https://spirit-in-physics.gftd.ai/ontology#WordResponse',
            data: {
              stimulusWord: '水',
              responseWord: '海',
              reactionTimeMs: 1200,
            },
          },
        ],
      },
    });

    console.log(result.data?.executeActivity);
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      Execute Activity
    </button>
  );
}
```

### 直接クエリ実行

```tsx
import { apolloClient } from '@/lib/graphql';
import { GET_PARTICIPANTS } from '@/lib/graphql/queries/participants';

const { data } = await apolloClient.query({
  query: GET_PARTICIPANTS,
});
```

## 型生成

GraphQL Code Generatorを使用して型を生成：

```bash
pnpm graphql-codegen
```

生成された型は `src/lib/graphql/generated/` に出力されます。

## GraphQLサーバー

このプロジェクトのGraphQLサーバーは**Rust実装のみ**です。

- **サーバー実装**: `performers/services/graphql/GraphQLService/` (async-graphql使用)
- **エンドポイント**: `http://localhost:3003/graphql` (デフォルト)
- **環境変数**: `NEXT_PUBLIC_RUST_GRAPHQL_URL`でオーバーライド可能

## 設定

- **スキーマ**: Rust GraphQLサーバーから自動取得（`codegen.ts`で設定）
- **クエリ/ミューテーション**: `src/lib/graphql/queries/`, `src/lib/graphql/mutations/`
- **Codegen設定**: `codegen.ts` - Rust GraphQLサーバーのスキーマから型を生成

