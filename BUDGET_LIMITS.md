# 予算とコスト方針

## 現状(2026-05 以降): Cloudflare native

| サービス | 料金体系 | 現状の見込み |
| --- | --- | --- |
| Cloudflare Workers (3 つ: `api`, `web`, `researcher`) | Free: 100k req/day, $5/月 (Standard) で 10M req/月 + 30M CPU ms/月 | 参加者が一桁台のうちは Free tier 内 |
| Cloudflare D1 (`spirit-in-physics`) | Free: 5 GB / 5M rows read · 100k rows write per day | 現データ量(participants / assessment events / artifact metadata)では Free 内 |
| Cloudflare R2 (`spirit-in-physics-artifacts`) | Free: 10 GB ストレージ + Class A 1M / Class B 10M op/月 | 1 セッション video 50–200 MB 想定。Free tier だと 50–200 セッション分。超えると $0.015 / GB / 月 |
| Cloudflare DNS / Universal SSL | 無料 | 影響なし |
| 独自ドメイン `spirit-in-physics.com` | Squarespace registrar: ~$20/年 | 無視できる |
| Auth (WebAuthn / passkeys, self-hosted in api-worker) | Cloudflare D1 + R2 + Workers の枠内 | 追加コストなし |
| Hume AI(任意、外部 API) | 従量 | 利用量に応じて別管理 |

**実効固定コスト**: 現状ほぼ $0 / 月。R2 ストレージが Free tier を超えるか、Workers の リクエスト量が日次 100k を超えると課金開始。

## 監視

- Cloudflare Dashboard → Analytics で日次リクエスト、CPU ms、R2 op 数、D1 query 数を確認。
- Cloudflare Billing → アカウント設定で月額上限アラートを設定可能(Free でも可)。

## 旧 GKE 時代の予算メモ

GKE / ResourceQuota / Cloud Billing Budget の旧運用は
[docs/legacy-runtime-archive.md](docs/legacy-runtime-archive.md) と
[archive/kubernetes](archive/kubernetes) を参照。当時の月額目標は
$150、内訳は ArgoCD / cert-manager / spirit-in-physics namespace / Envoy
Gateway / LoadBalancer。GCP プロジェクト
`com-junkawasaki-sip` を 2026-05-17 に soft-delete したのでこの予算枠は失効。
