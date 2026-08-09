# ADR 2026-08-09 — Word association and staged emotion analysis

## Status

Word-association acquisition is implemented. Hugging Face inference is researched and pinned but disabled.

## Decision

1. Insert a 12-trial computerized word-association task between pre-self-report and audiovisual intervention.
2. Record first-input latency, submit latency, typed association, omission, self-valence, self-arousal, and per-trial camera/microphone summaries.
3. Use only within-session robust latency flags. Do not apply population norms or label flags as complexes.
4. Preserve participant self-report as the highest-authority emotion observation.
5. Record machine-analysis rows as `not-run` until a local, pinned model runner and validation protocol are implemented.
6. Prefer `neuralnaut/deberta-wrime-emotions` for future eight-dimensional Japanese annotation; reserve `Qwen/Qwen3.5-4B` for constrained semantic coding rather than emotion scoring or personality interpretation.
7. Keep emotion analysis disconnected from stimulus adaptation in protocol v0.3.

## Consequences

- The app now captures language, latency, self-report, camera, microphone, display, and speaker events in one local session structure.
- The method can reveal repeatable within-person response patterns without presenting them as clinical or Jungian findings.
- Enabling Hugging Face inference remains a separate implementation and ethics gate.
