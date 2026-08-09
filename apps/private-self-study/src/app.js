import {
  DEFAULT_STATE,
  DIMENSIONS,
  createSchedule,
  deriveStimulus,
  normalizeState,
  simulateSystemDynamics,
  structureDistance,
  summarizeEvidence,
  washoutRemainingMs,
} from "./model.js";
import { clearSessions, encryptExport, listSessions, saveSession } from "./storage.js";
import { MacBookSensors, summarizeSensorSamples } from "./sensors.js";
import {
  ASSOCIATION_STIMULI,
  EMOTION_MODEL_PLAN,
  createEmotionAnalysisRecord,
  summarizeAssociations,
} from "./association.js";
import { VOICE_ANALYSIS_PLAN, VoiceAnswerRecorder, createVoiceAnalysisRecord, summarizeVoiceFeatures } from "./voice.js";

const PARTICIPANT_ID = "junkawasaki-self-001";
const schedule = createSchedule(PARTICIPANT_ID, 8);
const app = document.querySelector("#app");
let sessions = await listSessions();
let phase = "consent";
let preState = { ...DEFAULT_STATE };
let audio = null;
let timer = null;
let sensorTimer = null;
let sensorPreviewTimer = null;
let sensors = null;
let sensorCalibration = null;
let sensorDeviceInfo = null;
let sensorSamples = [];
let pendingMeasurement = null;
let associationIndex = 0;
let associationTrials = [];
let associationTrialSamples = [];
let associationTrialTimer = null;
let associationPromptStartedAt = null;
let associationFirstInputAt = null;
let associationSummary = null;
let voiceRecorder = null;
let voiceRecording = null;
let voiceStopPromise = null;
let voiceUiTimer = null;
let activeSession = null;

function stateControls(name, state) {
  return `<div class="state-grid" data-state-group="${name}">
    ${DIMENSIONS.map(({ key, label }) => `
      <label><span>${label}</span><output>${Math.round(state[key] * 100)}</output>
        <input name="${key}" type="range" min="0" max="100" value="${Math.round(state[key] * 100)}" />
      </label>`).join("")}
    <label><span>心拍（任意）</span><output>—</output>
      <input name="heartRate" type="number" min="35" max="220" inputmode="numeric" placeholder="bpm" />
    </label>
  </div>`;
}

function readState(group) {
  const root = document.querySelector(`[data-state-group="${group}"]`);
  const values = {};
  for (const { key } of DIMENSIONS) values[key] = Number(root.elements?.[key]?.value ?? root.querySelector(`[name="${key}"]`).value) / 100;
  const heartRateValue = root.querySelector('[name="heartRate"]').value;
  return { state: normalizeState(values), heartRate: heartRateValue ? Number(heartRateValue) : null };
}

function bindRangeOutputs() {
  for (const input of document.querySelectorAll('input[type="range"]')) {
    input.addEventListener("input", () => { input.closest("label").querySelector("output").textContent = input.value; });
  }
}

function consentView() {
  app.innerHTML = `<section class="shell narrow">
    <p class="eyebrow">PRIVATE · N-OF-1 · LOCAL ONLY</p>
    <h1>Spirit Self-Study</h1>
    <p class="lead">ここでいう spirit は、主観・行動・任意の生理指標から構成する操作的な情報モデルです。独立した生命体の検出や、医療効果を意味しません。</p>
    <div class="notice"><strong>安全境界</strong><ul>
      <li>低速映像のみ。ストロボ・サブリミナル刺激・高音量は使いません。</li>
      <li>不快感、頭痛、動悸、現実感の低下、強い不安があれば即時停止します。</li>
      <li>音量は端末側でも会話より小さく設定してください。運転中・飲酒時・睡眠不足時は実施しません。</li>
      <li>camera 映像と連続 mic 音声は保存しません。言語連想の回答音声だけを各語30秒以内・2MB以内で端末内に保存します。</li>
      <li>display と speaker の刺激が camera/mic 特徴へ混入するため、センサー値を spirit の直接測定や診断として扱いません。</li>
      <li>外部 API・クラウド送信・顔認識は使いません。音声は端末内の音響特徴だけ分析し、文字起こし・音声感情推定は未実行として記録します。</li>
    </ul></div>
    <form id="consent-form" class="consent">
      <label><input type="checkbox" required /> 被験者は研究者本人 junkawasaki であり、自発的に参加します。</label>
      <label><input type="checkbox" required /> いつでも理由なく停止でき、単回結果を「構造変容」と断定しません。</label>
      <label><input type="checkbox" required /> 保存先はこのブラウザ内だけで、private repository にも実測データをコミットしません。</label>
      <label><input type="checkbox" required /> camera/mic の利用と、回答音声クリップおよび集約特徴量の端末内保存に同意します。</label>
      <button type="submit" class="primary">同意して測定へ</button>
    </form>
  </section>`;
  document.querySelector("#consent-form").addEventListener("submit", (event) => {
    event.preventDefault();
    phase = washoutRemainingMs(sessions) > 0 ? "report" : "sensor-setup";
    render();
  });
}

