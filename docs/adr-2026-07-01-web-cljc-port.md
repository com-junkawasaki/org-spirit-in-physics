# ADR 2026-07-01 — apps/web + apps/researcher を CLJC (cljc-ui-IR) へ移植

## Status
Proposed.

## Context
api-worker の CLJC 移植（`docs/adr-2026-07-01-api-worker-cljc-port.md`、
PR #19 マージ済み）に続き、フロントエンド（`apps/web` ~9,900行 +
`apps/researcher` ~4,500行、SvelteKit 2 / Svelte 5 runes）を移植する。

事前調査で判明した重要な事実（詳細は主ADR参照）:
- 参照実装として想定していた cloud-murakumo の cljc-ui-IR パターンは実際には
  369行・単一commitのPoCで、差分レンダラー・パラメータ付きルーティング・
  フォームプリミティブは無い。本移植でこれらを新規に構築する。
- 3D可視化には `orgs/com-junkawasaki/kami-engine` + `kami-engine-sdk-clj` が
  実在の土台としてあるが、オービットカメラ・エッジ描画・力学シミュレーション
  のcljs結線は無く、新規結合作業が必要。
- D3チャート・KaTeX数式には組織内にcljs相当が無く、npm interop wrapで対応
  する方針（WebAuthn移植と同じ戦術）。

## Decision
主ADRは superproject 側に起票した:
`90-docs/adr/2607012100-org-spirit-in-physics-web-cljc-port.md`（+ 対の `.edn`）。

フェーズ0〜2（cljc-ui-IR基盤 + pkg/*データ移植 + 3D/D3/KaTeX非依存の単純
ページ先行移植 + 認証配線）のみを本ADRの対象とする。Force3D可視化
（kami-engine結合）・D3チャート・KaTeX/paperページは別ADR/別セッションに
先送りする。

実装は `apps/web-cljc/` に新規ディレクトリとして追加し、既存
`apps/web`・`apps/researcher`（SvelteKit版）は段階移行完了まで並存させる。

## Out of scope
- Force3D可視化（kami-engine結合）
- D3チャート（TimelineChart/KPICards）
- KaTeX/paperページ
- 本番デプロイ・cutover・既存SvelteKitアプリの削除

## Related
- superproject: `90-docs/adr/2606290000-all-workers-cljc-only-policy.md`
- superproject: `90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port.md`
- superproject: `90-docs/adr/2607012100-org-spirit-in-physics-web-cljc-port.md`（主ADR）
