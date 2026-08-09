const DB_NAME = "spirit-private-self-study";
const STORE_NAME = "sessions";
const RECORDING_STORE_NAME = "voice-recordings";
const DB_VERSION = 2;

export function splitVoiceRecordings(session) {
  const storedSession = structuredClone(session);
  const recordings = [];
  for (const trial of storedSession.wordAssociation?.trials ?? []) {
    if (!trial.voiceRecording?.dataUrl) continue;
    const recordingId = `${storedSession.id}:${trial.trialId}`;
    recordings.push({ id: recordingId, sessionId: storedSession.id, trialId: trial.trialId, recording: trial.voiceRecording });
    trial.voiceRecording = {
      recordingId,
      mimeType: trial.voiceRecording.mimeType,
      sizeBytes: trial.voiceRecording.sizeBytes,
      durationMs: trial.voiceRecording.durationMs,
      maxDurationMs: trial.voiceRecording.maxDurationMs,
    };
  }
  return { storedSession, recordings };
}

export function hydrateVoiceRecordings(session, recordings) {
  const hydrated = structuredClone(session);
  const byId = new Map(recordings.map((item) => [item.id, item.recording]));
  for (const trial of hydrated.wordAssociation?.trials ?? []) {
    const recording = byId.get(trial.voiceRecording?.recordingId);
    if (recording) trial.voiceRecording = recording;
  }
  return hydrated;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(RECORDING_STORE_NAME)) {
        const recordings = db.createObjectStore(RECORDING_STORE_NAME, { keyPath: "id" });
        recordings.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listSessions() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, RECORDING_STORE_NAME], "readonly");
    const sessionsRequest = transaction.objectStore(STORE_NAME).getAll();
    const recordingsRequest = transaction.objectStore(RECORDING_STORE_NAME).getAll();
    transaction.oncomplete = () => {
      const recordings = recordingsRequest.result;
      resolve(sessionsRequest.result
        .map((session) => hydrateVoiceRecordings(session, recordings.filter((item) => item.sessionId === session.id)))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)));
    };
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

export async function saveSession(session) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const { storedSession, recordings } = splitVoiceRecordings(session);
    const transaction = db.transaction([STORE_NAME, RECORDING_STORE_NAME], "readwrite");
    transaction.objectStore(STORE_NAME).put(storedSession);
    const recordingStore = transaction.objectStore(RECORDING_STORE_NAME);
    for (const recording of recordings) recordingStore.put(recording);
    transaction.oncomplete = () => resolve(session);
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

export async function clearSessions() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, RECORDING_STORE_NAME], "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(RECORDING_STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

export function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function encryptExport(payload, passphrase) {
  if (!passphrase || passphrase.length < 12) throw new Error("パスフレーズは12文字以上必要です。");
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  ));
  return {
    format: "spirit-self-study-aes-gcm-v1",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 250000, salt: bytesToBase64(salt) },
    cipher: { name: "AES-GCM", iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(ciphertext),
  };
}
