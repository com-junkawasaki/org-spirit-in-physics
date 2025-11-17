# GraphQL Subscription テストガイド

## サーバー起動

### Docker Composeで起動
```bash
cd /Users/junkawasaki/jun784/spirit-in-physics
docker-compose up -d graphql-service postgres
```

### ローカルで起動（ccクレートのエラーがある場合はDocker推奨）
```bash
cd performers/services/graphql
cargo run --bin graphql
```

## WebSocket接続の確認

### 1. ヘルスチェック
```bash
curl http://localhost:8081/health
```

### 2. GraphQL Playgroundで確認
ブラウザで以下にアクセス:
```
http://localhost:8081/graphql/playground
```

### 3. WebSocketエンドポイント
```
ws://localhost:8081/graphql/ws
```

## Subscriptionのテスト

### 1. シミュレーション作成

```graphql
mutation CreateForceGraphSimulation {
  createForceGraphSimulation(input: {
    nodes: [
      {id: "node1", label: "Node 1", scale: 1.0}
      {id: "node2", label: "Node 2", scale: 1.5}
      {id: "node3", label: "Node 3", scale: 2.0}
    ]
    links: [
      {source: 0, target: 1, weight: 1.0}
      {source: 1, target: 2, weight: 1.5}
    ]
    physics: {
      springK: 2.0
      repulsionK: 2000.0
      damping: 0.92
      restLength: 80
      maxSpeed: 200
    }
    maxFps: 30
  })
}
```

### 2. Subscription開始

```graphql
subscription ForceGraphUpdates {
  forceGraphUpdates(simulationId: "<SIMULATION_ID>", maxFps: 30) {
    simulationId
    timestamp
    iteration
    nodes {
      id
      position {
        x
        y
        z
      }
      velocity {
        x
        y
        z
      }
    }
  }
}
```

### 3. 物理パラメータ更新

```graphql
mutation UpdateForceGraphPhysics {
  updateForceGraphPhysics(
    simulationId: "<SIMULATION_ID>"
    physics: {
      springK: 3.0
      repulsionK: 2500.0
      damping: 0.95
    }
  )
}
```

### 4. シミュレーション停止

```graphql
mutation StopForceGraphSimulation {
  stopForceGraphSimulation(simulationId: "<SIMULATION_ID>")
}
```

## クライアント側のテスト

### Reactコンポーネントの使用

```typescript
import Force3DWordGraphTypeGPUSubscription from '@/components/Force3DWordGraphTypeGPUSubscription'

<Force3DWordGraphTypeGPUSubscription
  nodes={nodes}
  links={links}
  width={1000}
  height={600}
  maxFps={60}
  physics={{
    springK: 2.0,
    repulsionK: 2000.0,
    damping: 0.92,
    restLength: 80,
    maxSpeed: 200,
  }}
/>
```

## トラブルシューティング

### WebSocket接続エラー
- GraphQLサーバーが起動しているか確認
- WebSocket URLが正しいか確認（`ws://localhost:8081/graphql/ws`）
- CORS設定を確認

### Subscriptionが更新されない
- シミュレーションIDが正しいか確認
- サーバー側のログを確認
- クライアント側のApollo Client設定を確認

### コンパイルエラー（ccクレート）
- Docker Composeを使用することを推奨
- または、`cargo clean`後に再ビルド

