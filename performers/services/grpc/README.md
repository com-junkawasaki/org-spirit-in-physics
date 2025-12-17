# gRPC Service

GraphQLバックエンドをGo + Temporal + sqlc + Connect (gRPC)で実装したサービスです。

## アーキテクチャ

- **Connect gRPC**: gRPC-Web対応のRPCフレームワーク
- **Temporal**: ワークフローエンジン（非同期処理用）
- **sqlc**: SQLから型安全なGoコードを生成
- **Clerk**: 認証ミドルウェア
- **PostgreSQL + TimescaleDB**: データベース（時系列データ用）

## セットアップ

```bash
# 依存関係のインストール
make deps

# コード生成（Protobuf + sqlc）
make generate

# ビルド
make build

# 実行
make run
```

## 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spirit_in_physics
PORT=8080
CLERK_SECRET_KEY=sk_test_...
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
```

## Docker Compose

```bash
docker-compose up -d
```

これにより、以下のサービスが起動します：
- gRPCサービス（ポート8080）
- PostgreSQL + TimescaleDB（ポート5432）
- Temporal（ポート7233）

## ディレクトリ構造

```
grpc/
├── cmd/
│   └── server/          # サーバーエントリーポイント
├── internal/
│   ├── db/              # sqlc生成コード
│   ├── auth/            # 認証（Clerk）
│   ├── handlers/        # gRPCハンドラー
│   ├── workflows/       # Temporalワークフロー
│   └── activities/      # Temporalアクティビティ
├── proto/               # Protobufスキーマ
│   ├── participant/v1/  # 参加者サービス
│   ├── session/v1/      # セッションサービス
│   ├── timeline/v1/     # タイムラインサービス
│   └── storage/v1/      # ストレージサービス
├── queries/             # SQLクエリ（sqlc用）
├── schema/              # SQLスキーマ（sqlc用）
└── gen/                 # 生成コード
```

## 実装済み機能

### Participant Service
- `GetParticipants`: 全参加者取得（認証状態に応じてフィルタリング）
- `GetParticipant`: IDで参加者取得
- `CreateParticipant`: 参加者作成
- `GetStimulusWords`: 刺激語一覧取得
- `GetStimulusWord`: IDで刺激語取得

### Session Service
- `GetSessions`: 参加者のセッション一覧取得
- `CreateSession`: セッション作成（イベント含む）

### Timeline Service（実装予定）
- `GetTimeline`: タイムラインデータ取得
- `GetWordAggregates`: 単語集計データ取得
- `GetEmotionVectors`: 感情ベクトル取得
- `GetWordStatistics`: 単語統計取得

## 認証

Clerk認証ミドルウェアを実装済み。リクエストヘッダーに`Authorization: Bearer <token>`を含めることで認証できます。

認証済みユーザーは全てのデータにアクセス可能、未認証ユーザーは`is_public=true`のデータのみアクセス可能です。

## Temporalワークフロー

以下のワークフローを実装済み：
- `CreateParticipantWorkflow`: 参加者作成ワークフロー
- `CreateSessionWorkflow`: セッション作成ワークフロー

## 開発

### コード生成

Protobufとsqlcのコード生成：

```bash
make generate
```

### テスト

```bash
make test
```

### クリーンアップ

生成ファイルの削除：

```bash
make clean
```
