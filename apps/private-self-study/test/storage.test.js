import test from "node:test";
import assert from "node:assert/strict";
import { bytesToBase64, hydrateVoiceRecordings, splitVoiceRecordings } from "../src/storage.js";

test("voice clips are split into a dedicated store and losslessly rehydrated", () => {
  const session = {
    id: "s1",
    startedAt: "2026-08-09T00:00:00.000Z",
    wordAssociation: {
      trials: [{
        trialId: "t1",
        voiceRecording: { dataUrl: "data:audio/webm;base64,AA==", mimeType: "audio/webm", sizeBytes: 1, durationMs: 1000, maxDurationMs: 30000 },
      }],
    },
  };
  const { storedSession, recordings } = splitVoiceRecordings(session);
  assert.equal(recordings.length, 1);
  assert.equal(storedSession.wordAssociation.trials[0].voiceRecording.dataUrl, undefined);
  assert.equal(storedSession.wordAssociation.trials[0].voiceRecording.recordingId, "s1:t1");
  assert.deepEqual(hydrateVoiceRecordings(storedSession, recordings), session);
});

test("large encrypted payload bytes can be base64 encoded without argument overflow", () => {
  const bytes = new Uint8Array(250_000);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  const encoded = bytesToBase64(bytes);
  assert.equal(encoded.length, Math.ceil(bytes.length / 3) * 4);
  assert.equal(atob(encoded).charCodeAt(200_000), bytes[200_000]);
});
