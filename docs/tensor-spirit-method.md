# Tensor Spirit Method

## Core Hypothesis

Spirit in Physics starts from the premise:

```text
Spirituality is information.
```

The research target is not a metaphysical substance. It is the measurable
boundary at which external information becomes physiologically active for a
person. When a stimulus enters this boundary, the body reacts through latency,
voice, facial expression, autonomic arousal, or other physiological channels.

The Rubber Hand Illusion is the reference phenomenon because it demonstrates
that the self-boundary can be moved by coherent multisensory information. In
this project, the Web-based Jungian word association experiment is a scalable
proxy for measuring a similar information/body boundary.

## Experimental Proxy

Rubber Hand Illusion experiments directly manipulate body ownership. They are
high-value but expensive to run at scale.

The Web experiment instead presents word stimuli and records:

- stimulus word
- response word or utterance
- reaction time
- voice features
- facial expression features
- optional skin potential, HRV, pupil, or motion features
- session context and time

The key assumption is:

```text
If an information stimulus crosses the participant's self-relevant boundary,
the response distribution and physiological channels change together.
```

This makes the word association experiment a boundary probe rather than only a
semantic association task.

## Canonical Tensor

The canonical observation is:

```text
X[p, s, w, m, f, t]
```

where:

- `p`: participant
- `s`: session or context
- `w`: stimulus/response word pair
- `m`: modality
- `f`: feature
- `t`: time window

Example modalities:

- `language`
- `reaction_time`
- `voice`
- `face`
- `skin_potential`
- `hrv`
- `pupil`
- `motion`

Example features:

- semantic similarity
- response surprisal
- latency
- amplitude
- emotion score
- arousal score
- uncertainty
- entropy

The participant state is:

```text
S_p(t) = X[p, :, :, :, :, t]
```

The previous vector model is retained as a projection:

```text
v_w = Project(X[p, :, w, :, :, :])
```

This lets existing 3D graph visualization continue to work while making tensor
structure the primary scientific object.

## Energy and Probability

Association energy remains surprisal:

```text
E(w_I, w_O) = -log P(w_O | w_I, body, context)
```

The original model used:

```text
P(w_O | w_I) ∝ exp(vec(w_I) dot vec(w_O))
              r(w_I,w_O)^alpha
              exp(gamma DeltaSP / lambda)
              exp(eta F)
```

The tensor model generalizes this:

```text
P(w_O | w_I, body, context)
  ∝ exp C(X_language, X_body, X_affect, X_context)
```

where `C(...)` is a tensor contraction that combines language, body,
affective, and contextual modes.

## Geometry

The tensor produces geometry in two ways.

First, tensor factors define latent axes:

```text
X ≈ sum_k a_k(participant) b_k(word) c_k(modality) d_k(feature) e_k(time)
```

Each factor `k` can be interpreted as a candidate Spirit factor: a coupled
pattern of words, body response, affect, and temporal behavior.

Second, response distributions define an information metric:

```text
g_ij = E[partial_i log P partial_j log P]
```

High curvature or discontinuity indicates a boundary region where the
participant's response model changes rapidly.

## Topology

After geometry is estimated, topology is measured through persistent homology:

- `H0`: separated components
- `H1`: loops or recurring circuits
- `H2`: voids or cavities

Interpretation:

- stable components may indicate differentiated Spirit structures
- stable loops may indicate repeated conflict or complex circuits
- stable voids may indicate missing, avoided, or unintegrated regions

The current 3D tensegrity graph is therefore a visual projection of a deeper
tensor topology.

## Five Supported Method Families

### 1. Tensor Decomposition

Use CP, Tucker, or Tensor Train decomposition to extract latent Spirit factors.

Best for:

- discovering recurring patterns without predefined labels
- comparing participants
- compressing large Web experiment data

### 2. Information Geometry

Treat each participant as a conditional response distribution. Estimate Fisher
or related metrics over the response manifold.

Best for:

- defining information/body boundaries
- measuring curvature and instability
- comparing states before and after interventions

### 3. Persistent Homology

Compute topological invariants from the tensor-derived metric space.

Best for:

- detecting stable voids, loops, and clusters
- separating visualization artifacts from robust structure
- formalizing "gap area" and "ghost pattern" detection

### 4. Active Inference / Free Energy

Model reaction delay, arousal, and expression change as prediction error.

Best for:

- connecting Spirit to open-system thermodynamics
- interpreting high-surprisal stimuli
- modeling boundary maintenance and boundary update

### 5. Adaptive Stimulus Intervention

Use early responses to choose later stimuli by expected information gain.

Best for:

- reducing experiment length
- probing uncertain boundary regions
- approximating Rubber Hand Illusion-style intervention in a Web setting

## Minimal Pipeline

```text
1. Collect Jungian association events.
2. Normalize language, reaction time, voice, face, and physiology.
3. Align stimulus windows to multimodal sensor/Hume time bins.
4. Build X[p,s,w,t,m,f] when word alignment exists.
5. Fall back to X[p,s,t,m,f] for unaligned samples.
6. Estimate P(response | stimulus, body, context).
7. Compute E = -log P.
8. Factorize X and estimate geometry.
9. Compute topological invariants.
10. Project to 3D for researcher visualization.
11. Interpret stable structures as complex, archetype, shadow, or boundary.
```

