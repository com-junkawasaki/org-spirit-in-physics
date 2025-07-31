export type Word = {
  word: string;
  key: string;
};

// 単一の単語応答の型
export type WordResponse = {
  stimulusWord: Word;
  responseWord: string;
  reactionTimeMs: number;
  audioBlob?: Blob;
  isDelayed?: boolean;
};

// テスト結果の型
export interface TestResult {
  totalWords: number;
  averageReactionTimeMs: number;
  responses: WordResponse[];
  completedAt?: Date;
}

/**
 * @fileoverview Defines the core types and interfaces for the Jung Voice Test application.
 * This includes the main state shape for the Zustand store and props for the main components.
 */

// --- Component Props ---

export interface JungVoiceTestProps {
    numberOfWords?: number;
    stimulusWords?: Word[]; // Changed from string[]
    onTestComplete?: (results: TestResult) => void;
    voiceName?: string;
    speechRecognitionLang?: string;
    className?: string;
    onComplete?: () => void;
}

// --- Zustand Store ---

export type MediaStatus = 'idle' | 'recording_session' | 'recording_response' | 'processing';

export interface KawasakiStoreState {
  testStatus: 'idle' | 'preflight' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
  deviceStatus: 'idle' | 'pending' | 'success' | 'error';
  stream: MediaStream | null;
  error: string | null;
  stimulusWords: Word[]; // Changed from string[]
  currentSession: 1 | 2;
  currentWordIndex: number;
  wordResponses: WordResponse[];
  mediaStatus: MediaStatus;
  events: { timestamp: number; type: string; payload?: object }[];
  sessionVideoUrl: string | null;
  participantId: string | null;
}

export interface KawasakiStoreActions {
  startSession: (numberOfWords: number) => void;
  completeSession: () => void;
  advanceToNextWord: () => void;
  recordWordResponse: (response: { responseWord: string; reactionTimeMs: number; audioBlob: Blob }) => void;
  resetTest: () => void;
  setMediaStatus: (status: MediaStatus) => void;
  setDeviceStatus: (status: 'idle' | 'pending' | 'success' | 'error') => void;
  setStream: (stream: MediaStream | null) => void;
  setError: (error: string | null) => void;
  logEvent: (type: string, payload?: object) => void;
  startPreflight: () => void;
  saveSessionVideo: (session: 1 | 2, blob: Blob) => void;
  initializeParticipant: () => void;
}

export type KawasakiStore = KawasakiStoreState & KawasakiStoreActions;

// メッセージの型
export interface Message {
  text: string;
  role: 'user' | 'assistant';
}

// AI ガイドメッセージの型
export interface GuideMessage {
  introduction: string;
  nextWord: string;
  testComplete: string;
  delayed: string;
  normal: string;
} 