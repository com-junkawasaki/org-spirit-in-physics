const MAX_RECORDING_MS = 30_000;
const MAX_RECORDING_BYTES = 2_000_000;

export const VOICE_ANALYSIS_PLAN = Object.freeze({
  localAcoustic: {
    analyzerId: "local-acoustic-v1",
    features: ["duration-ms", "rms-mean", "peak-max", "voiced-fraction"],
    status: "enabled",
  },
  transcription: { modelId: null, modelRevision: null, status: "not-run" },
  speechEmotion: { modelId: null, modelRevision: null, status: "not-run" },
});

export function summarizeVoiceFeatures(samples, noiseFloor = 0) {
  const valid = samples.filter((sample) => sample.quality === "ok");
  const threshold = Math.max(0.008, Number(noiseFloor || 0) * 2.5);
  return {
    analyzerId: "local-acoustic-v1",
    sampleCount: samples.length,
    validCount: valid.length,
    rmsMean: valid.length ? valid.reduce((sum, sample) => sum + sample.microphoneRms, 0) / valid.length : null,
    peakMax: valid.length ? Math.max(...valid.map((sample) => sample.microphonePeak)) : null,
    voicedFraction: valid.length ? valid.filter((sample) => sample.microphoneRms >= threshold).length / valid.length : null,
    voiceThreshold: threshold,
    interpretation: "acoustic-description-not-emotion-inference",
  };
}

export function createVoiceAnalysisRecord(recording, acousticFeatures) {
  return {
    rawAudioStored: Boolean(recording),
    localAcoustic: recording ? { ...acousticFeatures, status: "complete" } : { ...acousticFeatures, status: "not-available" },
    transcription: { ...VOICE_ANALYSIS_PLAN.transcription, transcript: null },
    speechEmotion: { ...VOICE_ANALYSIS_PLAN.speechEmotion, labels: null, uncertainty: null },
  };
}

function preferredMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${blob.type || "audio/webm"};base64,${btoa(binary)}`;
}

export class VoiceAnswerRecorder {
  constructor(stream, { maxDurationMs = MAX_RECORDING_MS, maxBytes = MAX_RECORDING_BYTES } = {}) {
    if (!stream?.getAudioTracks?.().length) throw new Error("録音できる microphone track がありません。");
    if (typeof MediaRecorder === "undefined") throw new Error("このブラウザは回答音声の録音に対応していません。");
    this.stream = stream;
    this.maxDurationMs = maxDurationMs;
    this.maxBytes = maxBytes;
    this.recorder = null;
    this.chunks = [];
    this.startedAt = null;
    this.timeout = null;
    this.stopPromise = null;
  }

  start() {
    const mimeType = preferredMimeType();
    const options = { audioBitsPerSecond: 32_000, ...(mimeType ? { mimeType } : {}) };
    this.recorder = new MediaRecorder(this.stream, options);
    this.chunks = [];
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) this.chunks.push(event.data);
    });
    this.startedAt = performance.now();
    this.recorder.start(250);
    this.timeout = setTimeout(() => { void this.stop(); }, this.maxDurationMs);
  }

  isRecording() {
    return this.recorder?.state === "recording";
  }

  async stop() {
    if (this.stopPromise) return this.stopPromise;
    if (!this.recorder) return null;
    this.stopPromise = new Promise((resolve, reject) => {
      const recorder = this.recorder;
      const durationMs = Math.min(this.maxDurationMs, Math.round(performance.now() - this.startedAt));
      recorder.addEventListener("error", () => reject(recorder.error ?? new Error("回答音声を録音できませんでした。")), { once: true });
      recorder.addEventListener("stop", async () => {
        try {
          clearTimeout(this.timeout);
          const blob = new Blob(this.chunks, { type: recorder.mimeType || this.chunks[0]?.type || "audio/webm" });
          if (blob.size > this.maxBytes) throw new Error("回答音声が2MBを超えたため保存しませんでした。");
          resolve({
            dataUrl: await blobToDataUrl(blob),
            mimeType: blob.type,
            sizeBytes: blob.size,
            durationMs,
            maxDurationMs: this.maxDurationMs,
          });
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      if (recorder.state === "inactive") recorder.dispatchEvent(new Event("stop"));
      else recorder.stop();
    });
    return this.stopPromise;
  }
}