## LangGraph Pipeline

The production analysis should be a LangGraph workflow rather than one linear
script. The shared state should carry raw inputs, aligned windows, tensors,
metrics, topology, graph payloads, and diagnostics.

```text
discover_inputs
  -> load_session_events
  -> load_hume_modalities
  -> align_stimulus_windows
  -> build_tensor_blocks
  -> derive_metric_space
  -> project_3d_graph
  -> compute_topology
  -> publish_artifacts
```

The critical alignment node maps each participant's sorted materialized Hume
registry files onto sorted session starts, then intersects each Hume tensor time
bin with `session_data.json` `word_displayed` / response-window intervals. This
makes words real stimulus anchors, not language-transcription surface tokens.

LangGraph is useful here because different stages have different failure modes:
missing annex files should stop at input discovery, invalid session JSON should
mark only that participant as unaligned, embedding joins can be retried
independently, and topology computation can be cached without rebuilding the
Hume tensor.

## Spirit Field Layers

The word-distance visualization should not stop at points and edges. The
research object is the information/body boundary, so the rendering separates
four layers:

- `field`: normalized non-voluntary response energy. This is mapped to node
  height and size.
- `boundary`: local response gradient plus local isolation. This marks regions
  where the body's response changes quickly.
- `residual`: deviation from the same-stimulus group mean response. This marks
  personal structure rather than shared stimulus effects.
- `time`: participant-level stimulus order trace. This restores the temporal
  sequence hidden by aggregation.

Boundary rendering is further split into:

- `membrane`: fluid high-gradient boundary regions where the response field
  bends, ripples, and remains connected. It should be rendered as a liquid
  surface/membrane in space rather than a fixed wall or a simple ring.
- `personal response membrane`: a participant-specific membrane estimated from
  that participant's non-voluntary response gradients. This is the operational
  surface of the person's information/body boundary.
- `collective response membrane`: a group-level membrane estimated from shared
  high-gradient regions across participants. In Jungian terms, this can be read
  as an intersubjective or archetypal response boundary, but only as an
  empirical surface, not as a metaphysical claim.
- `relational response membrane`: a pairwise or multi-party membrane estimated
  from synchronized non-voluntary responses, overlapping boundary words, and
  shared residual patterns. This is the preferred unit for the non-separation of
  self and other: the membrane belongs to the relation, not to an isolated
  individual.
- `wall`: high-boundary and high-residual regions, interpreted as hard personal
  barriers or strong defensive surfaces.
- `void`: low-field but locally isolated regions, interpreted as avoided,
  missing, or unintegrated response zones.

## Computational Physics Representation

The most natural physics representation is a diffuse interface model rather
than a hard geometric shell.

Recommended interpretation:

```text
phi(x,t) = membrane field
rho(x,t) = response-energy density
kappa(x,t) = boundary curvature
eta(x,t) = residual/noise field
```

Useful model families:

- Phase-field / Cahn-Hilliard: represents membranes as soft, fluid interfaces
  that can split, merge, thicken, and dissolve.
- Level-set methods: represent the boundary as an isosurface of `phi(x,t)`.
- Reaction-diffusion: models how stimulus response propagates and forms local
  ridges, clouds, and voids.
- Stochastic differential equations: represent instability and fluctuation in
  the membrane.
- Persistent homology: detects stable loops, cavities, and voids in the
  membrane field.

Visual mapping:

```text
membrane opacity  <- phi
cloud density     <- rho
surface thickness <- boundary strength
surface ripple    <- temporal instability
wall hardness     <- high phi + high residual
void              <- low rho + high isolation
```

In this framing, a cloud is not only decoration. It is a density rendering of
the response field around a membrane. A sharp surface is a high-confidence
boundary; a cloud-like surface is an uncertain, fluid, relational boundary.

Current discrete implementation:

```text
phi_i = normalize(0.54 boundary_i + 0.28 residual_i + 0.18 rho_i)
diffuse_i = normalize(4 phi_i (1 - phi_i))
rho_i = normalize(response energy_i)
mu_i = normalize(abs(phi_i^3 - phi_i - epsilon^2 laplacian(phi_i)))
levelset_i = normalize(phi_i - median(phi))
homology_i = normalize(0.45 boundary_i + 0.35 isolation_i + 0.20 closure_i)
```

Here `mu_i` is a Cahn-Hilliard chemical-potential proxy on the response graph,
and `closure_i` is a local loop/cavity proxy from nearest-neighbor closure. These
are not yet full PDE or persistent-homology solvers; they are graph-discrete
diagnostic fields used for visualization and hypothesis generation.

## Research Claim

The claim is not that word association reproduces the Rubber Hand Illusion.

The claim is:

```text
Both experiments measure the coupling between external information and
physiological self-boundary update.
```

Rubber Hand Illusion does this through multisensory body ownership.
The Web experiment does this through language-triggered physiological response.
