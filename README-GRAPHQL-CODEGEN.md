# GraphQL Code Generation Setup

## 概要

RustのGraphQLサービス（async-graphql）からSDLを生成し、GraphQL Code Generatorを使用してTypeScriptの型とクエリを自動生成します。

## アーキテクチャ

```
Rust GraphQL Service (async-graphql)
  ↓ SDL生成 (/graphql/schema エンドポイント)
  ↓ Introspection Query (/graphql エンドポイント)
GraphQL Code Generator
  ↓ TypeScript型生成
apps/visualizer/src/generated/graphql.ts
```

## セットアップ

### 1. Rust GraphQLサービス

SDLエンドポイントが有効になっています：
- `/graphql/schema` - SDL形式でスキーマを返す
- `/graphql` - GraphQLエンドポイント（introspection対応）

### 2. GraphQL Code Generator設定

`apps/visualizer/codegen.yaml` で設定されています：

```yaml
schema:
  - http://localhost:8081/graphql:  # Introspection queryを使用
    headers:
      Content-Type: application/json

documents:
  - 'src/**/*.{ts,tsx}'
  - 'src/**/*.graphql'

generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
```

### 3. 使用方法

#### 型の生成

```bash
# 手動で生成
pnpm codegen

# ウォッチモード（開発中）
pnpm codegen:watch

# ビルド時に自動生成（prebuildフック）
pnpm build  # prebuildが自動実行される
```

#### 生成された型の使用

```typescript
import { graphqlClient, GetParticipantsDocument } from '@/lib/graphql/client';
import type { GetParticipantsQueryResult } from '@/generated/graphql';

const data = await graphqlClient.request<GetParticipantsQueryResult>(
  GetParticipantsDocument
);
```

## 生成されるファイル

- `src/generated/graphql.ts` - TypeScript型定義とクエリドキュメント

## ワークフロー

1. RustでGraphQLスキーマを定義（`performers/services/graphql/src/`）
2. GraphQLサービスを起動
3. `pnpm build` で型を自動生成（`prebuild`フック）
4. 生成された型を使用してTypeScriptコードを記述

## スクリプト

- `pnpm codegen` - 型を手動で生成
- `pnpm codegen:watch` - ウォッチモードで型を生成（開発中）
- `pnpm prebuild` - ビルド前に自動実行（型生成）
- `pnpm build` - Next.jsアプリをビルド（`prebuild`が自動実行される）

## 注意事項

- `src/generated/` ディレクトリは `.gitignore` に追加されています
- ビルド時に自動的に型が生成されます（`prebuild`フック）
- GraphQLサービスが起動している必要があります
- 開発中は `pnpm codegen:watch` を使用すると便利です
