// Type definitions for Jung Voice Assessment (Svelte version)

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

export type TestStatus =
	| 'idle'
	| 'preflight'
	| 'session-1-running'
	| 'session-1-complete'
	| 'session-2-running'
	| 'completed';

export type DeviceStatus = 'idle' | 'pending' | 'success' | 'error';

export interface KawasakiStoreState {
	testStatus: TestStatus;
	deviceStatus: DeviceStatus;
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

export interface JungVoiceTestProps {
	numberOfWords?: number;
	stimulusWords?: Word[];
	onTestComplete?: (results: TestResult) => void;
	voiceName?: string;
	speechRecognitionLang?: string;
	className?: string;
	onComplete?: () => void;
	graphQLCallbacks?: GraphQLCallbacks;
}