function meterPercent(value, scale = 1) {
  return `${Math.round(Math.max(0, Math.min(1, value * scale)) * 100)}%`;
}

function updateSensorMeters(sample) {
  const values = {
    "camera-brightness": meterPercent(sample.cameraBrightness),
    "camera-motion": meterPercent(sample.cameraMotion, 4),
    "microphone-rms": meterPercent(sample.microphoneRms, 5),
  };
  for (const [id, value] of Object.entries(values)) {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  }
}

async function stopSensors() {
  if (sensorTimer) clearInterval(sensorTimer);
  if (sensorPreviewTimer) clearInterval(sensorPreviewTimer);
  sensorTimer = null;
  sensorPreviewTimer = null;
  if (associationTrialTimer) clearInterval(associationTrialTimer);
  associationTrialTimer = null;
  await discardVoiceCapture();
  if (sensors) await sensors.stop();
  sensors = null;
}

function sensorSetupView() {
  app.innerHTML = `<section class="shell narrow">
    <p class="eyebrow">MACBOOK SENSOR CHECK</p>
    <h1>Camera + Mic</h1>
    <p class="lead">camera は明るさと変化量、mic は RMS と peak を計算します。映像と連続音声は保存せず、後続の言語連想で明示される回答クリップだけを保存します。</p>
    <div class="sensor-panel">
      <video id="sensor-preview" playsinline muted></video>
      <div class="sensor-readings">
        <article><span>Brightness</span><strong id="camera-brightness">—</strong></article>
        <article><span>Frame change</span><strong id="camera-motion">—</strong></article>
        <article><span>Mic RMS</span><strong id="microphone-rms">—</strong></article>
      </div>
    </div>
    <div class="notice"><strong>準備</strong><p id="sensor-status">MacBookを安定した場所に置き、camera の前に座り、端末音量を会話より小さくしてください。</p></div>
    <div class="actions"><button id="authorize-sensors" class="primary">Camera / Mic を許可</button><button id="calibrate" class="secondary" disabled>10秒校正して測定へ</button><button id="cancel-sensors" class="danger">中止</button></div>
  </section>`;

  document.querySelector("#authorize-sensors").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const status = document.querySelector("#sensor-status");
    button.disabled = true;
    status.textContent = "許可を待っています…";
    try {
      sensors = new MacBookSensors();
      sensorDeviceInfo = await sensors.start(document.querySelector("#sensor-preview"));
      status.textContent = "取得中です。camera表示と数値が動くことを確認してください。";
      document.querySelector("#calibrate").disabled = false;
      sensorPreviewTimer = setInterval(() => updateSensorMeters(sensors.sample()), 250);
    } catch (error) {
      await stopSensors();
      status.textContent = `開始できません: ${error.message}`;
      button.disabled = false;
    }
  });

  document.querySelector("#calibrate").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const status = document.querySelector("#sensor-status");
    button.disabled = true;
    const calibrationSamples = [];
    let remaining = 10;
    status.textContent = `自然に座ったまま校正します: ${remaining} 秒`;
    const calibrationTimer = setInterval(() => {
      if (!sensors?.isLive()) {
        clearInterval(calibrationTimer);
        status.textContent = "camera/mic が切断されました。再許可してください。";
        document.querySelector("#authorize-sensors").disabled = false;
        return;
      }
      calibrationSamples.push(sensors.sample());
      remaining -= 1;
      status.textContent = `自然に座ったまま校正します: ${remaining} 秒`;
      if (remaining <= 0) {
        clearInterval(calibrationTimer);
        if (sensorPreviewTimer) clearInterval(sensorPreviewTimer);
        sensorPreviewTimer = null;
        sensorCalibration = summarizeSensorSamples(calibrationSamples);
        phase = "measure-pre";
        render();
      }
    }, 1000);
  });

  document.querySelector("#cancel-sensors").addEventListener("click", async () => {
    await stopSensors();
    phase = "consent";
    render();
  });
}

