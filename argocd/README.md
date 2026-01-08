# ArgoCD GitOps セットアップ

このディレクトリには ArgoCD の GitOps 設定ファイルが含まれています。

## セットアップ済みの内容

✅ ArgoCD が GKE クラスターにインストールされています  
✅ LoadBalancer で外部公開されています  
✅ Timoni プラグインが設定されています

## ArgoCD へのアクセス

### 初期認証情報

- **ユーザー名**: `admin`
- **パスワード**: `JfUcAuk3te2kQ0Re`
- **URL**: http://35.243.108.4

### アクセス方法

LoadBalancer の IP アドレスを確認:
```bash
kubectl get svc argocd-server -n argocd
```

ブラウザで以下にアクセス:
```
http://35.243.108.4
# または
https://35.243.108.4 (自己署名証明書の警告が表示されます)
```

## Tilt との統合

ArgoCD と Tilt を併用して、高速な開発体験と GitOps を両立できます。

### セットアップ

```bash
# Tilt 統合設定を適用
kubectl apply -f argocd/tilt-integration.yaml

# Development Application を作成 (オプション)
kubectl apply -f argocd/dev-application.yaml
```

### 使い分け

- **ローカル開発**: Tilt を使用 (`tilt up`)
- **本番デプロイ**: Git push → ArgoCD が自動デプロイ

詳細は [TILT_INTEGRATION.md](./TILT_INTEGRATION.md) を参照してください。

### パスワード変更

初回ログイン後、パスワードを変更することを推奨します:
```bash
argocd login <ARGOCD-SERVER>
argocd account update-password
```

## Application のデプロイ

### 1. GitHub 認証を設定 (Private リポジトリの場合)

リポジトリが private の場合、認証が必要です:

```bash
# 対話的にセットアップ
./argocd/setup-github-auth.sh
```

または手動で設定:
```bash
# GitHub Personal Access Token を取得
# Settings → Developer settings → Personal access tokens → Tokens (classic)
# 'repo' スコープを選択

kubectl create secret generic github-credentials \
  --from-literal=username=<GITHUB_USERNAME> \
  --from-literal=password=<GITHUB_TOKEN> \
  --from-literal=url=https://github.com/com-junkawasaki/spirit-in-physics.git \
  --from-literal=type=git \
  --namespace=argocd

kubectl label secret github-credentials \
  -n argocd \
  argocd.argoproj.io/secret-type=repository
```

### 2. Application を作成

```bash
kubectl apply -f argocd/application.yaml
```

### 3. 同期状態を確認

```bash
# CLI で確認
kubectl get application spirit-in-physics -n argocd

# または ArgoCD UI で確認
# http://35.243.108.4
```

## GitOps ワークフロー

### 自動同期が有効な場合

1. コードを変更して Git にpush
2. ArgoCD が自動的に変更を検知（デフォルト: 3分ごと）
3. 自動的にクラスターに反映

### 手動同期の場合

```bash
# CLI から
argocd app sync spirit-in-physics

# または UI から "SYNC" ボタンをクリック
```

## Timoni との統合

ArgoCD は Timoni プラグインを使用して CUE ファイルを処理します:

- **Bundle ファイル**: `timoni/bundle.cue`
- **Runtime ファイル**: `timoni/runtime-gke.cue`

変更は自動的に検知され、適用されます。

## トラブルシューティング

### Application が同期されない

```bash
# Application の状態を確認
kubectl get application spirit-in-physics -n argocd -o yaml

# ArgoCD のログを確認
kubectl logs -n argocd deployment/argocd-application-controller
kubectl logs -n argocd deployment/argocd-repo-server
```

### Timoni プラグインが動作しない

repo-server を再起動:
```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

## セキュリティ

### 本番環境での推奨事項

1. **HTTPS を有効化**: Ingress または Gateway で TLS を設定
2. **パスワードを変更**: デフォルトの admin パスワードを変更
3. **RBAC を設定**: 必要に応じてユーザーとロールを設定
4. **SSO を設定**: Dex または OIDC で SSO を設定

## 参考リンク

- [ArgoCD 公式ドキュメント](https://argo-cd.readthedocs.io/)
- [Timoni ドキュメント](https://timoni.sh/)

