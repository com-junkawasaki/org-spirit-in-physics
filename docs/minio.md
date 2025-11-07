# MinIO Local Setup Plan

## 概要

MinIOをローカル環境でセットアップし、graphqlサービスのblob_storage.rsをAWS S3互換のAPIでMinIOに接続するように実装する。

## 実装内容

### 1. docker-compose.ymlにMinIOサービスを追加

- `minio`サービスを追加
- ポート: 9000 (API), 9001 (Console)
- 環境変数: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
- ボリューム: minio_data
- 初期バケット作成用のentrypointスクリプト

### 2. graphqlサービスの環境変数を追加

- `AWS_ACCESS_KEY_ID`: MinIOのアクセスキー
- `AWS_SECRET_ACCESS_KEY`: MinIOのシークレットキー
- `AWS_ENDPOINT_URL`: MinIOのエンドポイント (http://minio:9000)
- `AWS_REGION`: デフォルト値 us-east-1
- `AWS_S3_BUCKET_NAME`: spirit-in-physics

### 3. Rust S3クライアントライブラリの追加

- `performers/services/graphql/Cargo.toml`に`aws-sdk-s3`を追加
- または`rusoto_s3`を使用（軽量な選択肢）

### 4. blob_storage.rsの実装更新

- `performers/services/graphql/src/blob_storage.rs`を更新
- AWS S3 SDKを使用してMinIOに接続
- `upload_to_blob_storage`: S3 PutObject APIを使用
- `download_from_blob_storage`: S3 GetObject APIを使用
- エンドポイントURLを環境変数から読み込み

### 5. MinIO初期化スクリプト

- MinIOコンテナ起動時に`spirit-in-physics`バケットを自動作成
- mc (MinIO Client)を使用してバケット作成

## ファイル変更

1. `docker-compose.yml`: MinIOサービス追加
2. `performers/services/graphql/Cargo.toml`: aws-sdk-s3依存関係追加
3. `performers/services/graphql/src/blob_storage.rs`: S3 API実装に更新
4. `performers/services/graphql/Dockerfile`: 必要に応じて更新（通常は不要）

## 環境変数仕様（AWS互換）

- `AWS_ACCESS_KEY_ID`: MinIOアクセスキー
- `AWS_SECRET_ACCESS_KEY`: MinIOシークレットキー
- `AWS_ENDPOINT_URL`: MinIOエンドポイント（例: http://minio:9000）
- `AWS_REGION`: リージョン（デフォルト: us-east-1）
- `AWS_S3_BUCKET_NAME`: バケット名（spirit-in-physics）

## 注意事項

- MinIOはAWS S3互換APIを提供するため、AWS SDKをそのまま使用可能
- ローカル開発環境では`AWS_ENDPOINT_URL`を設定することでMinIOに接続
- 本番環境では環境変数を変更するだけでAWS S3に切り替え可能