function measureView(kind) {
  const isPre = kind === "pre";
  app.innerHTML = `<section class="shell narrow">
    <p class="eyebrow">${isPre ? "PRE-MEASUREMENT" : "POST-MEASUREMENT"}</p>
    <h1>${isPre ? "現在の状態" : "刺激直後の状態"}</h1>
    <p class="lead">考え込みすぎず、今この瞬間を 0–100 で記録してください。</p>
    ${stateControls(kind, isPre ? preState : activeSession.pre)}
    <label class="text-field">メモ（任意・端末内のみ）<textarea id="note" rows="3" maxlength="1000"></textarea></label>
    <button id="measure-next" class="primary">${isPre ? "言語連想課題へ" : "セッションを保存"}</button>
  </section>`;
  bindRangeOutputs();
  document.querySelector("#measure-next").addEventListener("click", async () => {
    const measured = readState(kind);
    if (isPre) {
      preState = measured.state;
      pendingMeasurement = { ...measured, note: document.querySelector("#note").value };
      phase = "association-intro";
      render();
    } else {
      activeSession.post = measured.state;
      activeSession.postHeartRate = measured.heartRate;
      activeSession.postNote = document.querySelector("#note").value;
      activeSession.completedAt = new Date().toISOString();
      activeSession.structureDistance = structureDistance(activeSession.pre, activeSession.post);
      await saveSession(activeSession);
      sessions = await listSessions();
      activeSession = null;
      phase = "report";
      render();
    }
  });
}

function associationIntroView() {
  app.innerHTML = `<section class="shell narrow">
    <p class="eyebrow">WORD ASSOCIATION · EXPLORATORY</p>
    <h1>言葉への最初の反応</h1>
    <p class="lead">表示された語を見て、最初に浮かんだ短い言葉を入力または発話します。反応の速さ、回答音声、自己評価、camera/mic特徴を同じ時間軸に記録します。</p>
    <div class="notice"><strong>解釈境界</strong><ul>
      <li>ユングの言語連想法に着想を得ていますが、コンプレックス、無意識、人格、虚偽を判定しません。</li>
      <li>遅い反応は注意、入力、語の馴染み、疲労など多くの要因で生じます。</li>
      <li>回答しづらい語は「回答なし」で進められ、いつでも中止できます。</li>
      <li>各語の表示から送信まで（最大30秒）の回答音声を端末内に保存します。録音は画面に明示され、各試行で停止できます。</li>
    </ul></div>
    <p>${ASSOCIATION_STIMULI.length}語・約3分。音響特徴は端末内で計算し、文字起こし・LLM感情分析は実行せず、本人評価を一次情報として保存します。</p>
    <div class="actions"><button id="association-start" class="primary">課題を開始</button><button id="association-cancel" class="danger">中止</button></div>
  </section>`;
  document.querySelector("#association-start").addEventListener("click", () => {
    associationIndex = 0;
    associationTrials = [];
    associationSummary = null;
    phase = "association-trial";
    render();
  });
  document.querySelector("#association-cancel").addEventListener("click", async () => {
    await stopSensors();
    pendingMeasurement = null;
    phase = "consent";
    render();
  });
}

