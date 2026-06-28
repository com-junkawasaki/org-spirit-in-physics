# ADR 2026-06-29 — Spirit as a constructive information-geometric (tensor) space; langgraph-clj pipeline; arXiv paper

## Status
Accepted.

## Context
The research question — can "spirit"/selfhood be studied in physics — was first
framed as a *hypothesis-testing* paper ("information = physics = spirit", with a
surprisal→physiological-cost test). Multi-agent (AI co-scientist style) review
plus our own analysis showed that framing was weak and partly self-defeating on
the available pilot data:

- The originally-claimed maximum-likelihood fit of the association model was not
  actually run; an honest re-analysis showed the only significant effect
  (surprisal→latency) was a **lexical-frequency/typicality confound**, the
  semantic-energy term added nothing over a popularity baseline, and the central
  electrodermal cost was null at N=5.
- The "information-thermodynamics" apparatus (Landauer etc.) was invoked but not
  load-bearing — no `k_B T` or entropy-production quantity is measured.

The owner re-scoped the project: **spirit is to be *constructed*, not confirmed.**
Under the assumption that the self is information, an individual's spirit *is*
the information-geometric space built from that person's own signals (Jung's word
association + reaction time + skin potential), with Jungian *complexes* as
high-energy regions and the self-*boundary* (in principle) fixed physiologically
by a rubber-hand-illusion (RHI) paradigm. "Information = physics = this
mathematical space" is a **stipulative operational definition**, not a `p`-value
claim. Population/cultural overlap of these spaces is the candidate *collective
unconscious*.

## Decision
1. **Constructive formulation.** Define each individual's spirit as a per-person
   spectral-embedding (graph-Laplacian) space over their word nodes, with node
   energy `E = z(latency) + z(ΔSP)` (node charge) and manifold energy = spectral
   radius (ranks complexes). The paper is a reproducible *construction +
   visualization*, with explicit well-posedness (non-empty ⇔ spectral gap,
   energy structured, reproducible high-energy regions) rather than a confirmatory
   study. Removed all popularity/frequency/semantic-prediction/MLE-significance
   material.
2. **Pipeline as a langgraph-clj StateGraph.** The numeric cast from raw signals
   to manifold geometry runs as a checkpointed `langgraph-clj` actor
   (`spirit-tensor-actor/`, nodes: load→tensorize→spectral→tucker→analyze→
   infothermo) over a Python numeric sidecar (`scripts/spirit_tensor.py`),
   following the repo's actor pattern. This keeps the construction auditable and
   reproducible.
3. **Honest scope, measured with restraint.** N=5 of 11 (skin-potential subset).
   Individual distinctness is not statistically established (Procrustes ratio
   1.08, 95% CI [0.46, 1.08]); the collective component is faint but above chance
   (inter-subject r=+0.07, perm p=0.038) while the 27% first-PC share sits at its
   mechanical shuffle-null (p=0.21) and is **not** claimed as a collective
   fraction. Thermodynamics is a motivating analogy; RHI boundary data are
   pending. All numbers/figures regenerate from bundled scripts (fixed RNG seeds).
4. **arXiv package.** `arxiv_submission/` builds with XeLaTeX (Harano Aji for the
   Japanese term 情緒); `00README.json` selects the engine; bilingual sources
   (English `main.tex` for submission, `main_ja.tex` for co-author review).
   Target: primary `q-bio.NC`, cross-list `physics.bio-ph` (cond-mat.stat-mech
   dropped — no thermodynamic quantity measured).
5. **Visualization.** Awe-oriented renderings layering auxiliary physical
   pictures (heat-kernel energy field / gravity wells, affinity filaments,
   bioluminescent complexes): a static paper figure (`fig_spirit_awe`) and
   interactive WebGL pieces under `arxiv_submission/viz/` (a live nebula and an
   immersive-wall edition with parallax depth layers, palette variants, an
   individual-spirit tour, and sonification of the Laplacian eigenvalues). All
   driven by the same real exported data; they add no data.

## Consequences
- The paper is internally coherent, honestly scoped, and fully reproducible
  (constructive-review score 82/100; honesty 10/10). It is arXiv-ready as a
  scoped pilot/methods/visualization preprint; it is **not** a confirmatory
  result and does not claim to have demonstrated the thesis empirically.
- Human-subjects raw media stay out of git (consent/PII); only de-identified
  derived measures and code are versioned. Large session videos remain in
  git-annex + Backblaze B2 (see manifest/repos.edn).
- Open next steps: collect the RHI self-boundary data; run a powered,
  pre-registered cohort with cross-subject alignment and hierarchical modelling;
  optionally execute the full semantic+physiological energy functional with a
  pretrained embedding (the pilot embedding test was a negative result).
