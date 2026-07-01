# ADR 2026-07-01 — apps/web-cljc フェーズ5（KaTeX/paperページ）

## Status
Accepted.

## Context
`docs/adr-2026-07-01-web-cljc-port.md`（フェーズ0〜2、PR #20 マージ済み）は
Force3D（フェーズ3）・D3チャート（フェーズ4）・KaTeX/paperページ（フェーズ5）
を「別ADR/別セッションで扱う」としていた。本ADRはそのうちフェーズ5
（`/paper` 静的ページ、PR #21）を対象とする。

**注記**: フェーズ5の実装（PR #21）は本ADRの起票前に着手・完了しており、
本ADRは事後起票。`/review` によるPR #21レビューで指摘され是正した。フェーズ
3・4は着手前に個別ADRを起票する運用を継続する。

## Decision
主ADRは superproject 側に起票した:
`90-docs/adr/2607012230-org-spirit-in-physics-web-cljc-port-phase5-katex-paper.md`
（+ 対の `.edn`）。

- KaTeX（`katex/dist/contrib/auto-render.mjs`）を interop wrap
  （`spirit-ui.katex-interop`）。フォントは `.woff2` のみコミット。
- `spirit-ui.dom` に `:opaque` 差分スキップ機構を追加（KaTeXがDOMを直接
  書き換えるため、差分レンダラーが追跡するIRと実DOMがずれる問題への対処）。
- TOCスクロールスパイはIntersectionObserver。ルート離脱時にobserver
  disconnect + JSON-LD `<script>` 除去。
- i18nは引き続きスコープ外（`en.json`のテキストを静的EDN複製）。

## Out of scope
- フェーズ3（Force3D可視化、kami-engine結合）
- フェーズ4（D3チャート）
- i18n/多言語ルーティング

## Related
- superproject: `90-docs/adr/2607012230-org-spirit-in-physics-web-cljc-port-phase5-katex-paper.md`（主ADR）
- superproject: `90-docs/adr/2607012100-org-spirit-in-physics-web-cljc-port.md`（フェーズ0-2）
- `docs/adr-2026-07-01-web-cljc-port.md`（本リポジトリのフェーズ0-2ミラー）
