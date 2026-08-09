import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STATE,
  createSchedule,
  deriveStimulus,
  simulateSystemDynamics,
  structureDistance,
  summarizeEvidence,
  washoutRemainingMs,
} from "../src/model.js";

test("balanced schedule contains four sessions per condition", () => {
  const schedule = createSchedule("junkawasaki-self-001", 8);
  assert.equal(schedule.filter((item) => item.condition === "adaptive").length, 4);
  assert.equal(schedule.filter((item) => item.condition === "neutral").length, 4);
});

test("stimulus stays inside low-intensity safety envelope", () => {
  for (const condition of ["adaptive", "neutral"]) {
    const stimulus = deriveStimulus({ ...DEFAULT_STATE, calm: 0, agency: 1 }, condition);
    assert.ok(stimulus.volume <= 0.1);
    assert.ok(stimulus.pulseHz <= 0.15);
    assert.ok(stimulus.pulseHz >= 0.05);
    assert.ok(stimulus.baseHz >= 110 && stimulus.baseHz <= 290);
  }
});

test("structure distance is normalized and symmetric", () => {
  const left = { ...DEFAULT_STATE, calm: 0 };
  const right = { ...DEFAULT_STATE, calm: 1 };
  assert.equal(structureDistance(left, right), structureDistance(right, left));
  assert.ok(structureDistance(left, right) > 0 && structureDistance(left, right) < 1);
});

test("system dynamics produces bounded state variables", () => {
  const rows = simulateSystemDynamics({ condition: "adaptive", sensoryIntensity: 1, tolerance: 0.2 });
  assert.equal(rows.length, 181);
  for (const row of rows) {
    for (const key of ["regulation", "arousal", "coherence", "agency"]) {
      assert.ok(row[key] >= 0 && row[key] <= 1, `${key} out of bounds`);
    }
  }
});

test("transformation candidate requires replication, contrast, and no safety event", () => {
  const make = (condition, delta, index) => ({
    id: String(index), condition, aborted: false, adverseEvent: false,
    pre: { ...DEFAULT_STATE },
    post: { ...DEFAULT_STATE, calm: DEFAULT_STATE.calm + delta, coherence: DEFAULT_STATE.coherence + delta, agency: DEFAULT_STATE.agency + delta },
  });
  const sessions = [0, 1, 2].map((i) => make("adaptive", 0.4, i))
    .concat([3, 4, 5].map((i) => make("neutral", 0, i)));
  assert.equal(summarizeEvidence(sessions).transformationCandidate, true);
  sessions[0].adverseEvent = true;
  assert.equal(summarizeEvidence(sessions).transformationCandidate, false);
});

test("washout prevents immediate repeat and expires after twenty hours", () => {
  const completedAt = "2026-08-09T00:00:00.000Z";
  const sessions = [{ completedAt }];
  assert.equal(washoutRemainingMs(sessions, Date.parse("2026-08-09T19:00:00.000Z")), 3600000);
  assert.equal(washoutRemainingMs(sessions, Date.parse("2026-08-09T20:00:00.000Z")), 0);
});