function associationTrialView() {
  const stimulus = ASSOCIATION_STIMULI[associationIndex];
  associationTrialSamples = [];
  associationPromptStartedAt = null;
  associationFirstInputAt = null;
  voiceRecording = null;
  voiceStopPromise = null;
  app.innerHTML = `<section class="association-task">
    <p class="eyebrow">WORD ${associationIndex + 1} / ${ASSOCIATION_STIMULI.length}</p>
    <div class="association-word" aria-live="polite">${stimulus.word}</div>
    <form id="association-form" class="association-response">
      <label>最初に浮かんだ言葉<input id="association-input" maxlength="80" autocomplete="off" disabled /></label>
      <div class="voice-capture" aria-live="polite"><span id="voice-status">音声録音を準備中…</span><button id="voice-stop" class="secondary" type="button" disabled>録音を停止</button></div>
      <div class="association-ratings">
        <label><span>不快 — 快</span><output>50</output><input id="association-valence" type="range" min="0" max="100" value="50" /></label>
        <label><span>静か — 強い</span><output>50</output><input id="association-arousal" type="range" min="0" max="100" value="50" /></label>
      </div>
      <div class="actions"><button id="association-submit" class="primary" type="submit" disabled>記録して次へ</button><button id="association-omit" class="secondary" type="button" disabled>回答なし</button><button id="association-abort" class="danger" type="button">中止</button></div>
    </form>
  </section>`;
  bindRangeOutputs();
  const input = document.querySelector("#association-input");
  const submit = document.querySelector("#association-submit");
  const omit = document.querySelector("#association-omit");
  const voiceStop = document.querySelector("#voice-stop");

  associationTrialTimer = setInterval(() => {
    if (sensors?.isLive()) associationTrialSamples.push(sensors.sample());
  }, 250);

  const armTrial = () => {
    if (associationPromptStartedAt != null) return;
    associationPromptStartedAt = performance.now();
    input.disabled = false;
    submit.disabled = false;
    omit.disabled = false;
    input.focus();
    void startVoiceCapture();
  };
  requestAnimationFrame(() => requestAnimationFrame(armTrial));
  setTimeout(armTrial, 100); // Fallback when rendering callbacks are throttled.
  input.addEventListener("beforeinput", () => {
    if (associationFirstInputAt == null && associationPromptStartedAt != null) associationFirstInputAt = performance.now();
  });
  document.querySelector("#association-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void finishAssociationTrial(false);
  });
  omit.addEventListener("click", () => { void finishAssociationTrial(true); });
  voiceStop.addEventListener("click", async () => {
    voiceStop.disabled = true;
    const status = document.querySelector("#voice-status");
    try {
      const recording = await captureVoiceAnswer();
      if (status) status.textContent = recording ? `録音済み · ${(recording.durationMs / 1000).toFixed(1)}秒` : "録音なし";
    } catch (error) {
      if (status) status.textContent = `録音を保存できません: ${error.message}`;
    }
  });
  document.querySelector("#association-abort").addEventListener("click", async () => {
    await stopSensors();
    pendingMeasurement = null;
    phase = "consent";
    render();
  });
}

async function startVoiceCapture() {
  const status = document.querySelector("#voice-status");
  const stopButton = document.querySelector("#voice-stop");
  try {
    voiceRecorder = new VoiceAnswerRecorder(sensors.voiceRecordingStream());
    voiceRecorder.start();
    if (status) status.textContent = "● 回答音声を録音中 · 最大30秒 · 端末内のみ";
    if (stopButton) stopButton.disabled = false;
    voiceUiTimer = setTimeout(async () => {
      try {
        const recording = await captureVoiceAnswer();
        const currentStatus = document.querySelector("#voice-status");
        const currentButton = document.querySelector("#voice-stop");
        if (currentStatus) currentStatus.textContent = recording ? "30秒で録音を自動停止しました" : "録音なし";
        if (currentButton) currentButton.disabled = true;
      } catch (error) {
        if (document.querySelector("#voice-status")) document.querySelector("#voice-status").textContent = `録音を保存できません: ${error.message}`;
      }
    }, 30_050);
  } catch (error) {
    voiceRecorder = null;
    if (status) status.textContent = `音声録音を開始できません: ${error.message}（文字回答は継続できます）`;
  }
}

async function captureVoiceAnswer() {
  if (voiceRecording) return voiceRecording;
  if (voiceStopPromise) return voiceStopPromise;
  if (!voiceRecorder) return null;
  if (voiceUiTimer) clearTimeout(voiceUiTimer);
  voiceUiTimer = null;
  const recorder = voiceRecorder;
  voiceStopPromise = recorder.stop().then((result) => {
    voiceRecording = result;
    voiceRecorder = null;
    return result;
  }).finally(() => { voiceStopPromise = null; });
  return voiceStopPromise;
}

