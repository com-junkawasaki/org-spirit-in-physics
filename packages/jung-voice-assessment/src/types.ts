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
  graphQLClient: any | null; // ApolloClient type from @apollo/client
  graphQLMutations: GraphQLMutations | null;
  graphQLCallbacks: GraphQLCallbacks | null;
}

export interface GraphQLMutations {
  createSession: any; // DocumentNode
  uploadArtifact: any; // DocumentNode
}

export interface GraphQLCallbacks {
  onSaveSession?: (data: {
    participantId: string;
    sessionIndex: number;
    startTs: number;
    events: Array<{ timestamp: number; type: string; payload?: object }>;
  }) => Promise<void>;
  onUploadArtifact?: (data: {
    participantId: string;
    fileName: string;
    fileData: string;
    contentType: string;
    artifactType: string;
  }) => Promise<string>;
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
  setGraphQLClient: (client: any | null) => void;
  setGraphQLMutations: (mutations: GraphQLMutations | null) => void;
  setGraphQLCallbacks: (callbacks: GraphQLCallbacks | null) => void;
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
  // GraphQL client injection
  apolloClient?: any; // ApolloClient type from @apollo/client
  graphQLMutations?: {
    createSession: any; // DocumentNode
    uploadArtifact: any; // DocumentNode
  };
  graphQLCallbacks?: {
    onSaveSession?: (data: {
      participantId: string;
      sessionIndex: number;
      startTs: number;
      events: Array<{ timestamp: number; type: string; payload?: object }>;
    }) => Promise<void>;
    onUploadArtifact?: (data: {
      participantId: string;
      fileName: string;
      fileData: string;
      contentType: string;
      artifactType: string;
    }) => Promise<string>;
  };
  // UI component injection
  Button?: React.ComponentType<any>;
  Card?: React.ComponentType<any>;
  CardHeader?: React.ComponentType<any>;
  CardTitle?: React.ComponentType<any>;
  CardContent?: React.ComponentType<any>;
}

