#!/bin/bash
# GitHub 認証を ArgoCD に設定するスクリプト

set -e

echo "=== ArgoCD GitHub 認証設定 ==="
echo ""
echo "このスクリプトは GitHub Personal Access Token を使用して ArgoCD に認証を設定します。"
echo ""
echo "事前準備:"
echo "1. GitHub で Personal Access Token を作成"
echo "   - Settings → Developer settings → Personal access tokens → Tokens (classic)"
echo "   - 'repo' スコープを選択"
echo ""

read -p "GitHub Personal Access Token を入力してください: " GITHUB_TOKEN
read -p "GitHub ユーザー名を入力してください: " GITHUB_USERNAME

if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_USERNAME" ]; then
    echo "エラー: トークンまたはユーザー名が入力されていません"
    exit 1
fi

echo ""
echo "ArgoCD に GitHub 認証情報を設定中..."

kubectl create secret generic github-credentials \
  --from-literal=username="$GITHUB_USERNAME" \
  --from-literal=password="$GITHUB_TOKEN" \
  --namespace=argocd \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl label secret github-credentials \
  -n argocd \
  argocd.argoproj.io/secret-type=repository \
  --overwrite

kubectl annotate secret github-credentials \
  -n argocd \
  managed-by=argocd.argoproj.io \
  --overwrite

kubectl patch secret github-credentials -n argocd \
  --type merge \
  -p "{\"stringData\":{\"url\":\"https://github.com/com-junkawasaki/spirit-in-physics.git\",\"type\":\"git\"}}"

echo ""
echo "✅ GitHub 認証情報が設定されました"
echo ""
echo "Application を再同期しています..."
kubectl delete application spirit-in-physics -n argocd 2>/dev/null || true
sleep 5
kubectl apply -f /Volumes/251214/jun784/spirit-in-physics/argocd/application.yaml

echo ""
echo "✅ 完了しました"
echo ""
echo "ArgoCD UI で同期状態を確認してください:"
echo "http://35.243.108.4"

