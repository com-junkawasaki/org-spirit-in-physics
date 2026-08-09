export const DIMENSIONS = [
  { key: "calm", label: "落ち着き" },
  { key: "arousal", label: "覚醒度" },
  { key: "valence", label: "快・不快" },
  { key: "coherence", label: "意味のまとまり" },
  { key: "agency", label: "自分で選べる感覚" },
  { key: "connectedness", label: "つながり" },
];

export const DEFAULT_STATE = Object.freeze({
  calm: 0.5,
  arousal: 0.5,
  valence: 0.5,
  coherence: 0.5,
  agency: 0.5,
  connectedness: 0.5,
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value)));

export function normalizeState(input = {}) {
  return Object.fromEntries(
    DIMENSIONS.map(({ key }) => [key, clamp01(input[key] ?? DEFAULT_STATE[key])]),
  );
}

export function stateVector(state) {
  const normalized = normalizeState(state);
  return DIMENSIONS.map(({ key }) => normalized[key]);
}

export function structureDistance(before, after) {
  const left = stateVector(before);
  const right = stateVector(after);
  const squared = left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0);
  return Math.sqrt(squared / left.length);
}

export function outcomeScore(state) {
  const s = normalizeState(state);
  return (s.calm + s.valence + s.coherence + s.agency + s.connectedness + (1 - s.arousal)) / 6;
}

export function sessionOutcome(session) {
  return outcomeScore(session.post) - outcomeScore(session.pre);
}

export function summarizeEvidence(sessions) {
  const completed = sessions.filter((session) => session.pre && session.post && !session.aborted);
  const byCondition = (condition) => completed.filter((session) => session.condition === condition);
  const mean = (values) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
  const adaptive = byCondition("adaptive").map(sessionOutcome);
  const neutral = byCondition("neutral").map(sessionOutcome);
  const adaptiveMean = mean(adaptive);
  const neutralMean = mean(neutral);
  const contrast = adaptiveMean == null || neutralMean == null ? null : adaptiveMean - neutralMean;
  const safetyEvents = sessions.filter((session) => session.aborted || session.adverseEvent).length;
  const transformationCandidate = completed.length >= 6
    && adaptive.length >= 3
    && neutral.length >= 3
    && contrast != null
    && contrast >= 0.15
    && safetyEvents === 0;

  return {
    completed: completed.length,
    adaptiveN: adaptive.length,
    neutralN: neutral.length,
    adaptiveMean,
    neutralMean,
    contrast,
    safetyEvents,
    transformationCandidate,
  };
}

export function createSchedule(seed = "junkawasaki-self-001", blocks = 8) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const random = () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const pairs = Array.from({ length: Math.ceil(blocks / 2) }, () =>
    random() < 0.5 ? ["adaptive", "neutral"] : ["neutral", "adaptive"],
  );
  return pairs.flat().slice(0, blocks).map((condition, index) => ({
    index,
    label: `Condition ${condition === "adaptive" ? "A" : "B"}`,
    condition,
  }));
}

export function deriveStimulus(state, condition = "neutral") {
  const s = normalizeState(state);
  if (condition === "neutral") {
    return { hue: 215, pulseHz: 0.08, baseHz: 146.83, brightness: 0.42, volume: 0.06 };
  }
  return {
    hue: Math.round(190 + 100 * s.valence),
    pulseHz: Math.min(0.15, 0.05 + 0.1 * (1 - s.calm)),
    baseHz: 110 + 180 * s.connectedness,
    brightness: 0.28 + 0.28 * s.coherence,
    volume: Math.min(0.1, 0.035 + 0.055 * s.agency),
  };
}

export function washoutRemainingMs(sessions, now = Date.now(), washoutHours = 20) {
  const latest = sessions
    .filter((session) => session.completedAt)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .at(-1);
  if (!latest) return 0;
  const elapsed = now - Date.parse(latest.completedAt);
  return Math.max(0, washoutHours * 60 * 60 * 1000 - elapsed);
}

export function simulateSystemDynamics({
  initial = DEFAULT_STATE,
  condition = "neutral",
  sensoryIntensity = 0.35,
  tolerance = 0.65,
  stateMatch = 0.7,
  duration = 180,
  dt = 1,
} = {}) {
  const s = normalizeState(initial);
  let regulation = s.calm;
  let arousal = s.arousal;
  let coherence = s.coherence;
  let agency = s.agency;
  const rows = [];
  const adaptive = condition === "adaptive" ? 1 : 0;

  for (let time = 0; time <= duration; time += dt) {
    const alignment = adaptive * stateMatch + (1 - adaptive) * 0.5;
    const overload = Math.max(0, sensoryIntensity - tolerance);
    rows.push({ time, regulation, arousal, coherence, agency, alignment, overload });
    const integrationGain = alignment * (1 - regulation) * 0.08;
    const overloadLoss = overload * regulation * 0.12;
    const arousalGain = sensoryIntensity * (1 - arousal) * 0.10;
    const arousalRecovery = (1 - sensoryIntensity) * arousal * 0.08;
    const coherenceGain = alignment * regulation * (1 - coherence) * 0.06;
    const coherenceDecay = (1 - alignment) * coherence * 0.04;
    const agencyGain = alignment * (1 - agency) * 0.04;
    const agencyLoss = overload * agency * 0.10;
    regulation = clamp01(regulation + dt * (integrationGain - overloadLoss));
    arousal = clamp01(arousal + dt * (arousalGain - arousalRecovery));
    coherence = clamp01(coherence + dt * (coherenceGain - coherenceDecay));
    agency = clamp01(agency + dt * (agencyGain - agencyLoss));
  }
  return rows;
}
