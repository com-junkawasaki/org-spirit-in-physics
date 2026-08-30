# ADR: privateな創作シナリオを研究・実装履歴から分離する

**Status:** accepted

**Date:** 2026-08-23

## Context

既存`story.jsonnet`は研究システムの実装履歴、測定結果、社会ビジョンを一つのnarrative配列に格納して
いる。Tamaki、GoD、Nero、Seneca、Etz Hayyimを通る創作シナリオをそこへ直接混ぜると、観測済みの
研究、技術上の主張、物語上の命題の境界が失われる。

## Decision

1. 創作シナリオのprivate正本を`docs/creative-bible/scenario-spine.md`と`.edn`に置く。
2. `story.jsonnet`は既存のプロジェクト／プロセス履歴として残し、創作シナリオの正本にしない。
3. 測定値は魂、spirit、人格、AIの生命性の存在証明としてシナリオへ輸入しない。
4. 歴史・神学上の主張と、GoD／Nero／Seneca等の創作上の象徴を明示的に分離する。
5. 公開脚本、映像、研究広報へ派生させる際は、作者承認と分野別fact reviewを別々に通す。

## Consequences

- Tamakiの物語を研究実績の列から独立して育てられる。
- 物語的命題を科学的検証結果のように見せる混同を避けられる。
- `story.jsonnet`と創作正本の二つが存在するため、利用側は用途を明示して読む必要がある。

## References

- `docs/creative-bible/scenario-spine.md`
- `docs/creative-bible/scenario-spine.edn`
- `story.jsonnet`
