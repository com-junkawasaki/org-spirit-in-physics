// Type definitions for Jung Voice Assessment

export type Word = {
  word: string;
  key: string;
};

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

