import test from "node:test";
import assert from "node:assert/strict";
import { computeAudioFeatures, computeFrameFeatures, sanitizeDeviceSettings, summarizeSensorSamples } from "../src/sensors.js";

test("camera features calculate normalized brightness without retaining rgba", () => {
  const dark = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
  const light = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]);
  const before = computeFrameFeatures(dark);
  const after = computeFrameFeatures(light, before.gray);
  assert.equal(before.brightness, 0);
  assert.ok(Math.abs(after.brightness - 1) < 1e-12);
  assert.ok(Math.abs(after.motion - 1) < 1e-12);
  assert.equal("rgba" in after, false);
});

test("microphone features calculate rms and peak", () => {
  const features = computeAudioFeatures(new Float32Array([0.5, -0.5, 0.5, -0.5]));
  assert.equal(features.rms, 0.5);
  assert.equal(features.peak, 0.5);
});

test("sensor summaries exclude unavailable samples", () => {
  const summary = summarizeSensorSamples([
    { quality: "ok", cameraBrightness: 0.4, cameraMotion: 0.1, microphoneRms: 0.2, microphonePeak: 0.3 },
    { quality: "unavailable", cameraBrightness: 0, cameraMotion: 0, microphoneRms: 0, microphonePeak: 0 },
    { quality: "ok", cameraBrightness: 0.6, cameraMotion: 0.3, microphoneRms: 0.4, microphonePeak: 0.7 },
  ]);
  assert.equal(summary.validFraction, 2 / 3);
  assert.equal(summary.cameraBrightnessMean, 0.5);
  assert.equal(summary.cameraMotionMean, 0.2);
  assert.equal(summary.microphoneRmsMean, 0.30000000000000004);
  assert.equal(summary.microphonePeakMax, 0.7);
});

test("device settings discard stable hardware identifiers and labels", () => {
  const camera = sanitizeDeviceSettings("camera", { width: 640, height: 480, frameRate: 15, deviceId: "secret", groupId: "group" });
  const microphone = sanitizeDeviceSettings("microphone", { sampleRate: 48000, channelCount: 1, deviceId: "secret" });
  assert.deepEqual(camera, { width: 640, height: 480, frameRate: 15 });
  assert.deepEqual(microphone, { sampleRate: 48000, channelCount: 1 });
  assert.equal("deviceId" in camera, false);
  assert.equal("deviceId" in microphone, false);
});
