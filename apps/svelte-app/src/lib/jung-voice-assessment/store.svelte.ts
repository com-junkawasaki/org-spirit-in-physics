import { participantClient, storageClient } from "$lib/connect";
import type { StimulusWord } from "@/generated/proto/participant/v1/participant_pb";

export type TestStatus = 'idle' | 'preflight' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
export type DeviceStatus = 'idle' | 'pending' | 'success' | 'error';
export type MediaStatus = 'idle' | 'recording_session' | 'recording_response' | 'processing';

export interface WordResponse {
  stimulusWord: StimulusWord;
  responseWord: string;
  reactionTimeMs: number;
  audioBlob?: Blob;
}

export interface TestEvent {
  timestamp: number;
  type: string;
  payload?: any;
}

class KawasakiStore {
  testStatus = $state<TestStatus>('idle');
  deviceStatus = $state<DeviceStatus>('idle');
  stream = $state<MediaStream | null>(null);
  error = $state<string | null>(null);
  stimulusWords = $state<StimulusWord[]>([]);
  currentSession = $state<1 | 2>(1);
  currentWordIndex = $state<number>(-1);
  wordResponses = $state<WordResponse[]>([]);
  mediaStatus = $state<MediaStatus>('idle');
  events = $state<TestEvent[]>([]);
  sessionVideoUrl = $state<string | null>(null);
  participantId = $state<string | null>(null);
  demographics = $state({
    ageGroup: "",
    gender: "",
    ethnicity: "",
    incomeRange: "",
    mentalIllness: "",
  });

  constructor() {
    // Initial load if needed
  }

  initializeParticipant(id?: string, demographics?: any) {
    this.participantId = id || crypto.randomUUID();
    if (demographics) {
      this.demographics = { ...this.demographics, ...demographics };
    }
    this.logEvent('participant_initialized', { 
      participantId: this.participantId,
      demographics: this.demographics 
    });
  }

  async createParticipantOnServer(signature: string, agreements: any) {
    if (!this.participantId) return;

    try {
      await participantClient.createParticipant({
        id: this.participantId,
        signature,
        agreements: agreements as any, // protobuf Struct will handle this if correctly formatted
        agreedAt: { seconds: BigInt(Math.floor(Date.now() / 1000)), nanos: 0 },
        ageGroup: this.demographics.ageGroup,
        ethnicity: this.demographics.ethnicity,
        incomeRange: this.demographics.incomeRange,
        mentalIllness: this.demographics.mentalIllness,
        isPublic: true
      });
      this.logEvent('participant_created_on_server');
    } catch (e) {
      console.error("Failed to create participant on server:", e);
      this.logEvent('participant_creation_failed', { error: String(e) });
      throw e;
    }
  }

  async loadStimulusWords() {
    try {
      const response = await participantClient.getStimulusWords({});
      this.stimulusWords = response.words;
      this.logEvent('stimulus_words_loaded', { count: this.stimulusWords.length });
    } catch (e: any) {
      this.error = "刺激語の読み込みに失敗しました。";
      console.error(e);
    }
  }

  startPreflight() {
    this.testStatus = 'preflight';
    this.deviceStatus = 'pending';
    this.logEvent('preflight_started');
  }

  logEvent(type: string, payload: any = {}) {
    this.events.push({ timestamp: Date.now(), type, payload });
  }

  startSession(numberOfWords: number) {
    const sessionNumber = this.currentSession;
    // Shuffle and slice words
    const shuffled = [...this.stimulusWords].sort(() => 0.5 - Math.random()).slice(0, numberOfWords);
    this.stimulusWords = shuffled;
    
    this.testStatus = sessionNumber === 1 ? 'session-1-running' : 'session-2-running';
    this.currentWordIndex = 0;
    this.logEvent('session_started', { session: sessionNumber, numberOfWords });
  }

  completeSession() {
    if (this.currentSession === 1) {
      this.testStatus = 'session-1-complete';
      this.currentWordIndex = -1;
      this.currentSession = 2;
      this.logEvent('session_1_completed');
    } else {
      this.testStatus = 'completed';
      this.logEvent('session_2_completed');
      this.logEvent('test_completed');
    }
  }

  advanceToNextWord() {
    if (this.testStatus === 'completed') return;

    if (this.currentWordIndex + 1 >= this.stimulusWords.length) { 
      this.completeSession();
    } else {
      this.currentWordIndex += 1;
    }
  }

  recordWordResponse(response: { responseWord: string; reactionTimeMs: number; audioBlob?: Blob }) {
    const stimulusWord = this.stimulusWords[this.currentWordIndex];
    if (!stimulusWord) return;

    const fullResponse: WordResponse = {
      stimulusWord,
      ...response
    };

    this.wordResponses.push(fullResponse);
    this.logEvent('word_response_recorded', {
      stimulus: stimulusWord.japanese,
      response: response.responseWord,
      reaction: response.reactionTimeMs,
    });

    this.advanceToNextWord();
  }

  async uploadArtifact(blob: Blob, type: 'video' | 'image' | 'audio', sessionIndex: number) {
    if (!this.participantId) return;

    const fileName = `session-${sessionIndex}-${type}-${Date.now()}.${type === 'video' ? 'webm' : type === 'image' ? 'jpg' : 'webm'}`;
    const contentType = type === 'video' ? 'video/webm' : type === 'image' ? 'image/jpeg' : 'audio/webm';

    try {
      const buffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(buffer);

      const response = await storageClient.uploadArtifact({
        participantId: this.participantId,
        fileName,
        fileData,
        contentType,
        artifactType: type
      });

      this.logEvent('artifact_uploaded', { type, url: response.publicUrl, session: sessionIndex });
      return response.publicUrl;
    } catch (e) {
      console.error(`Failed to upload ${type}:`, e);
      this.logEvent('artifact_upload_failed', { type, error: String(e), session: sessionIndex });
    }
  }

  resetTest() {
    this.testStatus = 'idle';
    this.deviceStatus = 'idle';
    this.currentSession = 1;
    this.currentWordIndex = -1;
    this.wordResponses = [];
    this.events = [];
    this.error = null;
    this.logEvent('test_reset');
  }
}

export const kawasakiStore = new KawasakiStore();

