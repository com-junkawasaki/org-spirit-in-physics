#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Gateway診断スクリプト"
echo "========================"
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック関数
check() {
  local name=$1
  local cmd=$2
  echo -n "Checking $name... "
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

check_with_output() {
  local name=$1
  local cmd=$2
  echo -e "${YELLOW}=== $name ===${NC}"
  eval "$cmd" || true
  echo ""
}

# 1. GatewayClassの確認
echo "1. GatewayClassの確認"
check_with_output "GatewayClass一覧" "kubectl get gatewayclass"
check_with_output "envoy GatewayClass詳細" "kubectl get gatewayclass envoy -o yaml"

# 2. Gatewayの確認
echo "2. Gatewayリソースの確認"
check_with_output "Gateway一覧" "kubectl get gateway -n spirit-in-physics"
check_with_output "infra-gateway詳細" "kubectl get gateway infra-gateway -n spirit-in-physics -o yaml"

# 3. Gatewayのステータス確認
echo "3. Gatewayステータスの確認"
GATEWAY_STATUS=$(kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.status.addresses[0].value}' 2>/dev/null || echo "")
if [ -n "$GATEWAY_STATUS" ]; then
  echo -e "${GREEN}Gateway IP: $GATEWAY_STATUS${NC}"
else
  echo -e "${RED}Gateway IPが設定されていません${NC}"
fi

# 4. HTTPRouteの確認
echo "4. HTTPRouteの確認"
check_with_output "HTTPRoute一覧" "kubectl get httproute -n spirit-in-physics"
check_with_output "infra-main-route詳細" "kubectl get httproute infra-main-route -n spirit-in-physics -o yaml"
check_with_output "infra-https-redirect詳細" "kubectl get httproute infra-https-redirect -n spirit-in-physics -o yaml"

# 5. Envoy Gatewayの確認
echo "5. Envoy Gatewayコントローラーの確認"
check_with_output "Envoy Gateway Deployment" "kubectl get deployment -n envoy-gateway-system"
check_with_output "Envoy Gateway Pods" "kubectl get pods -n envoy-gateway-system"

# 6. Serviceの確認
echo "6. バックエンドServiceの確認"
check_with_output "portal Service" "kubectl get service portal -n spirit-in-physics -o yaml"
check_with_output "portal Deployment" "kubectl get deployment portal -n spirit-in-physics"

# 7. Certificateの確認
echo "7. TLS証明書の確認"
check_with_output "Certificate一覧" "kubectl get certificate -n spirit-in-physics"
check_with_output "sip-tls-cert詳細" "kubectl get certificate sip-tls-cert -n spirit-in-physics -o yaml"
check_with_output "Certificate Secret" "kubectl get secret sip-tls-cert -n spirit-in-physics -o yaml"

# 8. CertificateRequestとChallengeの確認
echo "8. CertificateRequestとChallengeの確認"
check_with_output "CertificateRequest一覧" "kubectl get certificaterequest -n spirit-in-physics"
check_with_output "Challenge一覧" "kubectl get challenge -n spirit-in-physics"

# 9. DNSの確認
echo "9. DNS設定の確認"
GATEWAY_IP=$(kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.status.addresses[0].value}' 2>/dev/null || echo "")
if [ -n "$GATEWAY_IP" ]; then
  echo "Gateway IP: $GATEWAY_IP"
  echo "DNS Aレコードの確認:"
  echo "  spirit-in-physics.com -> $(dig +short spirit-in-physics.com A || echo 'DNS lookup failed')"
  echo "  sip.junkawasaki.com -> $(dig +short sip.junkawasaki.com A || echo 'DNS lookup failed')"
else
  echo -e "${RED}Gateway IPが取得できないため、DNS確認をスキップ${NC}"
fi

# 10. 静的IPアドレスの確認（GKEの場合）
echo "10. GKE静的IPアドレスの確認"
if kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.metadata.annotations.networking\.gke\.io/static-ip}' > /dev/null 2>&1; then
  STATIC_IP_NAME=$(kubectl get gateway infra-gateway -n spirit-in-physics -o jsonpath='{.metadata.annotations.networking\.gke\.io/static-ip}')
  echo "静的IP名: $STATIC_IP_NAME"
  echo "GCPで確認: gcloud compute addresses describe $STATIC_IP_NAME --global"
else
  echo "静的IPアノテーションが見つかりません"
fi

echo ""
echo "診断完了"

