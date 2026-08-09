# ADR 2026-08-09 — Private N-of-1 audiovisual Spirit self-study

## Status

Accepted as an exploratory, local-only prototype. Human execution has not yet been performed.

## Context

The project already defines Spirit constructively as a per-person information-geometric space projected from multimodal observations. It does not empirically establish a metaphysical entity, and prior work found that the available pilot data do not support a confirmatory thermodynamic claim.

The next research question is whether a person's constructed state projection can be measured before and after an audiovisual perturbation, and whether a state-adaptive perturbation differs from a matched neutral perturbation across repeated sessions.

## Decision

1. Add `apps/private-self-study`, a localhost-only app in this private repository. It has no deployment configuration, telemetry, network calls, camera access, or microphone access.
2. Start with the researcher `junkawasaki` as the sole participant (`junkawasaki-self-001`). Existing data from every other participant are outside scope and are never loaded.
3. Operationalize the state with six self-report dimensions: calm, arousal, valence, meaning coherence, perceived agency, and connectedness. Heart rate is optional manual input. These measurements are projections, not the Spirit itself.
4. Compare two seeded, balanced conditions over eight sessions: adaptive audiovisual feedback and neutral audiovisual exposure. Labels A/B are presented during a session. A minimum 20-hour washout is specified in the protocol; enforcement remains a future implementation item.
5. Keep stimuli inside a conservative envelope: no strobe, no subliminal content, 0.05–0.15 Hz visual breathing, generated 110–290 Hz tones, Web Audio master gain at or below 0.1, explicit start, persistent stop control, and automatic stop when the page is hidden.
6. Store results only in browser IndexedDB. Optional exports are encrypted with PBKDF2-SHA-256 and AES-256-GCM. Raw audio and video are not collected.
7. Treat a single pre/post distance only as a short-term descriptive difference. Show an exploratory transformation candidate only after at least six completed sessions, at least three per condition, adaptive-minus-neutral outcome contrast at least 0.15, and zero safety events.
8. Encode the causal hypothesis separately in OASIS XMILE 1.0. The XMILE model is a simulation hypothesis, not an observed or fitted model.

## Safety and ethics boundary

Self-experimentation does not remove the need for prospective protocol, voluntary consent, privacy, risk minimization, stopping rules, and independent ethics review before publication or enrollment of any additional person. The app is not medical care and must not be used during driving, intoxication, acute sleep deprivation, or when the participant is experiencing severe psychological distress. Photosensitive, neurological, cardiac, hearing, or psychiatric concerns require clinician/ethics review before use.

## Consequences

- The project can now run a private, reversible measurement–perturbation–measurement loop without touching the public application or other participants' data.
- Repeated A/B evidence can falsify the claim that the adaptive mapping outperforms neutral exposure for this participant.
- No real experiment has run merely because the software builds; results remain absent until the researcher executes the preregistered sessions.
- Real-time physiological closed-loop control, wearable ingestion, model fitting, persistent homology comparisons, and independent replication remain future gates.

## Subsequent design

The Apple Vision Pro and Apple Watch extension is specified in `adr-2026-08-09-apple-vision-watch-loop.md`. It remains inactive until its staged hardware and safety gates pass.

The later MacBook feasibility implementation in `adr-2026-08-09-macbook-sensor-stimulus-app.md` supersedes this ADR's camera/microphone prohibition for protocol v0.2 only. It requires explicit permission, persists numeric features rather than raw media, and keeps sensor-driven adaptation disabled.
