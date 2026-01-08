# ArgoCD + Tilt Integration

このプロジェクトは ArgoCD と Tilt を統合して、高速な開発体験と GitOps の両立を実現しています。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Workflow                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Local Changes                                                │
│       │                                                       │
│       ├──> Tilt ──────────────> OrbStack/Local K8s          │
│       │    (Instant)            (Fast Feedback Loop)         │
│       │                                                       │
│       └──> Git Push ──> ArgoCD ──> GKE                       │
│            (Manual)      (Auto)    (Production)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## セットアップ

### 1. Tilt のインストール

```bash
# macOS
brew install tilt-dev/tap/tilt

# Linux
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

### 2. ローカル開発環境の起動

```bash
# OrbStack (ローカル) で開発
kubectl config use-context orbstack
tilt up

# または GKE で開発 (非推奨、コストがかかる)
kubectl config use-context gke_com-junkawasaki-sip_asia-northeast1_spirit-autopilot
tilt up -- --runtime=gke
```

Tilt UI が自動的に開きます: http://localhost:10350

### 3. ArgoCD との統合設定 (初回のみ)

```bash
# Development 用の設定を適用
kubectl apply -f argocd/tilt-integration.yaml

# Development Application を作成 (オプション)
kubectl apply -f argocd/dev-application.yaml
```

## 開発ワークフロー

### Inner Loop (高速フィードバック)

Tilt を使用した開発:

1. **Tilt を起動**:
   ```bash
   tilt up
   ```

2. **コードを編集**:
   - ファイルを保存すると自動的にビルド・デプロイ
   - Live update でコンテナ再起動なしに変更を反映

3. **即座に確認**:
   - Portal: http://localhost:3000
   - Temporal UI: http://localhost:8088
   - MinIO: http://localhost:9001

### Outer Loop (本番デプロイ)

GitOps による本番デプロイ:

1. **変更をコミット**:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```

2. **ArgoCD が自動デプロイ**:
   - 約3分以内に GKE に反映
   - ArgoCD UI で進捗確認: http://35.243.108.4

## Tilt の機能

### Live Update

コンテナを再ビルドせずに変更を反映:

- **Svelte App**: `src/` の変更を即座に反映
- **Go Service**: コード変更時に自動リビルド
- **Python Service**: コード変更時に自動リロード
- **TypeScript Worker**: コード変更時に自動リビルド

### カスタムボタン

Tilt UI から実行可能:

- **run-tests**: テストを実行
- **sync-argocd**: ArgoCD の同期を手動トリガー

### リソースグループ

Tilt UI でリソースを整理:

- **frontend**: Portal
- **backend**: gRPC, Import Service
- **infrastructure**: Temporal, LakeFS, MinIO, TimescaleDB
- **argocd**: ArgoCD Server (GKE mode)
- **tools**: カスタムコマンド

## ArgoCD との共存

### 設定の違い

| 設定 | Development (Tilt) | Production (ArgoCD) |
|------|-------------------|---------------------|
| **Auto Sync** | 無効 | 有効 |
| **Self Heal** | 無効 | 有効 |
| **Prune** | 無効 | 有効 |
| **Runtime** | orbstack | gke |

### Tilt が管理するリソース

ArgoCD は以下のアノテーションを持つリソースを無視します:

```yaml
metadata:
  annotations:
    tilt.dev/update-mode: "auto"
    tilt.dev/resource-id: "..."
  labels:
    tilt.dev/resource: "..."
```

### 競合の回避

1. **ローカル開発**: Tilt のみを使用
2. **本番環境**: ArgoCD のみを使用
3. **同じクラスターで両方使用しない** (推奨)

## トラブルシューティング

### Tilt が起動しない

```bash
# Context を確認
kubectl config current-context

# Timoni が正しくインストールされているか確認
timoni version

# Tilt のログを確認
tilt logs
```

### ArgoCD が Tilt の変更を上書きする

Development Application を使用している場合:

```bash
# Self-heal を無効化
kubectl patch application spirit-in-physics-dev -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":false}}}}'
```

### リソースが重複する

```bash
# Tilt を停止
tilt down

# リソースをクリーンアップ
kubectl delete namespace spirit-in-physics

# 再起動
tilt up
```

## ベストプラクティス

### ローカル開発

✅ **推奨**:
- OrbStack で Tilt を使用
- 変更を即座に確認
- Git にpush する前にローカルでテスト

❌ **非推奨**:
- GKE で Tilt を使用 (コストがかかる)
- ローカルとリモートを頻繁に切り替える

### 本番デプロイ

✅ **推奨**:
- Git にpush して ArgoCD に任せる
- ArgoCD UI で進捗を監視
- 問題があれば Git で revert

❌ **非推奨**:
- 本番環境に直接 `kubectl apply`
- ArgoCD の auto-sync を無効化したまま放置

## 参考リンク

- [Tilt 公式ドキュメント](https://docs.tilt.dev/)
- [ArgoCD + Tilt Integration](https://argo-cd.readthedocs.io/en/stable/developer-guide/tilt/)
- [Timoni ドキュメント](https://timoni.sh/)

