# GraphQL Type-Safe Client Usage

Next.js側でGraphQLを型安全に呼び出す方法。

## セットアップ

### 1. GraphQL Providerの設定

`layout.tsx`に`GraphQLProvider`が既に追加されています。

### 2. 型生成

```bash
pnpm graphql-codegen
```

## 使用方法

### React Hooks

```tsx
'use client';

import { useParticipants, useExecuteActivity } from '@/lib/graphql';

export function MyComponent() {
  // Query hook
  const { data, loading, error } = useParticipants();

  // Mutation hook
  const [executeActivity, { loading: executing }] = useExecuteActivity();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Participants</h2>
      <ul>
        {data?.participants.map((p) => (
          <li key={p.id}>{p.id}</li>
        ))}
      </ul>

      <button
        onClick={async () => {
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
        }}
        disabled={executing}
      >
        Execute Activity
      </button>
    </div>
  );
}
```

### 直接Apollo Client使用

```tsx
import { apolloClient } from '@/lib/graphql';
import { GET_PARTICIPANTS } from '@/lib/graphql/queries/participants';

const { data } = await apolloClient.query({
  query: GET_PARTICIPANTS,
});
```

## 利用可能なHooks

- `useParticipants()` - 参加者一覧取得
- `useParticipant(id)` - 参加者詳細取得
- `useSessions(participantId?)` - セッション一覧取得
- `useAnalysisResults(participantId?, experimentId?)` - 解析結果取得
- `useExecuteActivity()` - Activity実行

## 型安全性

全てのフックは生成された型を使用しており、完全に型安全です：

- Query結果の型: `GetParticipantsQuery`, `GetParticipantQuery`, etc.
- Mutation変数の型: `ExecuteActivityMutationVariables`
- Mutation結果の型: `ExecuteActivityMutation`

生成された型は `src/lib/graphql/generated/types.ts` にあります。

