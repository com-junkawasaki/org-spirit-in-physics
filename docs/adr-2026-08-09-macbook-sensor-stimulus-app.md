# ADR 2026-08-09 — MacBook camera/microphone sensing and display/speaker stimulus

## Status

Implemented as a private localhost prototype. No human session result is asserted by this ADR.

## Context

Before implementing the Apple Watch, iPhone broker, and Apple Vision Pro topology, the acquisition–intervention loop needs an executable single-machine feasibility test. A MacBook provides camera, microphone, display, and speaker with fewer transport and clock-alignment variables.

## Decision

1. Extend `apps/private-self-study` with an explicit camera/microphone permission and calibration phase.
2. Reduce camera input in memory to 64×48 normalized luminance and frame-change features. Do not perform face detection, identity recognition, gaze reconstruction, or emotion inference.
3. Reduce microphone input in memory to RMS and peak amplitude. Do not record, transcribe, recognize speech, or connect the microphone stream to audio output.
4. Persist one numeric feature sample per second plus a summary. Never persist raw media.
5. Continue using the bounded display and Web Audio stimulus envelope, with persistent stop and page-hidden stop.
6. Stop the session if either media track is lost. Treat display-to-camera and speaker-to-microphone coupling as measurement confounds, not evidence of participant-state synchrony.
7. Keep sensor-driven adaptation disabled in this version. This stage validates acquisition, stimulus delivery, timing, privacy boundaries, and stopping behavior before testing a closed loop.

## Consequences

- The full local acquisition–intervention path can be tested on one MacBook before native Apple device development.
- Stored sensor values are low-dimensional proxies and cannot reconstruct the original media through this application.
- The implementation does not establish that these proxies measure Spirit or that audiovisual exposure transforms it.
- Camera/microphone permissions and physical-device behavior still require manual verification on the researcher's MacBook.
