# 移行カバレッジ状況

## バックエンド実装状況

### ✅ 完了
- [x] Goプロジェクト構造と基本設定
- [x] Protobufスキーマ定義（participant, session, timeline, storage）
- [x] sqlcクエリファイルとスキーマ
- [x] Temporalワークフローとアクティビティ（participant, session）
- [x] Connect gRPCサーバー実装
- [x] Participant Service ハンドラー
- [x] Session Service ハンドラー
- [x] Clerk認証ミドルウェア（実装済み、未統合）

### 🚧 実装中
- [ ] Timeline Service ハンドラー
- [ ] Storage Service ハンドラー
- [ ] エラーハンドリングの統一
- [ ] ロギングとモニタリング

### ❌ 未実装
- [ ] 統合テスト
- [ ] パフォーマンステスト
- [ ] ドキュメント生成

## フロントエンド移行状況

### ✅ 完了
- [x] GraphQLクライアント実装（既存）
- [x] GraphQL APIプロキシルート（既存）

### 🚧 実装中
- [ ] Connectクライアント実装
- [ ] GraphQLからConnectへの移行

### ❌ 未実装
- [ ] Connectクライアントの型生成
- [ ] 既存GraphQLクエリのConnect RPCへの変換
- [ ] エラーハンドリングの統一

## 移行カバレッジ

### バックエンド: 約60%
- Participant Service: 100%
- Session Service: 100%
- Timeline Service: 0%
- Storage Service: 0%

### フロントエンド: 約0%
- Connectクライアント: 0%
- GraphQLクライアント: 100%（既存）
