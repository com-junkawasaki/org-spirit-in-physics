# GraphQL サービス Clerk 認証統合実装

## 概要

GraphQL サービスに Clerk の JWT 認証を統合しました。これにより、研究者向けのクエリは認証が必要になり、参加者向けの操作は匿名で実行可能です。

## 実装内容

### 1. 認証モジュール (`src/auth/`)

- **`mod.rs`**: 認証モジュールのエントリーポイント
- **`context.rs`**: 認証コンテキスト構造体 (`AuthContext`)
- **`clerk.rs`**: Clerk JWT 検証実装
  - JWKS 取得とキャッシュ（1時間 TTL）
  - JWT トークン検証（RS256）
  - RSA 公開鍵変換（JWK → PEM）
- **`helpers.rs`**: 認証ヘルパー関数
  - `require_auth()`: 認証必須チェック
  - `get_auth()`: オプショナル認証取得

### 2. 環境変数設定

#### docker-compose.yml
```yaml
graphql-service:
  environment:
    - CLERK_DOMAIN=enough-chipmunk-92.clerk.accounts.dev
```

#### 環境変数の優先順位
1. `CLERK_DOMAIN` (推奨)
2. `CLERK_FRONTEND_API`
3. エラー（CLERK_DOMAIN が必須）

### 3. 認証が必要なリゾルバー

以下のクエリ/ミューテーションは認証が必要です（研究者のみ）：

- **`participants`** (`src/resolvers/participant.rs`)
- **`sessions`** (`src/resolvers/timeline.rs`)
- **`timeline`** (`src/resolvers/timeline.rs`)

### 4. 認証不要のリゾルバー

以下の操作は匿名で実行可能です（参加者向け）：

- **`createParticipant`** (`src/resolvers/mutation.rs`)
- **`createSession`** (`src/resolvers/mutation.rs`)
- **`uploadArtifact`** (`src/resolvers/mutation.rs`)
- **`stimulusWords`** (`src/resolvers/participant.rs`)
- **`participant`** (`src/resolvers/participant.rs`)

## テスト方法

### 1. 基本的なテスト

```bash
# テストスクリプトを実行
./scripts/test_graphql_auth.sh
```

### 2. 手動テスト

#### 認証不要のクエリ（成功するはず）
```bash
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { stimulusWords { id japanese } }"}'
```

#### 認証が必要なクエリ（認証なし - 失敗するはず）
```bash
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { participants { id } }"}'
```

#### 認証が必要なクエリ（認証あり - 成功するはず）
```bash
# 1. ブラウザでアプリにサインイン
# 2. DevTools > Application > Cookies > __session からトークンを取得
# 3. トークンを使用してクエリを実行

curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"query": "query { participants { id } }"}'
```

### 3. Clerk トークンの取得方法

```bash
# ヘルパースクリプトを実行
./scripts/get_clerk_token.sh
```

**方法 1: ブラウザ DevTools**
1. アプリにサインイン（http://localhost:25250 または http://localhost:25260）
2. DevTools > Application > Cookies > `__session` を確認
3. クッキーの値をコピー（これがセッショントークン）

**方法 2: Clerk CLI**
```bash
npm install -g @clerk/clerk-cli
clerk login
clerk sessions create --user-id <user-id>
```

## 認証フロー

1. **リクエスト受信**: GraphQL ハンドラーがリクエストを受信
2. **トークン抽出**: `Authorization` ヘッダーから Bearer トークンを抽出
3. **JWKS 取得**: Clerk の JWKS エンドポイントから公開鍵を取得（キャッシュあり）
4. **JWT 検証**: RS256 アルゴリズムでトークンを検証
5. **コンテキスト追加**: 検証成功時、`AuthContext` を GraphQL コンテキストに追加
6. **リゾルバー実行**: リゾルバーで `require_auth()` を呼び出して認証チェック

## エラーハンドリング

- **認証トークンなし**: リクエストは続行されるが、認証が必要なリゾルバーでエラー
- **無効なトークン**: JWT 検証エラーが返される
- **JWKS 取得失敗**: エラーログを出力し、認証失敗として処理
- **CLERK_DOMAIN 未設定**: エラーメッセージを返す

## セキュリティ考慮事項

1. **JWKS キャッシュ**: 1時間 TTL でキャッシュ（鍵ローテーションに対応）
2. **トークン検証**: 有効期限、発行者、署名を検証
3. **CORS**: 許可されたオリジンのみアクセス可能
4. **認証エラー**: 詳細なエラーメッセージを返さない（セキュリティのため）

## トラブルシューティング

### CLERK_DOMAIN が設定されていない
```
Error: CLERK_DOMAIN environment variable is required
```
**解決策**: `docker-compose.yml` に `CLERK_DOMAIN` を追加

### JWKS 取得に失敗する
```
Error: Failed to fetch JWKS from Clerk
```
**解決策**: 
- ネットワーク接続を確認
- CLERK_DOMAIN が正しいか確認
- Clerk の JWKS エンドポイントにアクセス可能か確認

### トークン検証に失敗する
```
Error: Invalid token or token expired
```
**解決策**:
- トークンが有効期限内か確認
- トークンが正しい Clerk インスタンスのものか確認
- トークンの形式が正しいか確認（Bearer プレフィックス付き）

## 今後の改善点

1. **ロールベースアクセス制御**: ユーザーロールに基づく細かい権限制御
2. **レート制限**: 認証失敗時のレート制限
3. **監査ログ**: 認証イベントのログ記録
4. **トークンリフレッシュ**: セッショントークンの自動リフレッシュ

