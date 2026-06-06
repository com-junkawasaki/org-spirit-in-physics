# ADR 2026-06-06: Tensor-First Spirit Methodology

## Status

Accepted.

## Context

The original Spirit in Physics formulation represented Spirit as an
informational vector space:

```text
S = {V, E, T}
E = -log P(w_O | w_I)
```

where association probability combined semantic similarity, reaction time,
skin potential, and facial/voice emotion scores.

This was sufficient for early visualization because each word could be rendered
as a node and each association as a weighted edge. The current implementation
also extends this into an emotion-kernel graph, spectral initialization, and
tensegrity-style 3D visualization.

However, the research hypothesis is broader:

```text
Spirituality is information.
```

The Rubber Hand Illusion shows that the self-boundary can be shifted by
coherent external information. Spirit in Physics treats this as a measurable
information/body boundary: the region where external information produces a
physiological response that behaves as if it has entered the self-model.

Running Rubber Hand Illusion experiments at scale is expensive and slow.
Therefore, the project uses a Web-based Jungian word association experiment as
an scalable proxy. Word stimuli, response words, reaction time, voice, facial
expression, and optional physiological signals are used to estimate the
participant's information/body response boundary.

This data is not naturally a single vector. It is a multi-way structure across
participant, session, word pair, modality, feature, and time.

## Decision

Adopt a tensor-first research model.

The canonical observed state is:

```text
X[p, s, w, m, f, t]
```

where:

```text
p = participant
s = session or context
w = stimulus/response word pair
m = modality
    language, reaction time, voice, face, skin potential, HRV, pupil, motion
f = feature
    semantic score, latency, amplitude, emotion, arousal, uncertainty, entropy
t = time window
```

The participant's Spirit state is a time-dependent tensor field:

```text
S_p(t) = X[p, :, :, :, :, t]
```

The prior vector model remains as a projection:

```text
v_i = project_tensor_to_word_embedding(X[p, :, w_i, :, :, :])
```

Association energy is still defined as surprisal:

```text
E(w_I, w_O) = -log P(w_O | w_I, body, context)
```

but probability is computed from tensor contraction rather than only vector
inner product:

```text
P(w_O | w_I, body, context) ∝ exp(C(X_language, X_body, X_affect, X_context))
```

where `C(...)` is a learned or estimated contraction over semantic,
physiological, affective, and contextual modes.

The visual topology is derived from tensor geometry:

1. Build tensor factors or kernels from `X`.
2. Estimate a metric, preferably an information-geometric or Fisher metric.
3. Embed for visualization.
4. Measure topology with persistent homology.
5. Interpret stable structures as complexes, archetypal structures, shadows, or
   information/body boundary surfaces.

## 3D Hume Tensor Projection

For the Hume AI artifacts currently stored in the repository, the practical
projection model is:

```text
X[sample, modality, emotion]
sample = participant/session-like Hume registry file
modality = language, prosody, face, burst
emotion = common Hume emotion score dimension
```

This is a projection of the canonical tensor because the raw Hume CSVs are
already segmented by modality and time. When word-level alignment is available,
the richer form should be used:

```text
X[p, s, w, t, m, f]
```

The 3D visualization model is:

```text
1. Materialize Hume CSV files and skip git-annex pointer files.
2. Select common Hume emotion dimensions shared by language, prosody, and face.
3. Align Hume registry time bins to session_data word_displayed windows.
4. Average scores per sample and modality.
5. Build a sample tensor with shape modality x emotion.
6. Attach stimulus-word anchors from the aligned session windows.
7. Flatten and z-score the tensor.
8. Compute cosine distance over the flattened tensor.
9. Project samples to 3D with PCA for inspection.
10. Build k-nearest-neighbor, temporal, emotion-anchor, and word-anchor links.
```

The output graph uses the existing visualization contract:

```text
nodes[*].initial = [x, y, z]
nodes[*].emotion = top mean Hume emotion scores
nodes[*].alignedWords = stimulus words overlapping the tensor time bin
links[*].distance = tensor cosine distance
links[*].mode = tension for same-participant continuity,
                compression for cross-participant separation
```

This model has two kinds of distance:

- Hume affective/body distance, derived from emotion/prosody/face/language
  scores.
- Semantic or LLM distance, which is not present in Hume CSVs and must be added
  from a text embedding model over stimulus/response words.

Therefore, current Hume artifacts can show body-affective topology, but not the
full semantic/body mismatch topology until LLM embeddings are joined.

## LangGraph Pipeline Design

The tensor analysis should be orchestrated as a LangGraph state machine so that
each analysis stage can be cached, inspected, retried, or replaced.

```text
SpiritTensorState = {
  participant_files,
  session_events,
  hume_tables,
  aligned_windows,
  tensor_blocks,
  anchors,
  metric_space,
  topology,
  graph_payload,
  diagnostics
}
```

Recommended graph nodes:

1. `discover_inputs`
   - Find materialized Hume artifacts and session_data files.
   - Skip git-annex pointer files.

2. `load_session_events`
   - Parse `session_data.json`.
   - Extract recording/session starts, `word_displayed`, response windows, and
     speech events.

3. `load_hume_modalities`
   - Read language, prosody, face, and burst CSVs.
   - Normalize modality names and common emotion dimensions.

