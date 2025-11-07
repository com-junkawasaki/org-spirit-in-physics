# Importer Service

Rust製のデータインポートサービスです。参加者の実験データセットをPostgreSQLデータベースにインポートします。

## 機能

- セッションデータ（JSON）のパースとインポート
- 同意データ（JSON）のインポート
- 生理学的データ（CSV）のパースとインポート
- HumeAIアーティファクト（CSV）のパースとインポート
- データ検証（整合性、完全性、品質チェック）

## セットアップ

### 1. データベースの準備

PostgreSQLが起動していることを確認してください。

```bash
docker-compose up -d postgres
```

### 2. 環境変数の設定

`.env`ファイルを作成し、`DATABASE_URL`を設定してください：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### 3. ビルドと実行

```bash
cargo build --release
cargo run -- /path/to/dataset/folder
```

または、Docker Composeを使用：

```bash
docker-compose --profile importer run --rm --entrypoint /app/importer importer /app/dataset/participants/{participant-id}
```

## 使用方法

### データセット構造

データセットフォルダには以下のファイルが含まれている必要があります：

- `session_data.json`: セッションイベントと参加者情報
- `consent.json`: 同意情報（オプション）
- `*.CSV`: 生理学的データ（Mod-002形式）
- `HumeAI_artifacts_*/`: HumeAIアーティファクトディレクトリ

### インポート実行

```bash
./target/release/importer /path/to/participant/dataset
```

### 検証プロセス

インポート完了後、自動的にデータ検証が実行されます。検証結果は以下の項目をチェックします：

#### データ整合性
- 外部キー制約の検証
- NULL値の検証（必須フィールド）
- データ型の検証
- ENUM値の検証

#### データ完全性
- 参加者レコードの存在確認
- セッションレコード数の検証
- イベントレコード数の検証
- レスポンスレコード数の検証
- 感情データ・生理学的データの存在確認

#### データ品質
- タイムスタンプの有効性
- 数値の範囲チェック（負の値、異常に大きい値）
- 文字列の長さチェック
- JSONデータの形式チェック

検証結果はログに出力され、エラーや警告がある場合は報告されます。

## テスト

### Unit Tests

```bash
cargo test --lib
```

### Integration Tests

```bash
cargo test --test integration_test
```

### テストデータ

テスト用のfixtureデータは `tests/fixtures/` ディレクトリにあります。

## 開発

### ホットリロード

開発中は、`cargo watch`を使用してホットリロードを有効にできます：

```bash
cargo install cargo-watch
cargo watch -x "run -- /path/to/test/dataset"
```

## アーキテクチャ

### モジュール構造

- `models/`: データモデル定義
- `parsers/`: JSON/CSVパーサー
- `importers/`: データベースインポーター
- `validation/`: データ検証モジュール
  - `integrity.rs`: 整合性チェック
  - `completeness.rs`: 完全性チェック
  - `quality.rs`: 品質チェック
  - `report.rs`: 検証レポート

### データフロー

1. データセットフォルダの読み込み
2. JSON/CSVファイルのパース
3. データベースへのインポート
4. データ検証の実行
5. 検証レポートの生成

## トラブルシューティング

### よくあるエラー

1. **データベース接続エラー**
   - `DATABASE_URL`が正しく設定されているか確認
   - PostgreSQLが起動しているか確認

2. **パースエラー**
   - JSON/CSVファイルの形式が正しいか確認
   - ファイルのエンコーディングを確認（UTF-8推奨）

3. **検証エラー**
   - 検証レポートを確認して、どの項目が失敗しているか確認
   - データの整合性を手動で確認

## ライセンス

（プロジェクトのライセンスに従う）

