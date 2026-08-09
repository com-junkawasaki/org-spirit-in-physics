const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function computeFrameFeatures(rgba, previousGray = null) {
  const pixels = Math.floor(rgba.length / 4);
  const gray = new Float32Array(pixels);
  let brightnessSum = 0;
  let motionSum = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    const luminance = (0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2]) / 255;
    gray[pixel] = luminance;
    brightnessSum += luminance;
    if (previousGray?.length === pixels) motionSum += Math.abs(luminance - previousGray[pixel]);
  }

  return {
    brightness: pixels ? clamp01(brightnessSum / pixels) : 0,
    motion: pixels && previousGray?.length === pixels ? clamp01(motionSum / pixels) : 0,
    gray,
  };
}

export function computeAudioFeatures(samples) {
  if (!samples.length) return { rms: 0, peak: 0 };
  let squareSum = 0;
  let peak = 0;
  for (const sample of samples) {
    squareSum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { rms: clamp01(Math.sqrt(squareSum / samples.length)), peak: clamp01(peak) };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function summarizeSensorSamples(samples) {
  const valid = samples.filter((sample) => sample.quality === "ok");
  return {
    sampleCount: samples.length,
    validCount: valid.length,
    validFraction: samples.length ? valid.length / samples.length : 0,
    cameraBrightnessMean: mean(valid.map((sample) => sample.cameraBrightness)),
    cameraMotionMean: mean(valid.map((sample) => sample.cameraMotion)),
    microphoneRmsMean: mean(valid.map((sample) => sample.microphoneRms)),
    microphonePeakMax: valid.length ? Math.max(...valid.map((sample) => sample.microphonePeak)) : null,
  };
}

export function sanitizeDeviceSettings(kind, settings = {}) {
  if (kind === "camera") {
    return { width: settings.width ?? null, height: settings.height ?? null, frameRate: settings.frameRate ?? null };
  }
  return { sampleRate: settings.sampleRate ?? null, channelCount: settings.channelCount ?? null };
}

export class MacBookSensors {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.context2d = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioBuffer = null;
    this.previousGray = null;
  }

  async start(videoElement) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("このブラウザでは camera/mic を利用できません。");
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
    });
    this.video = videoElement;
    this.video.srcObject = this.stream;
    this.video.muted = true;
    await this.video.play();

    this.canvas = document.createElement("canvas");
    this.canvas.width = 64;
    this.canvas.height = 48;
    this.context2d = this.canvas.getContext("2d", { willReadFrequently: true });

    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.35;
    source.connect(this.analyser); // Intentionally not connected to destination: no microphone feedback.
    this.audioBuffer = new Float32Array(this.analyser.fftSize);
    return this.deviceInfo();
  }

  deviceInfo() {
    const videoTrack = this.stream?.getVideoTracks()[0];
    const audioTrack = this.stream?.getAudioTracks()[0];
    return {
      camera: videoTrack ? sanitizeDeviceSettings("camera", videoTrack.getSettings()) : null,
      microphone: audioTrack ? sanitizeDeviceSettings("microphone", audioTrack.getSettings()) : null,
    };
  }

  isLive() {
    const tracks = this.stream?.getTracks() ?? [];
    return tracks.length >= 2 && tracks.every((track) => track.readyState === "live");
  }

  voiceRecordingStream() {
    const audioTrack = this.stream?.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState !== "live") throw new Error("microphone が利用できません。");
    return new MediaStream([audioTrack]);
  }

  sample() {
    if (!this.isLive() || !this.context2d || !this.analyser || this.video.readyState < 2) {
      return { capturedAt: performance.now(), quality: "unavailable", cameraBrightness: 0, cameraMotion: 0, microphoneRms: 0, microphonePeak: 0 };
    }
    this.context2d.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const image = this.context2d.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const frame = computeFrameFeatures(image.data, this.previousGray);
    this.previousGray = frame.gray;
    this.analyser.getFloatTimeDomainData(this.audioBuffer);
    const audio = computeAudioFeatures(this.audioBuffer);
    return {
      capturedAt: performance.now(),
      quality: "ok",
      cameraBrightness: frame.brightness,
      cameraMotion: frame.motion,
      microphoneRms: audio.rms,
      microphonePeak: audio.peak,
    };
  }

  async stop() {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    if (this.audioContext && this.audioContext.state !== "closed") await this.audioContext.close();
    this.audioContext = null;
    this.previousGray = null;
  }
}
