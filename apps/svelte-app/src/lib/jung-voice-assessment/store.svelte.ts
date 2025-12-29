import { participantClient, storageClient } from "$lib/connect";
import type { StimulusWord } from "@/generated/proto/participant/v1/participant_pb";
import * as m from "$lib/paraglide/messages.js";
import { untrack } from "svelte";

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
  participantEmail = $state<string | null>(null);
  hasCheckedExisting = $state(false);
  demographics = $state({
    ageGroup: "",
    gender: "",
    ethnicity: "",
    incomeRange: "",
    medicalHistory: [] as string[],
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('participantId');
      const savedEmail = localStorage.getItem('participantEmail');
      if (savedId) this.participantId = savedId;
      if (savedEmail) this.participantEmail = savedEmail;
    }
  }

  initializeParticipant(id?: string, demographics?: any) {
    if (id) {
      this.participantId = id;
    } else if (!this.participantId) {
      // Use crypto.randomUUID() only as a fallback
      this.participantId = crypto.randomUUID();
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('participantId', this.participantId);
    }
    
    if (demographics) {
      this.demographics = { ...this.demographics, ...demographics };
    }
    this.logEvent('participant_initialized', { 
      participantId: this.participantId,
      demographics: this.demographics 
    });
  }

  syncWithClerk(user: any) {
    if (user) {
      this.participantId = user.id;
      this.participantEmail = user.primaryEmailAddress?.emailAddress || null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('participantId', this.participantId);
        if (this.participantEmail) {
          localStorage.setItem('participantEmail', this.participantEmail);
        }
      }
    }
  }

  async checkExistingParticipant(email: string) {
    try {
      const response = await participantClient.getParticipantByEmail({ email });
      if (response.participant) {
        const p = response.participant;
        this.participantId = p.id;
        this.participantEmail = email;
        if (typeof window !== 'undefined') {
          localStorage.setItem('participantId', p.id);
          localStorage.setItem('participantEmail', email);
        }
        this.demographics = {
          ageGroup: p.ageGroup || "",
          gender: p.gender || "",
          ethnicity: p.ethnicity || "",
          incomeRange: p.incomeRange || "",
          medicalHistory: p.medicalHistory || [],
        };
        this.logEvent('participant_restored_from_server', { 
          participantId: this.participantId,
          email
        });

        // Ensure Temporal Workflow is running
        await this.startAssessmentWorkflow();
        return true;
      }
    } catch (e) {
      // Not found is expected for new users
      console.log("No existing participant found for email:", email);
    }
    return false;
  }

  async createParticipantOnServer(email: string, agreements: any) {
    if (!this.participantId) return;

    try {
      await participantClient.createParticipant({
        id: this.participantId,
        email,
        agreements: agreements as any, // protobuf Struct will handle this if correctly formatted
        agreedAt: { seconds: BigInt(Math.floor(Date.now() / 1000)), nanos: 0 },
        ageGroup: this.demographics.ageGroup,
        ethnicity: this.demographics.ethnicity,
        incomeRange: this.demographics.incomeRange,
        medicalHistory: this.demographics.medicalHistory,
        gender: this.demographics.gender,
        isPublic: true
      });
      this.participantEmail = email;
      if (typeof window !== 'undefined') {
        localStorage.setItem('participantEmail', email);
      }
      this.logEvent('participant_created_on_server');
      this.error = null;

      // Start Temporal Assessment Workflow
      await this.startAssessmentWorkflow();
    } catch (e: any) {
      console.error("Failed to create participant on server:", e);
      this.error = m.participant_creation_failed({ error: e.message || m.unknown_error() });
      this.logEvent('participant_creation_failed', { error: String(e) });
      throw e;
    }
  }

  async startAssessmentWorkflow() {
    if (!this.participantId || !this.participantEmail) return;
    try {
      await participantClient.startAssessment({
        participantId: this.participantId,
        email: this.participantEmail,
        ageGroup: this.demographics.ageGroup,
        gender: this.demographics.gender,
        ethnicity: this.demographics.ethnicity,
        incomeRange: this.demographics.incomeRange,
        medicalHistory: this.demographics.medicalHistory
      });
      this.logEvent('assessment_workflow_started');
    } catch (e) {
      console.error("Failed to start assessment workflow:", e);
    }
  }

  async loadStimulusWords() {
    try {
      const response = await participantClient.getStimulusWords({});
      this.stimulusWords = response.words;
      this.logEvent('stimulus_words_loaded', { count: this.stimulusWords.length });
      this.error = null;
    } catch (e: any) {
      this.error = m.stimulus_words_load_failed({ error: e.message || m.network_error() });
      console.error(e);
    }
  }

  clearError() {
    this.error = null;
  }

  startPreflight() {
    this.testStatus = 'preflight';
    this.deviceStatus = 'pending';
    this.logEvent('preflight_started');
  }

  logEvent(type: string, payload: any = {}) {
    untrack(() => {
      this.events.push({ timestamp: Date.now(), type, payload });
    });
  }

  startSession(numberOfWords: number) {
    const sessionNumber = this.currentSession;
    // Shuffle and slice words
    const shuffled = [...this.stimulusWords].sort(() => 0.5 - Math.random()).slice(0, numberOfWords);
    this.stimulusWords = shuffled;
    
    this.testStatus = sessionNumber === 1 ? 'session-1-running' : 'session-2-running';
    this.currentWordIndex = 0;
    this.logEvent('session_started', { session: sessionNumber, numberOfWords });

    // Signal Temporal
    if (this.participantId) {
      participantClient.signalStartSession({
        participantId: this.participantId,
        sessionNumber
      }).catch(e => console.error("Failed to signal start session:", e));
    }
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

      // Signal Temporal Completion
      if (this.participantId) {
        participantClient.completeAssessment({ participantId: this.participantId })
          .catch(e => console.error("Failed to signal completion:", e));
      }
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

    // Signal Temporal
    if (this.participantId) {
      participantClient.signalWordResponse({
        participantId: this.participantId,
        stimulusWordId: stimulusWord.id,
        responseWord: response.responseWord,
        reactionTimeMs: response.reactionTimeMs
      }).catch(e => console.error("Failed to signal word response:", e));
    }

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

      // Signal Temporal
      await participantClient.signalArtifact({
        participantId: this.participantId,
        artifactType: type,
        url: response.publicUrl,
        session: sessionIndex
      });

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

