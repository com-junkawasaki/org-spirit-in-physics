# ADR 2026-07-01 — apps/web-cljc フェーズ4（D3 timeline/KPIチャート）

## Status
Accepted.

## Context
`docs/adr-2026-07-01-web-cljc-port.md`（フェーズ0〜2）は D3チャート
（フェーズ4）を「別ADR/別セッションで扱う」としていた。本ADRはそのフェーズ4
（`TimelineChart.svelte` + `KPICards.svelte`）を対象とする。

事前調査で判明した事実（詳細は主ADR参照）:
- `TimelineChart`/`KPICards` は `TimelineVisualization.svelte`（web/researcher
  間でバイト同一）の `'timeline'` タブでのみ使われ、`Force3DThrelte` 等の
  フェーズ3領域には依存しない。実際に到達可能な5ルートで確認済み。
- D3 API surfaceは小さく明確（scale/extent/max/area/line/brushX/axis等、
  force simulation・canvasは不使用）。ADR-2606290000の exemption条項で
  npm interop wrap。
- データは `apps/api-worker-cljc/src/spirit/routes/timeline.cljk`
  （フェーズ0で移植済み）が既に提供、新規バックエンド作業は不要。
- KPICardsの前回値差分は `Math.random()` ベースのdemo placeholder。
  オーナー判断（2026-07-01）で本移植では省略。

## Decision
主ADRは superproject 側に起票した:
`90-docs/adr/2607012330-org-spirit-in-physics-web-cljc-port-phase4-d3-timeline.md`
（+ 対の `.edn`）。

`TimelineVisualization` のシェル（タブ切替+データ取得）+ `KPICards`/
`TimelineChart` を移植。D3のSVG直接DOM操作は `spirit-ui.dom` の `:opaque`
機構（フェーズ5のKaTeXで導入）を再利用して受け止める。`'force3d'` タブは
フェーズ3待ちのプレースホルダとする。

## Out of scope
- フェーズ3（Force3D可視化、kami-engine結合）
- `StructureAnalysisPanel`（フェーズ3領域）
- KPICardsの前回値差分（省略）

## Related
- superproject: `90-docs/adr/2607012330-org-spirit-in-physics-web-cljc-port-phase4-d3-timeline.md`（主ADR）
- superproject: `90-docs/adr/2607012100-org-spirit-in-physics-web-cljc-port.md`（フェーズ0-2）
- superproject: `90-docs/adr/2607012230-org-spirit-in-physics-web-cljc-port-phase5-katex-paper.md`（フェーズ5、`:opaque`機構の初出）
- `docs/adr-2026-07-01-web-cljc-port.md`（本リポジトリのフェーズ0-2ミラー）
