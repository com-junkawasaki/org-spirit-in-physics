#!/bin/bash
# 緊急停止スクリプト - 予算超過時に実行

set -e

echo "⚠️  緊急停止を開始します..."
echo ""

# 現在のコンテキストを確認
CONTEXT=$(kubectl config current-context)
echo "現在のコンテキスト: $CONTEXT"
echo ""

if [[ $CONTEXT != *"gke"* ]]; then
    echo "❌ GKE クラスターに接続されていません"
    exit 1
fi

echo "以下の Namespace の全 Deployment をスケール 0 にします:"
echo "- argocd"
echo "- spirit-in-physics"
echo "- cert-manager"
echo ""

read -p "本当に実行しますか? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "キャンセルしました"
    exit 0
fi

echo ""
echo "🛑 停止中..."

# ArgoCD を停止
echo "ArgoCD を停止..."
kubectl scale deployment --all --replicas=0 -n argocd
kubectl scale statefulset --all --replicas=0 -n argocd

# アプリケーションを停止
echo "アプリケーションを停止..."
kubectl scale deployment --all --replicas=0 -n spirit-in-physics
kubectl scale statefulset --all --replicas=0 -n spirit-in-physics

# cert-manager を停止
echo "cert-manager を停止..."
kubectl scale deployment --all --replicas=0 -n cert-manager

echo ""
echo "✅ 緊急停止完了"
echo ""
echo "再開するには以下を実行:"
echo "  cd /Volumes/251214/jun784/spirit-in-physics"
echo "  timoni bundle apply -f timoni/bundle.cue -r timoni/runtime-gke.cue"
