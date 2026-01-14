#!/usr/bin/env bash
set -euo pipefail

echo "🔧 GatewayとDNSの修正スクリプト"
echo "================================"
echo ""

# 静的IPアドレス
STATIC_IP="34.160.140.248"
DOMAIN1="spirit-in-physics.com"
DOMAIN2="sip.junkawasaki.com"

echo "1. Gatewayの静的IPアノテーションを確認"
kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.metadata.annotations.networking\.gke\.io/static-ip}' && echo ""

echo "2. Gatewayの現在のIPアドレス"
CURRENT_IP=$(kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.status.addresses[0].value}')
echo "現在のIP: $CURRENT_IP"
echo "期待されるIP: $STATIC_IP"
echo ""

if [ "$CURRENT_IP" != "$STATIC_IP" ]; then
  echo "⚠️  GatewayのIPアドレスが静的IPと一致していません"
  echo "   GKE環境で実行していることを確認してください"
  echo "   Gatewayが静的IPを取得するまで数分かかる場合があります"
  echo ""
fi

echo "3. DNSレコードの確認"
DNS1=$(dig +short "$DOMAIN1" A || echo "")
DNS2=$(dig +short "$DOMAIN2" A || echo "")
echo "$DOMAIN1 -> $DNS1"
echo "$DOMAIN2 -> $DNS2"
echo ""

if [ "$DNS1" != "$STATIC_IP" ] || [ "$DNS2" != "$STATIC_IP" ]; then
  echo "⚠️  DNSレコードが正しいIPアドレスを指していません"
  echo ""
  echo "以下のDNSレコードを設定してください:"
  echo "  $DOMAIN1  A  $STATIC_IP"
  echo "  $DOMAIN2  A  $STATIC_IP"
  echo ""
  echo "DNSプロバイダーで設定後、以下のコマンドで確認できます:"
  echo "  dig +short $DOMAIN1 A"
  echo "  dig +short $DOMAIN2 A"
  echo ""
fi

echo "4. 証明書の状態確認"
kubectl get certificate sip-tls-cert -n spirit-in-physics -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' && echo ""
echo ""

echo "5. Challengeの状態確認"
kubectl get challenge -n spirit-in-physics -o custom-columns=NAME:.metadata.name,DOMAIN:.spec.dnsName,STATE:.status.state,REASON:.status.reason
echo ""

echo "完了"
echo ""
echo "次のステップ:"
echo "1. DNSレコードを $STATIC_IP に更新"
echo "2. DNSの伝播を待つ（通常5-10分）"
echo "3. 証明書が自動的に発行されるのを待つ（数分）"
echo "4. 以下のコマンドで証明書の状態を確認:"
echo "   kubectl get certificate sip-tls-cert -n spirit-in-physics"
echo "   kubectl get challenge -n spirit-in-physics"

