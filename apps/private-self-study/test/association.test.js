import test from "node:test";
import assert from "node:assert/strict";
import { ASSOCIATION_STIMULI, EMOTION_MODEL_PLAN, createEmotionAnalysisRecord, summarizeAssociations } from "../src/association.js";

test("association protocol fixes a balanced, non-diagnostic 12-word set", () => {
  assert.equal(ASSOCIATION_STIMULI.length, 12);
  assert.equal(new Set(ASSOCIATION_STIMULI.map((item) => item.id)).size, 12);
  assert.ok(ASSOCIATION_STIMULI.filter((item) => item.category === "neutral").length >= 4);
});

test("association summary flags only within-session latency outliers", () => {
  const trials = [1000, 1100, 1200, 1300, 5000].map((latency, index) => ({
    stimulusId: `w${index}`,
    response: "回答",
    firstInputLatencyMs: latency,
    selfValence: 0.5,
    selfArousal: 0.5,
    omitted: false,
  }));
  const summary = summarizeAssociations(trials);
  assert.equal(summary.medianLatencyMs, 1200);
  assert.equal(summary.answeredCount, 5);
  assert.equal(summary.timedAnswerCount, 5);
  assert.deepEqual(summary.latencyFlags, ["w4"]);
  assert.equal(summary.interpretation, "descriptive-within-person-not-diagnostic");
});

test("answers remain counted when an input method does not expose first-input timing", () => {
  const summary = summarizeAssociations([
    { stimulusId: "water", response: "海", firstInputLatencyMs: null, selfValence: 0.5, selfArousal: 0.5, omitted: false },
    { stimulusId: "chair", response: "", voiceRecording: { dataUrl: "data:audio/webm;base64,AA==" }, firstInputLatencyMs: null, selfValence: 0.5, selfArousal: 0.5, omitted: false },
  ]);
  assert.equal(summary.answeredCount, 2);
  assert.equal(summary.timedAnswerCount, 0);
  assert.equal(summary.voiceAnswerCount, 1);
  assert.equal(summary.medianLatencyMs, null);
});

test("emotion records default to not-run and never invent model output", () => {
  const [record] = createEmotionAnalysisRecord([{ trialId: "t1", stimulusId: "water", stimulusWord: "水", response: "海", selfValence: 0.7, selfArousal: 0.3, firstInputLatencyMs: 500, omitted: false }]);
  assert.equal(record.inferenceStatus, "not-run");
  assert.equal(record.modelEmotion, null);
  assert.equal(record.modelId, null);
});

test("researched model plan is pinned and disabled", () => {
  assert.equal(EMOTION_MODEL_PLAN.primary.modelId, "neuralnaut/deberta-wrime-emotions");
  assert.equal(EMOTION_MODEL_PLAN.contextualLlm.modelId, "Qwen/Qwen3.5-4B");
  assert.match(EMOTION_MODEL_PLAN.contextualLlm.revision, /^[0-9a-f]{40}$/);
  assert.equal(EMOTION_MODEL_PLAN.primary.enabled, false);
  assert.equal(EMOTION_MODEL_PLAN.contextualLlm.enabled, false);
});
