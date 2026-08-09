# ADR: Local voice-answer recording and analysis boundary

Date: 2026-08-09
Status: implemented experimentally for the private researcher self-study

## Decision

Record one optional audio clip for each word-association trial. Recording starts visibly when the stimulus is armed and stops when the participant submits, explicitly stops recording, omits the answer, or reaches 30 seconds. A clip larger than 2 MB is rejected.

The clip is encoded by the browser `MediaRecorder`, converted to a data URL, and stored only inside the same IndexedDB session object as the corresponding trial. This makes it available for local playback and includes it inside the existing encrypted JSON export. It is never placed in the repository or sent to an external API.

Continuous microphone sensor audio remains unrecorded. The existing analyser continues to retain only RMS and peak samples. Camera frames remain unrecorded.

## Analysis contract

The implemented local analysis is descriptive:

- recording duration;
- calibration-aware RMS mean;
- peak maximum;
- voiced-sample fraction.

These values do not identify speech content or emotion. Transcription and speech-emotion inference have separate audit records with `status: not-run`, null model identity, and null output. The participant's spoken/typed answer and self-rated valence/arousal remain primary evidence.

## Consent and deletion

Consent explicitly names answer-audio storage. The UI shows a recording indicator and a per-trial stop control. `回答なし` discards the current clip. Leaving or aborting the association flow stops and discards an unfinished clip. The existing local-data deletion action removes sessions and their embedded clips together.

## Known limits

- Browser codec availability determines WebM/Opus, MP4, or WebM output.
- Displayed sound can leak into the microphone clip and acoustic features.
- Acoustic features are not validated clinical or psychological measures.
- Enabling transcription or speech-emotion inference requires a separate model review, pinned revision, evaluation set, uncertainty contract, and renewed disclosure before activation.
