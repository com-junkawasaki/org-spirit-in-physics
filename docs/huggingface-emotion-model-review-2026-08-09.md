# Hugging Face Japanese emotion model review — 2026-08-09

## Decision

Use a task-specific Japanese emotion regressor as the future primary machine annotation, and use a compact multilingual generative LLM only for constrained semantic coding. Neither model output overrides participant self-report, triggers a diagnosis, or directly controls stimulus intensity.

The implemented browser app records an inference manifest with status `not-run`. Model weights are not downloaded and no response text is sent to Hugging Face or another external API.

## Candidates

| Model | Current pinned revision | Strength | Limitation | Decision |
|---|---|---|---|---|
| `neuralnaut/deberta-wrime-emotions` | `4017945a83921e59f7c55b8294ca418a97ee567f` | Japanese WRIME writer labels; eight continuous Plutchik dimensions; MIT; explicit test metrics | 0.2B F32; SNS domain; Pearson 0.472 overall and trust 0.2635; not an LLM | Preferred future primary machine annotation |
| `tojohere/goemotions-ja-xlm-roberta-base` | `f4e6d9b6fcd9ca74ba2919e860a368f78fd2d470` | 28 labels; Apache-2.0; ONNX INT8; Japanese and bilingual data | 266 MB browser download; macro-F1 0.376; some rare emotions missed; reproduction checkpoint is ONNX-only | Experimental fine-grained comparison, not authority |
| `Qwen/Qwen3.5-4B` | `851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a` | Apache-2.0; 4B; 201 languages/dialects; official local/server support | Not trained or validated as an emotion instrument; multimodal/generative complexity | Preferred secondary structured semantic coding only, thinking disabled, deterministic JSON schema |
| `google/gemma-4-E2B-it` | `3e22461f65e89153144f8adb70e3b8c2cc9845a7` | Apache-2.0; current compact Gemma 4 instruction model; any-to-any input | No emotion-task validation; more modalities than this text task needs | Current alternative only |
| `koshin2001/Japanese-to-emotions` | `cb822f495c142bb1f8a5bcfe3185e0d6a7265b50` | 68.7M; Japanese DistilBERT; smaller local footprint | CC-BY-NC-ND; model card lacks comparable held-out metrics | Do not select as research primary |

Model metadata and revisions were read from the Hugging Face Hub API on 2026-08-09. Re-run this review before enabling inference because model cards and files can change.

## Why the specialized model comes before the LLM

WRIME distinguishes the writer's self-reported emotion from reader-inferred emotion. Its authors report that readers do not fully recover writer emotion, especially anger and trust. A generative model observing one short association has even less warrant to infer an internal state. Therefore the evidence order is:

1. participant self-valence and self-arousal;
2. measured response latency and omission;
3. camera/microphone numeric features with contamination flags;
4. task-specific model scores with model/revision and uncertainty;
5. constrained LLM semantic tags, never free-form personality interpretation.

## Future local inference contract

Run models in a localhost-only sidecar after an explicit, separately versioned activation decision.

- Input: stimulus word, typed response, and no identifying profile or raw media.
- DeBERTa output: eight values, normalized and stored with the exact revision, tokenizer revision, runtime, and elapsed time.
- Qwen3.5 output: JSON containing only `semantic_relation`, `literal_or_metaphoric`, `topic_tags`, `ambiguity`, and `evidence_span`. Disable thinking output and prohibit diagnoses, motives, complexes, hidden beliefs, risk scores, and treatment suggestions in its schema and system prompt.
- Compare machine output with participant self-ratings; preserve disagreement rather than averaging it away.
- Run frozen test vectors before every model revision change. No model-generated label may change audiovisual stimulus until a preregistered validation stage is approved.

## Interpretation boundary

Long latency, unusual wording, omission, physiological change, or model-predicted emotion can identify a trial worth reviewing within the same participant. None establishes a Jungian complex, unconscious content, deception, psychiatric condition, or a transformation of Spirit.
