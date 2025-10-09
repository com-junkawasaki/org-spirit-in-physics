# Spirit in Physics - Dev Container Setup

このディレクトリには、VSCode Dev Containersを使用した開発環境の設定が含まれています。

## 概要

この設定により、Dockerコンテナ内で一貫した開発環境を提供します：
- Kotlin/Spring Boot Backend
- Next.js Frontend Apps (Patient, Visualizer)
- Vite Admin Dashboard
- Python Temporal Analyzer
- PostgreSQL, Axon Server, Temporal Serverなどのインフラサービス

## セットアップ方法

### 前提条件

- VSCode
- Dev Containers拡張機能 (`ms-vscode-remote.remote-containers`)
- Docker DesktopまたはDocker Engine

### 起動方法

1. VSCodeを開く
2. コマンドパレットを開く（`Cmd/Ctrl + Shift + P`）
3. "Dev Containers: Reopen in Container" を選択
4. または、VSCodeの左下の緑色のアイコンをクリックして "Reopen in Container" を選択

初回起動時はDockerイメージのビルドに時間がかかります。

## 開発環境の構成

### 使用可能なサービス

開発コンテナ起動時に以下のサービスが自動的に起動します：

- **PostgreSQL** (ポート 5432)
- **Axon Server** (HTTP: 8024, gRPC: 8124)
- **Temporal Server** (gRPC: 7233, HTTP: 8233)
- **Pact Broker** (ポート 9292)
- **Backend API** (ポート 8080) - 開発モード
- **Patient App** (ポート 3002)
- **Admin Dashboard** (ポート 3001)
- **Visualizer** (ポート 3003)
- **Analyzer Temporal API** (ポート 8081)

### インストール済みツール

- **Java 21** & **Gradle 8.5** (Backend開発用)
- **Node.js LTS** & **Yarn** (Frontend開発用)
- **Python 3.11** & **pip** (Python開発用)
- **Docker CLI** (コンテナ操作用)
- **GitHub CLI** (Git操作用)

### VSCode拡張機能

以下の拡張機能が自動的にインストールされます：

- TypeScript/JavaScript開発支援
- Python開発支援
- Kotlin開発支援
- Docker支援
- データベース支援
- テスト支援
- Git支援

## 開発ワークフロー

### Backend開発 (Kotlin/Spring Boot)

1. `apps/backend` フォルダで作業
2. コード変更時に自動リロードが有効
3. デバッグはVSCodeのデバッガーを使用

### Frontend開発 (Next.js/Vite)

1. 各アプリのフォルダで作業 (`apps/patient`, `apps/admin`, `apps/visualizer`)
2. ホットリロードが有効
3. デバッグはVSCodeのデバッガーを使用

### Python開発 (Temporal Analyzer)

1. `apps/analyzer-temporal` フォルダで作業
2. Python拡張機能が有効

## トラブルシューティング

### コンテナ起動に失敗する場合

```bash
# Docker Desktopが起動しているか確認
docker --version

# 既存のコンテナをクリーンアップ
docker system prune -a
```

### ポート競合の場合

他のアプリケーションが同じポートを使用していないか確認してください。

### メモリ不足の場合

Docker Desktopのメモリ割り当てを増やしてください（推奨: 4GB以上）。

## カスタマイズ

### 拡張機能を追加する場合

`.devcontainer/devcontainer.json` の `extensions` 配列に追加してください。

### 環境変数を追加する場合

`.devcontainer/docker-compose.override.yml` で設定してください。

### 新しいサービスを追加する場合

`docker-compose.yml` にサービスを追加し、`.devcontainer/devcontainer.json` の `forwardPorts` にポートを追加してください。

## 関連リンク

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Spirit in Physics Project](../README.md)
