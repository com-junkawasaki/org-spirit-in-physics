# ADR 2026-07-01 — apps/api-worker を CLJC (`:esm` fetch worker) へ移植

## Status
Proposed.

## Context
オーナー指示により、`org-spirit-in-physics`（TypeScript/SvelteKit ベース）を段階的に
`.cljc` へ移行する。まず最小・自己完結な `apps/api-worker`（Hono BFF, ~2,300行,
D1+R2のみ・DO/KV無し）を先行移植する。`apps/web`/`apps/researcher` の Svelte UI
（~13,000行）移植は別フェーズ。

superproject（`com-junkawasaki/root`）には既に
`90-docs/adr/2606290000-all-workers-cljc-only-policy.md`（gftdcojp org スコープ、
shadow-cljs `:esm` fetch worker = Pattern B の実績: app-aozora appview）があり、
本移植はこの Pattern B の `com-junkawasaki` 初適用にあたる。

## Decision
主 ADR は superproject 側に起票した:
`90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port.md`（+ 対の `.edn`）。

設計判断の要点（詳細は主ADR参照）:
- **D1 アクセス**: 生 SQL + `^js` interop を手書き。汎用クエリビルダは作らない
  （Kysely 相当の CLJC 前例が組織に無く、クエリ数~15-20で過剰設計）。
- **WebAuthn**: `@simplewebauthn/server` を shadow-cljs npm interop でラップ
  （COSE/CBOR/attestation 検証を CLJS で再実装しない。ADR-2606290000 の
  TS-only SDK exemption 条項に合致）。
- **セッション Cookie (HMAC)**: `js/crypto.subtle` interop で直接 `.cljc` に移植。
- **LangGraph (`StateGraph`)**: 廃止しプレーンな `.cljc` 関数合成に置換。現状の
  グラフは線形チェーンでLLM呼び出しも分岐も無く、グラフエンジンを持ち込む理由が
  無いため。`graph_runs`/`graph_checkpoints`/`graph_node_events` への書き込みは
  既存と同形を維持（挙動不変）。
- **`deps.edn`/JVM テスト層**: 作らない（app-aozora Pattern B 前例に揃える。この
  worker は langgraph-clj StateGraph actor ではなくステートレス edge worker）。
- **D1 migrations**: 既存 SQL をそのまま流用（無変更）、既存 `database_id`/R2
  bucket 名を再利用。

実装は `apps/api-worker-cljc/` に新規ディレクトリとして追加し、既存
`apps/api-worker`（TS版）は cutover 完了・soak 期間経過まで並存させる。

## Out of scope
- `apps/web`/`apps/researcher` の Svelte UI 移植
- 本番デプロイ・DNS ルート切替
- 既存 `apps/api-worker`（TS版）の削除

## Related
- superproject: `90-docs/adr/2606290000-all-workers-cljc-only-policy.md`
- superproject: `90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port.md`（主ADR）