4. `align_stimulus_windows`
   - Map sorted Hume registries to sorted session starts per participant.
   - Convert Hume relative seconds into absolute session windows.
   - Attach overlapping stimulus words to tensor time bins.

5. `build_tensor_blocks`
   - Build `X[p,s,w,t,m,f]` where available.
   - Fall back to `X[p,s,t,m,f]` when word alignment is absent.

6. `derive_metric_space`
   - Compute Hume affective/body distance from tensor contractions.
   - Optionally join LLM/image/audio/video embeddings as semantic or multimodal
     kernels.

7. `project_3d_graph`
   - Produce PCA/UMAP/spectral coordinates.
   - Add sample, emotion-anchor, and word-anchor nodes.

8. `compute_topology`
   - Run persistent homology or graph-topology summaries.
   - Store components, loops, void candidates, and uncertainty.

9. `publish_artifacts`
   - Write JSON/Markdown/HTML payloads.
   - Emit diagnostics for missing sessions, fallback counts, and anchor quality.

The current script is a single-process prototype of nodes 1, 3, 4, 5, 6, 7,
and 9. The next implementation step is to lift those functions into LangGraph
nodes while keeping the graph payload contract stable.

The 3D graph must expose four Spirit layers rather than only a point cloud:

- `field`: non-voluntary response energy.
- `boundary`: local response-gradient and isolation.
- `residual`: personal deviation from the same-stimulus group response.
- `time`: participant-level stimulus trace.

Boundary interpretation is divided into `membrane`, `wall`, and `void`.
Membrane is a fluid high-gradient surface in space that ripples and remains
connected, wall is a high-boundary/high-residual barrier, and void is a
low-field but isolated region.

Membrane surfaces are separated into a `personal response membrane` and a
`collective response membrane`. The personal membrane is a participant-specific
information/body boundary. The collective membrane is the group-level shared
boundary surface; Jungian interpretation may call this intersubjective or
archetypal, but the implementation treats it only as an empirical response
surface.

The core membrane for the non-separation of self and other is the `relational
response membrane`. It is estimated between participant pairs or groups from
synchronized non-voluntary response distance, boundary-word overlap, and shared
residual structure. In this interpretation, a participant is an observation
point inside a relation field rather than an isolated individual.

## Viewer Implementation Decision

The canonical browser implementation is the Canvas viewer:

```text
docs/hume-tensor-3d-viewer.html
```

This is the adopted research viewer because it currently preserves the full
interpretive surface required by the method: word labels, participant toggles,
field, boundary, residual, time trace, membrane, wall, void, and hover
inspection. It is also stable across ordinary browsers without requiring
WebGPU adapter support.

KAMI/WebGPU and Three.js WebGPU variants remain as experimental renderer
prototypes:

```text
docs/hume-tensor-3d-viewer-kami.html
docs/hume-tensor-3d-viewer-three-webgpu.html
```

They should not be treated as the primary research output until they match the
Canvas viewer's semantic visibility and browser stability. The research
contract is therefore renderer-independent, but the accepted implementation for
analysis and review is Canvas.

## Method Families

The research platform should support five complementary methods:

1. Tensor decomposition
   - CP, Tucker, or Tensor Train decomposition.
   - Extract latent Spirit factors coupling words, physiology, emotion, and
     time.

2. Information geometry
   - Model each participant as a response distribution.
   - Use Fisher information or related metrics to estimate curvature,
     discontinuity, and boundary surfaces.

3. Persistent homology
   - Compute stable connected components, loops, and voids.
   - Treat stable voids and loops as candidates for missing regions,
     unresolved complexes, or repeated response circuits.

4. Active inference / free energy modeling
   - Treat reaction latency and physiological arousal as prediction error.
   - Model Spirit as an open system that preserves its information boundary by
     minimizing surprise.

5. Adaptive intervention
   - Select later stimuli based on early response tensors.
   - Maximize expected information gain around likely boundary regions.

## Consequences

- The paper must describe Spirit as a tensor field rather than a vector space.
- Existing vector embeddings, 3D graph layouts, and tensegrity visualization
  remain valid as projections of the tensor field.
- New analysis endpoints should eventually store compact tensor snapshots or
  factorized outputs, not only per-word vectors.
- Researcher UI can continue to render 3D graphs, but should label them as
  projections of a tensor topology.
- The method becomes closer to computational physics: tensor contraction,
  field geometry, free energy, and topological invariants become first-class
  objects.

## Non-Goals

- This ADR does not claim that Web-based word association is identical to the
  Rubber Hand Illusion.
- This ADR defines it as a scalable proxy for information/body boundary
  measurement.
- This ADR does not require immediate implementation of all five method
  families.

## Verification Criteria

- Paper text defines `X[p,s,w,m,f,t]` as canonical observation.
- Method document explains how Jungian association approximates the Rubber Hand
  Illusion boundary measurement.
- Visualization documentation states that 3D graphs are tensor projections.
- Future APIs can add tensor factor outputs without breaking existing vector
  endpoints.
- `scripts/build_hume_tensor_3d_samples.py` generates sample 3D graph payloads
  from materialized Hume CSV artifacts.