async function discardVoiceCapture() {
  if (voiceUiTimer) clearTimeout(voiceUiTimer);
  voiceUiTimer = null;
  try {
    if (voiceStopPromise) await voiceStopPromise;
    else if (voiceRecorder) await voiceRecorder.stop();
  } catch { /* A discarded, unsaved recording must not block cleanup. */ }
  voiceRecorder = null;
  voiceRecording = null;
  voiceStopPromise = null;
}

async function finishAssociationTrial(omitted) {
  const submit = document.querySelector("#association-submit");
  const omitButton = document.querySelector("#association-omit");
  const voiceButton = document.querySelector("#voice-stop");
  submit.disabled = true;
  omitButton.disabled = true;
  voiceButton.disabled = true;
  if (associationTrialTimer) clearInterval(associationTrialTimer);
  associationTrialTimer = null;
  const stimulus = ASSOCIATION_STIMULI[associationIndex];
  const now = performance.now();
  const response = omitted ? "" : document.querySelector("#association-input").value.trim();
  let recording = null;
  if (omitted) await discardVoiceCapture();
  else {
    try { recording = await captureVoiceAnswer(); }
    catch (error) {
      document.querySelector("#voice-status").textContent = `音声を保存できません: ${error.message}`;
    }
  }
  const voiceFeatures = summarizeVoiceFeatures(associationTrialSamples, sensorCalibration?.microphoneRmsMean);
  associationTrials.push({
    trialId: crypto.randomUUID(),
    stimulusId: stimulus.id,
    stimulusWord: stimulus.word,
    stimulusCategory: stimulus.category,
    response,
    omitted,
    firstInputLatencyMs: omitted || associationFirstInputAt == null ? null : Math.round(associationFirstInputAt - associationPromptStartedAt),
    submitLatencyMs: Math.round(now - associationPromptStartedAt),
    selfValence: Number(document.querySelector("#association-valence").value) / 100,
    selfArousal: Number(document.querySelector("#association-arousal").value) / 100,
    sensor: { rawMediaStored: false, summary: summarizeSensorSamples(associationTrialSamples) },
    voiceRecording: recording,
    voiceAnalysis: createVoiceAnalysisRecord(recording, voiceFeatures),
  });
  associationIndex += 1;
  if (associationIndex < ASSOCIATION_STIMULI.length) {
    render();
  } else {
    associationSummary = summarizeAssociations(associationTrials);
    phase = "association-summary";
    render();
  }
}

function mountVoicePlayers(selector, trials) {
  const root = document.querySelector(selector);
  if (!root) return;
  for (const trial of trials.filter((item) => item.voiceRecording?.dataUrl)) {
    const row = document.createElement("article");
    const label = document.createElement("span");
    label.textContent = `${trial.stimulusWord} · ${(trial.voiceRecording.durationMs / 1000).toFixed(1)}秒 · local acoustic complete`;
    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = trial.voiceRecording.dataUrl;
    row.append(label, player);
    root.append(row);
  }
}

function associationSummaryView() {
  const flags = associationSummary.latencyFlags
    .map((id) => ASSOCIATION_STIMULI.find((item) => item.id === id)?.word)
    .filter(Boolean);
  app.innerHTML = `<section class="shell narrow">
    <p class="eyebrow">ASSOCIATION SUMMARY · NOT A TEST SCORE</p>
    <h1>反応の記録</h1>
    <div class="metrics association-metrics">
      <article><span>回答</span><strong>${associationSummary.answeredCount}</strong><small>/ ${associationSummary.trialCount}</small></article>
      <article><span>反応中央値</span><strong>${associationSummary.medianLatencyMs == null ? "—" : (associationSummary.medianLatencyMs / 1000).toFixed(2)}</strong><small>seconds</small></article>
      <article><span>音声回答</span><strong>${associationSummary.voiceAnswerCount}</strong><small>local clips</small></article>
    </div>
    <div class="notice"><strong>記述的フラグ</strong><p>${flags.length ? flags.join("、") : "なし"}</p><p>これは同一セッション内の反応時間差です。心理的なコンプレックスや重要性を示す判定ではありません。</p></div>
    <p>回答音声の基本音響特徴は端末内で計算済みです。文字起こしと音声感情推論は未実行で、本人の回答と快・不快／強度評価を一次データとして保存します。</p>
    <div id="voice-players" class="voice-players" aria-label="端末内の回答音声"></div>
    <div class="actions"><button id="start-av" class="primary">映像・音声刺激へ</button><button id="association-stop" class="danger">ここで中止</button></div>
  </section>`;
  mountVoicePlayers("#voice-players", associationTrials);
  document.querySelector("#start-av").addEventListener("click", () => {
    startIntervention(pendingMeasurement, {
      protocolVersion: "word-association-v0.2-voice",
      trials: structuredClone(associationTrials),
      summary: structuredClone(associationSummary),
      emotionAnalysis: createEmotionAnalysisRecord(associationTrials),
      modelPlan: EMOTION_MODEL_PLAN,
      voiceAnalysisPlan: VOICE_ANALYSIS_PLAN,
    });
  });
  document.querySelector("#association-stop").addEventListener("click", async () => {
    await stopSensors();
    pendingMeasurement = null;
    phase = "consent";
    render();
  });
}

