# ADR 2026-08-09 — Apple Vision Pro and Apple Watch sensing/intervention loop

## Status

Accepted as a design. Native device applications and human sessions are not yet implemented.

## Decision

1. Assign Apple Watch to physiological/motion sensing and sparse haptic output, Apple Vision Pro to spatial/head/hand sensing and audiovisual output, and a paired iPhone to safety authority, time alignment, encrypted relay, and storage.
2. Do not depend on direct Watch-to-Vision-Pro communication. Use HealthKit workout mirroring or WatchConnectivity between Watch and iPhone, followed by an encrypted local iPhone-to-Vision-Pro session.
3. Do not collect or infer raw gaze. Do not request Vision Pro camera frames or scene reconstruction in v1. Treat all device-derived values as proxies with quality and uncertainty, not direct Spirit measurements.
4. Separate Watch haptic intervals from heart-rate measurement because activating the haptic engine interrupts HealthKit heart-rate collection.
5. Advance sequentially through simulator, sensing-only, open-loop audiovisual, isolated haptic, and only then closed-loop feasibility stages.
6. Give local participant stop controls and the iPhone safety supervisor priority over every sensing, model, and renderer state.
7. Keep all real study data off Git and cloud services; persist a versioned, encrypted, append-only local event ledger.

## Consequences

- The design can preserve causal interpretability in an N-of-1 study by changing one intervention component per stage.
- Wearable data cannot silently turn the prototype into a diagnostic or therapeutic system.
- iPhone availability is required for the integrated hardware protocol.
- Closed-loop behavior remains disabled until physical-device reliability, timing, tolerability, and independent protocol-review gates pass.
