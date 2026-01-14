# 予算ハードリミット設定

## 🎯 目標
**月額 $150 (¥22,500) を絶対に超えない**

---

## ✅ 実施した設定

### 1. ResourceQuota によるリソース制限

各 Namespace にハードリミットを設定:

#### argocd
- CPU 要求上限: 2.5 vCPU
- Memory 要求上限: 9 GB
- Pod 数上限: 10個

#### spirit-in-physics
- CPU 要求上限: 1.0 vCPU
- Memory 要求上限: 2 GB
- Pod 数上限: 10個

#### cert-manager
- CPU 要求上限: 0.8 vCPU
- Memory 要求上限: 2 GB
- Pod 数上限: 5個

**合計上限**: 4.3 vCPU + 13 GB = **約 $155/月**

---

### 2. 予算アラート（Cloud Console で設定）

Cloud Billing Budget API を有効化する必要があります:
https://console.developers.google.com/apis/api/billingbudgets.googleapis.com/overview?project=com-junkawasaki-sip

設定する閾値:
- 80% ($120): 警告
- 90% ($135): 緊急警告
- 95% ($142.5): 最終警告
- 100% ($150): 超過

---

### 3. 緊急停止スクリプト

予算超過時に手動で実行:

```bash
/Volumes/251214/jun784/spirit-in-physics/scripts/emergency-stop.sh
```

このスクリプトは:
- ArgoCD、spirit-in-physics、cert-manager の全 Deployment を停止
- StatefulSet も停止
- コストを即座に $0 に削減

---

## 📊 現在のコスト構造

| 項目 | リソース要求 | 月額コスト |
|------|-------------|-----------|
| ArgoCD | 1.4 vCPU + 3.5 GB | $44 |
| cert-manager | 0.6 vCPU + 1.5 GB | $19 |
| spirit-in-physics | 0.6 vCPU + 1.5 GB | $19 |
| Envoy Gateway | 0.2 vCPU + 0.8 GB | $8 |
| LoadBalancer | - | $18 |
| **合計** | **2.8 vCPU + 7.3 GB** | **$108** |

**安全マージン**: $150 - $108 = **$42** (39%)

---

## ⚠️ 予算超過を防ぐために

### 自動防止策
- ✅ ResourceQuota: 新しい Pod が制限を超えて作成できない
- ✅ GKE Autopilot: 要求されたリソース分だけ課金

### 手動監視
1. **毎週 Cloud Console でコストを確認**:
   https://console.cloud.google.com/billing/01D19B-270951-8AEBF5

2. **$135 到達時のアクション**:
   - 不要な Pod を停止
   - temporal など一時的に不要なサービスを停止

3. **$145 到達時のアクション**:
   ```bash
   /Volumes/251214/jun784/spirit-in-physics/scripts/emergency-stop.sh
   ```

---

## 🔄 サービス再開方法

停止後、再開するには:

```bash
cd /Volumes/251214/jun784/spirit-in-physics
kubectl config use-context gke_com-junkawasaki-sip_asia-northeast1_spirit-autopilot
timoni bundle apply -f timoni/bundle.cue -r timoni/runtime-gke.cue
```

---

## 📝 さらなるコスト削減策

1. **開発環境を OrbStack に完全移行**
   - GKE は本番のみ使用
   - 月額コスト: $108 → $80

2. **不要なサービスを削除**
   - temporal (検討中): -$8/月

3. **リージョン変更を検討**
   - asia-northeast1 (東京) → asia-southeast1 (シンガポール)
   - 約 10% 削減

---

**作成日**: 2026-01-13
**最終更新**: 2026-01-13