function startAudio(stimulus) {
  const context = new AudioContext();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  master.gain.value = 0;
  master.connect(filter).connect(context.destination);
  const voices = [1, 1.5, 2].map((ratio, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = stimulus.baseHz * ratio;
    gain.gain.value = stimulus.volume / (5 + index * 2);
    oscillator.connect(gain).connect(master);
    oscillator.start();
    return { oscillator, gain };
  });
  master.gain.linearRampToValueAtTime(stimulus.volume, context.currentTime + 4);
  return { context, master, voices };
}

function stopStimulus() {
  if (timer) clearInterval(timer);
  timer = null;
  if (audio) {
    const { context, master } = audio;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(0, context.currentTime + 0.15);
    setTimeout(() => context.close(), 220);
  }
  audio = null;
}

function beginSensorRecording() {
  sensorSamples = [];
  const startedAt = performance.now();
  sensorTimer = setInterval(() => {
    if (!activeSession || phase !== "intervention") return;
    if (!sensors?.isLive()) {
      void abortActiveSession("sensor_lost", false);
      return;
    }
    const sample = sensors.sample();
    const stored = {
      elapsedSeconds: Math.round((sample.capturedAt - startedAt) / 1000),
      quality: sample.quality,
      cameraBrightness: Number(sample.cameraBrightness.toFixed(4)),
      cameraMotion: Number(sample.cameraMotion.toFixed(4)),
      microphoneRms: Number(sample.microphoneRms.toFixed(4)),
      microphonePeak: Number(sample.microphonePeak.toFixed(4)),
    };
    sensorSamples.push(stored);
    updateSensorMeters(sample);
  }, 1000);
}

async function endSensorRecording() {
  if (sensorTimer) clearInterval(sensorTimer);
  sensorTimer = null;
  if (activeSession?.sensor) {
    activeSession.sensor.samples = sensorSamples;
    activeSession.sensor.summary = summarizeSensorSamples(sensorSamples);
  }
  sensorSamples = [];
  await stopSensors();
}

async function abortActiveSession(reason, adverseEvent = true) {
  if (!activeSession) return;
  stopStimulus();
  activeSession.aborted = true;
  activeSession.adverseEvent = adverseEvent;
  activeSession.abortReason = reason;
  activeSession.completedAt = new Date().toISOString();
  await endSensorRecording();
  await saveSession(activeSession);
  sessions = await listSessions();
  activeSession = null;
  phase = "report";
  render();
}

function startIntervention(measured, wordAssociation) {
  const assignment = schedule[sessions.length % schedule.length];
  const duration = 180;
  const stimulus = deriveStimulus(measured.state, assignment.condition);
  activeSession = {
    id: crypto.randomUUID(),
    participantId: PARTICIPANT_ID,
    protocolVersion: "0.4.0-voice-association",
    startedAt: new Date().toISOString(),
    conditionLabel: assignment.label,
    condition: assignment.condition,
    pre: measured.state,
    preHeartRate: measured.heartRate,
    preNote: measured.note ?? "",
    durationSeconds: duration,
    stimulus,
    wordAssociation,
    sensor: {
      mode: "macbook-camera-microphone-features-v1",
      rawMediaStored: false,
      calibration: sensorCalibration,
      devices: sensorDeviceInfo,
      samples: [],
      summary: null,
    },
    aborted: false,
    adverseEvent: false,
  };
  phase = "intervention";
  render();
  audio = startAudio(stimulus);
  beginSensorRecording();
  let remaining = duration;
  timer = setInterval(() => {
    remaining -= 1;
    const counter = document.querySelector("#counter");
    if (counter) counter.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    if (remaining <= 0) {
      stopStimulus();
      void endSensorRecording();
      phase = "measure-post";
      render();
    }
  }, 1000);
}

