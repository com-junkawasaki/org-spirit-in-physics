export const ASSOCIATION_STIMULI = Object.freeze([
  { id: "water", word: "水", category: "neutral" },
  { id: "chair", word: "椅子", category: "neutral" },
  { id: "window", word: "窓", category: "neutral" },
  { id: "road", word: "道", category: "neutral" },
  { id: "home", word: "家", category: "personal" },
  { id: "work", word: "仕事", category: "personal" },
  { id: "money", word: "お金", category: "personal" },
  { id: "trust", word: "信頼", category: "affective" },
  { id: "loneliness", word: "孤独", category: "affective" },
  { id: "future", word: "未来", category: "personal" },
  { id: "self", word: "私", category: "personal" },
  { id: "change", word: "変化", category: "affective" },
]);

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeAssociations(trials) {
  const answered = trials.filter((trial) => !trial.omitted && (trial.response?.length || trial.voiceRecording));
  const timed = answered.filter((trial) => trial.firstInputLatencyMs != null);
  const latencies = timed.map((trial) => trial.firstInputLatencyMs);
  const medianLatencyMs = median(latencies);
  const deviations = medianLatencyMs == null ? [] : latencies.map((value) => Math.abs(value - medianLatencyMs));
  const madLatencyMs = median(deviations);
  const slowThresholdMs = medianLatencyMs == null
    ? null
    : medianLatencyMs + Math.max(750, 2.5 * (madLatencyMs || medianLatencyMs * 0.25));
  const latencyFlags = answered
    .filter((trial) => trial.firstInputLatencyMs > slowThresholdMs)
    .map((trial) => trial.stimulusId);

  return {
    trialCount: trials.length,
    answeredCount: answered.length,
    omissionCount: trials.length - answered.length,
    medianLatencyMs,
    madLatencyMs,
    slowThresholdMs,
    latencyFlags,
    timedAnswerCount: timed.length,
    voiceAnswerCount: answered.filter((trial) => trial.voiceRecording).length,
    meanSelfValence: mean(answered.map((trial) => trial.selfValence)),
    meanSelfArousal: mean(answered.map((trial) => trial.selfArousal)),
    meanResponseLength: mean(answered.map((trial) => [...(trial.response ?? "")].length)),
    interpretation: "descriptive-within-person-not-diagnostic",
  };
}

export function createEmotionAnalysisRecord(trials) {
  return trials.map((trial) => ({
    trialId: trial.trialId,
    stimulusId: trial.stimulusId,
    stimulusWord: trial.stimulusWord,
    response: trial.response,
    selfValence: trial.selfValence,
    selfArousal: trial.selfArousal,
    firstInputLatencyMs: trial.firstInputLatencyMs,
    omitted: trial.omitted,
    modelEmotion: null,
    modelId: null,
    modelRevision: null,
    inferenceStatus: "not-run",
  }));
}

export const EMOTION_MODEL_PLAN = Object.freeze({
  primary: {
    modelId: "neuralnaut/deberta-wrime-emotions",
    revision: "4017945a83921e59f7c55b8294ca418a97ee567f",
    role: "japanese-eight-emotion-regression",
    labels: ["joy", "sadness", "anticipation", "surprise", "anger", "fear", "disgust", "trust"],
    enabled: false,
  },
  fineGrainedCandidate: {
    modelId: "tojohere/goemotions-ja-xlm-roberta-base",
    revision: "f4e6d9b6fcd9ca74ba2919e860a368f78fd2d470",
    role: "experimental-japanese-28-label-classification",
    enabled: false,
  },
  contextualLlm: {
    modelId: "Qwen/Qwen3.5-4B",
    revision: "851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a",
    role: "structured-semantic-coding-only",
    enabled: false,
  },
});
