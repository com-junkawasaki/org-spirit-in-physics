// Type definitions for Jung Voice Assessment

export type Word = {
  word: string;
  key: string;
};

export type WordResponse = {
  stimulusWord: Word;
  responseWord: string;
  reactionTimeMs: number;
  audioBlob?: Blob;
  isDelayed?: boolean;
};

export interface TestResult {
  totalWords: number;
  averageReactionTimeMs: number;
  responses: WordResponse[];
  completedAt?: Date;
}

export type MediaStatus = 'idle' | 'recording_session' | 'recording_response' | 'processing';

export interface KawasakiStoreState {
  testStatus: 'idle' | 'preflight' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
  deviceStatus: 'idle' | 'pending' | 'success' | 'error';
  stream: MediaStream | null;
  error: string | null;
  stimulusWords: Word[];
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
  saveSessionData: () => Promise<void>;
  resetTest: () => void;
  setMediaStatus: (status: MediaStatus) => void;
  setDeviceStatus: (status: 'idle' | 'pending' | 'success' | 'error') => void;
  setStream: (stream: MediaStream | null) => void;
  setError: (error: string | null) => void;
  logEvent: (type: string, payload?: object) => void;
  startPreflight: () => void;
  saveSessionVideo: (session: 1 | 2, blob: Blob) => void;
  initializeParticipant: () => void;
  setStimulusWords: (words: Word[]) => void;
}

export type KawasakiStore = KawasakiStoreState & KawasakiStoreActions;

export interface JungVoiceTestProps {
  numberOfWords?: number;
  stimulusWords?: Word[];
  onTestComplete?: (results: {
    totalWords: number;
    averageReactionTimeMs: number;
    responses: Array<{
      stimulusWord: Word;
      responseWord: string;
      reactionTimeMs: number;
      audioBlob?: Blob;
      isDelayed?: boolean;
    }>;
    completedAt?: Date;
  }) => void;
  voiceName?: string;
  speechRecognitionLang?: string;
  className?: string;
  onComplete?: () => void;
  // UI component injection
  Button?: React.ComponentType<{ onClick: () => void; size?: string; className?: string }>;
  Card?: React.ComponentType<{ className?: string; children?: React.ReactNode }>;
  CardHeader?: React.ComponentType<{ children?: React.ReactNode }>;
  CardTitle?: React.ComponentType<{ children?: React.ReactNode }>;
  CardContent?: React.ComponentType<{ className?: string; children?: React.ReactNode }>;
}

