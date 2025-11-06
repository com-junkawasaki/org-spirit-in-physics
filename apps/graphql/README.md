# GraphQL API (Rust)

Rust製のGraphQL APIサーバーです。PostgreSQLをデータストアとして使用します。

## セットアップ

### 1. データベースの準備

PostgreSQLが起動していることを確認してください。

```bash
docker-compose up -d postgres
```

### 2. Diesel CLIのインストール

```bash
cargo install diesel_cli --no-default-features --features postgres
```

### 3. 環境変数の設定

`.env`ファイルを作成し、`DATABASE_URL`を設定してください：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### 4. Dieselのセットアップ

```bash
cd apps/graphql
diesel setup
```

### 5. スキーマの生成

既存のSupabaseスキーマを使用する場合、スキーマを手動で生成する必要があります：

```bash
diesel print-schema --database-url $DATABASE_URL > src/schema.rs
```

### 6. ビルドと実行

```bash
cargo build --release
cargo run
```

または、Docker Composeを使用：

```bash
docker-compose up graphql
```

## API エンドポイント

- GraphQL API: `http://localhost:8080/graphql`
- GraphiQL Playground: `http://localhost:8080/`

## 開発

### ホットリロード

開発中は、`cargo watch`を使用してホットリロードを有効にできます：

```bash
cargo install cargo-watch
cargo watch -x run
```

