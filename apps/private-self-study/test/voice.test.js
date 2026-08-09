import test from "node:test";
import assert from "node:assert/strict";
import { VOICE_ANALYSIS_PLAN, createVoiceAnalysisRecord, summarizeVoiceFeatures } from "../src/voice.js";

test("voice features remain descriptive and use calibration-aware activity threshold", () => {
  const features = summarizeVoiceFeatures([
    { quality: "ok", microphoneRms: 0.01, microphonePeak: 0.03 },
    { quality: "ok", microphoneRms: 0.08, microphonePeak: 0.4 },
    { quality: "unavailable", microphoneRms: 0, microphonePeak: 0 },
  ], 0.02);
  assert.equal(features.validCount, 2);
  assert.equal(features.rmsMean, 0.045);
  assert.equal(features.peakMax, 0.4);
  assert.equal(features.voicedFraction, 0.5);
  assert.equal(features.interpretation, "acoustic-description-not-emotion-inference");
});

test("voice analysis records local acoustics without inventing transcript or emotion", () => {
  const record = createVoiceAnalysisRecord({ dataUrl: "data:audio/webm;base64,AA==" }, { rmsMean: 0.1 });
  assert.equal(record.rawAudioStored, true);
  assert.equal(record.localAcoustic.status, "complete");
  assert.equal(record.transcription.status, "not-run");
  assert.equal(record.transcription.transcript, null);
  assert.equal(record.speechEmotion.status, "not-run");
  assert.equal(VOICE_ANALYSIS_PLAN.localAcoustic.status, "enabled");
});