function interventionView() {
  const stimulus = activeSession.stimulus;
  app.innerHTML = `<section class="intervention" style="--hue:${stimulus.hue};--pulse:${1 / stimulus.pulseHz}s;--brightness:${stimulus.brightness}">
    <div class="field"><div class="orb one"></div><div class="orb two"></div><div class="orb three"></div></div>
    <div class="session-hud">
      <p>${activeSession.conditionLabel} · 低刺激</p>
      <strong id="counter">3:00</strong>
      <p>呼吸を変える必要はありません。映像と音をただ観察します。</p>
      <div class="live-sensors" aria-label="保存される集約センサー特徴">
        <span>light <b id="camera-brightness">—</b></span><span>motion <b id="camera-motion">—</b></span><span>mic <b id="microphone-rms">—</b></span>
      </div>
      <div class="actions"><button id="finish" class="secondary">ここで終了して測定</button><button id="abort" class="danger">即時停止</button></div>
    </div>
  </section>`;
  document.querySelector("#finish").addEventListener("click", async () => {
    stopStimulus();
    await endSensorRecording();
    phase = "measure-post";
    render();
  });
  document.querySelector("#abort").addEventListener("click", () => abortActiveSession("participant_stop", true));
}

function fmt(value) {
  return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function drawStructure(canvas, state) {
  const context = canvas.getContext("2d");
  const ratio = devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const values = normalizeState(state);
  const center = [width / 2, height / 2];
  const radius = Math.min(width, height) * 0.31;
  const nodes = DIMENSIONS.map(({ key, label }, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / DIMENSIONS.length;
    return { key, label, value: values[key], x: center[0] + Math.cos(angle) * radius, y: center[1] + Math.sin(angle) * radius };
  });
  context.lineWidth = 1;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const weight = 1 - Math.abs(nodes[i].value - nodes[j].value);
      context.strokeStyle = `rgba(112, 210, 255, ${0.06 + weight * 0.28})`;
      context.beginPath(); context.moveTo(nodes[i].x, nodes[i].y); context.lineTo(nodes[j].x, nodes[j].y); context.stroke();
    }
  }
  for (const node of nodes) {
    context.fillStyle = `hsl(${190 + node.value * 100} 78% ${42 + node.value * 22}%)`;
    context.beginPath(); context.arc(node.x, node.y, 8 + 16 * node.value, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#dff7ff"; context.font = "12px system-ui"; context.textAlign = "center";
    context.fillText(node.label, node.x, node.y + 34);
  }
}

function reportView() {
  const evidence = summarizeEvidence(sessions);
  const latest = sessions.at(-1);
  const remainingMs = washoutRemainingMs(sessions);
  const remainingHours = Math.ceil(remainingMs / 3600000);
  app.innerHTML = `<section class="shell">
    <p class="eyebrow">DESCRIPTIVE REPORT · NOT A DIAGNOSIS</p>
    <h1>反復差として見る</h1>
    <div class="metrics">
      <article><span>完了</span><strong>${evidence.completed}</strong><small>sessions</small></article>
      <article><span>Adaptive 平均差</span><strong>${fmt(evidence.adaptiveMean)}</strong><small>outcome</small></article>
      <article><span>Neutral 平均差</span><strong>${fmt(evidence.neutralMean)}</strong><small>outcome</small></article>
      <article><span>A − B</span><strong>${fmt(evidence.contrast)}</strong><small>exploratory</small></article>
    </div>
    ${latest?.post ? `<div class="structures"><article><h2>直前</h2><canvas id="pre-graph"></canvas></article><article><h2>直後</h2><canvas id="post-graph"></canvas></article></div>
      <p>今回の構造距離: <strong>${latest.structureDistance.toFixed(3)}</strong>。これは短期の自己報告差であり、情報生命体の実在や恒久的変容の証明ではありません。</p>` : ""}
    ${latest?.wordAssociation ? `<div class="notice"><strong>言語・音声連想プロセス</strong><p>回答 ${latest.wordAssociation.summary.answeredCount}/${latest.wordAssociation.summary.trialCount}、音声 ${latest.wordAssociation.summary.voiceAnswerCount ?? 0}件、反応時間有効 ${latest.wordAssociation.summary.timedAnswerCount ?? 0}件、反応中央値 ${latest.wordAssociation.summary.medianLatencyMs == null ? "—" : (latest.wordAssociation.summary.medianLatencyMs / 1000).toFixed(2)} 秒。</p><p>音響特徴: local complete。文字起こし・LLM感情推論: not-run。本人評価が一次情報です。</p><div id="latest-voice-players" class="voice-players" aria-label="保存済み回答音声"></div></div>` : ""}
    <div class="notice"><strong>判定</strong><p>${evidence.transformationCandidate
      ? "事前条件（各条件3回以上、A−B ≥ 0.15、安全イベントなし）を満たす探索的な変容候補です。独立再現が必要です。"
      : "まだ構造変容とは判定しません。各条件3回以上を安全に反復し、条件差を比較します。"}</p></div>
    ${remainingMs > 0 ? `<p class="washout">ウォッシュアウト中: 次のセッションまで約 ${remainingHours} 時間</p>` : ""}
    <div class="actions"><button id="next-session" class="primary" ${remainingMs > 0 ? "disabled" : ""}>次のセッション</button><button id="simulate" class="secondary">XMILE仮説を計算</button><button id="export" class="secondary">暗号化して書き出す</button><button id="clear" class="danger">端末内データを削除</button></div>
    <pre id="simulation" hidden></pre>
  </section>`;
  if (latest?.post) {
    drawStructure(document.querySelector("#pre-graph"), latest.pre);
    drawStructure(document.querySelector("#post-graph"), latest.post);
  }
  if (latest?.wordAssociation) mountVoicePlayers("#latest-voice-players", latest.wordAssociation.trials);
  document.querySelector("#next-session").addEventListener("click", () => { phase = "sensor-setup"; render(); });
  document.querySelector("#simulate").addEventListener("click", () => {
    const rows = simulateSystemDynamics({ initial: latest?.pre ?? DEFAULT_STATE, condition: latest?.condition ?? "neutral" });
    const last = rows.at(-1);
    const output = document.querySelector("#simulation");
    output.hidden = false;
    output.textContent = JSON.stringify({ note: "XMILEと同型の仮説シミュレーション。観測値ではない。", final: last }, null, 2);
  });
  document.querySelector("#export").addEventListener("click", async () => {
    const passphrase = prompt("12文字以上の書き出し用パスフレーズ（復旧できません）");
    if (!passphrase) return;
    try {
      const encrypted = await encryptExport({ participantId: PARTICIPANT_ID, exportedAt: new Date().toISOString(), sessions }, passphrase);
      const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `spirit-self-study-${new Date().toISOString().slice(0, 10)}.encrypted.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) { alert(error.message); }
  });
  document.querySelector("#clear").addEventListener("click", async () => {
    if (!confirm("このブラウザ内の self-study データをすべて削除します。元に戻せません。")) return;
    await clearSessions(); sessions = []; render();
  });
}

function render() {
  stopStimulus();
  if (phase === "consent") consentView();
  else if (phase === "sensor-setup") sensorSetupView();
  else if (phase === "measure-pre") measureView("pre");
  else if (phase === "association-intro") associationIntroView();
  else if (phase === "association-trial") associationTrialView();
  else if (phase === "association-summary") associationSummaryView();
  else if (phase === "intervention") interventionView();
  else if (phase === "measure-post") measureView("post");
  else reportView();
}

document.addEventListener("visibilitychange", async () => {
  if (document.hidden && phase === "intervention") {
    await abortActiveSession("page_hidden", false);
  } else if (document.hidden && phase === "sensor-setup") {
    await stopSensors();
    sensorDeviceInfo = null;
    sensorCalibration = null;
    render();
  } else if (document.hidden && phase.startsWith("association-")) {
    await stopSensors();
    pendingMeasurement = null;
    associationTrials = [];
    phase = "sensor-setup";
    render();
  }
});

render();
