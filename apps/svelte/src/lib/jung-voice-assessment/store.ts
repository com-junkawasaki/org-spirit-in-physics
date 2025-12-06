import { writable } from 'svelte/store';
import type { Word, WordResponse, KawasakiStoreState, TestStatus, DeviceStatus, MediaStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

const initialState: KawasakiStoreState = {
	testStatus: 'idle',
	deviceStatus: 'idle',
	stream: null,
	error: null,
	stimulusWords: [],
	currentSession: 1,
	currentWordIndex: -1,
	wordResponses: [],
	mediaStatus: 'idle',
	events: [],
	sessionVideoUrl: null,
	participantId: null
};

function createKawasakiStore() {
	const { subscribe, set, update } = writable<KawasakiStoreState>(initialState);

	return {
		subscribe,
		setStimulusWords: (words: Word[]) => {
			update((state) => ({ ...state, stimulusWords: words }));
		},
		initializeParticipant: () => {
			const participantId = uuidv4();
			update((state) => {
				const newEvents = [...state.events, { timestamp: Date.now(), type: 'participant_initialized', payload: { participantId } }];
				return { ...state, participantId, events: newEvents };
			});
		},
		startPreflight: () => {
			update((state) => {
				const newEvents = [...state.events, { timestamp: Date.now(), type: 'preflight_started' }];
				return { ...state, testStatus: 'preflight', deviceStatus: 'pending', events: newEvents };
			});
		},
		setDeviceStatus: (status: DeviceStatus) => {
			update((state) => ({ ...state, deviceStatus: status }));
		},
		setStream: (stream: MediaStream | null) => {
			update((state) => ({ ...state, stream }));
		},
		setError: (error: string | null) => {
			update((state) => ({ ...state, error }));
		},
		setMediaStatus: (status: MediaStatus) => {
			update((state) => ({ ...state, mediaStatus: status }));
		},
		logEvent: (type: string, payload: object = {}) => {
			update((state) => ({
				...state,
				events: [...state.events, { timestamp: Date.now(), type, payload }]
			}));
		},
		startSession: (numberOfWords: number) => {
			update((state) => {
				const sessionNumber = state.currentSession === 1 ? 1 : 2;
				const shuffledWords = [...state.stimulusWords]
					.sort(() => 0.5 - Math.random())
					.slice(0, numberOfWords);
				const newEvents = [
					...state.events,
					{ timestamp: Date.now(), type: 'session_started', payload: { session: sessionNumber, numberOfWords } }
				];
				return {
					...state,
					testStatus: sessionNumber === 1 ? 'session-1-running' : 'session-2-running',
					stimulusWords: shuffledWords,
					currentWordIndex: 0,
					currentSession: sessionNumber === 1 ? 1 : 2,
					events: newEvents
				};
			});
		},
		completeSession: () => {
			update((state) => {
				if (state.currentSession === 1) {
					const newEvents = [...state.events, { timestamp: Date.now(), type: 'session_1_completed' }];
					return {
						...state,
						testStatus: 'session-1-complete',
						currentWordIndex: -1,
						currentSession: 2,
						events: newEvents
					};
				} else {
					const newEvents = [
						...state.events,
						{ timestamp: Date.now(), type: 'session_2_completed' },
						{ timestamp: Date.now(), type: 'test_completed' }
					];
					return { ...state, testStatus: 'completed', events: newEvents };
				}
			});
		},
		advanceToNextWord: () => {
			update((state) => {
				if (state.testStatus === 'completed') return state;
				if (state.currentWordIndex + 1 >= state.stimulusWords.length) {
					// Will be handled by completeSession
					return state;
				}
				return { ...state, currentWordIndex: state.currentWordIndex + 1 };
			});
		},
		recordWordResponse: (response: { responseWord: string; reactionTimeMs: number; audioBlob?: Blob }) => {
			update((state) => {
				const stimulusWord = state.stimulusWords[state.currentWordIndex];
				if (!stimulusWord) {
					return { ...state, error: 'Stimulus word not found' };
				}
				const wordResponse: WordResponse = {
					stimulusWord,
					responseWord: response.responseWord,
					reactionTimeMs: response.reactionTimeMs,
					audioBlob: response.audioBlob
				};
				const newEvents = [
					...state.events,
					{
						timestamp: Date.now(),
						type: 'word_response_recorded',
						payload: {
							stimulus: stimulusWord.word,
							response: response.responseWord,
							reaction: response.reactionTimeMs
						}
					}
				];
				return {
					...state,
					wordResponses: [...state.wordResponses, wordResponse],
					events: newEvents
				};
			});
		},
		saveSessionData: async (callbacks?: { onSaveSession?: (data: any) => Promise<void> }) => {
			let state: KawasakiStoreState;
			subscribe((s) => {
				state = s;
			})();
			
			if (!state!.participantId) return;

			if (callbacks?.onSaveSession) {
				try {
					const sessionStartedEvent = state!.events.find((e) => e.type === 'session_started');
					const startTs = sessionStartedEvent?.timestamp || Date.now();
					const sessionIndex = state!.currentSession || (sessionStartedEvent?.payload?.session as number | undefined) || 1;

					await callbacks.onSaveSession({
						participantId: state!.participantId!,
						sessionIndex,
						startTs,
						events: state!.events
					});

					update((s) => ({
						...s,
						events: [...s.events, { timestamp: Date.now(), type: 'session_data_saved' }]
					}));
				} catch (error) {
					console.error('Error in saveSessionData:', error);
					update((s) => ({ ...s, error: 'セッションデータの保存に失敗しました。' }));
				}
			}
		},
		resetTest: () => {
			set(initialState);
			update((state) => ({
				...state,
				events: [...state.events, { timestamp: Date.now(), type: 'test_reset' }]
			}));
		},
		saveSessionVideo: async (session: 1 | 2, blob: Blob, callbacks?: { onUploadArtifact?: (data: any) => Promise<string> }) => {
			let state: KawasakiStoreState;
			subscribe((s) => {
				state = s;
			})();

			if (!state!.participantId) {
				update((s) => ({ ...s, error: 'Participant ID is not set, cannot save video.' }));
				return;
			}

			try {
				const reader = new FileReader();
				const base64Promise = new Promise<string>((resolve, reject) => {
					reader.onloadend = () => {
						const base64String = reader.result as string;
						const base64Data = base64String.split(',')[1] || base64String;
						resolve(base64Data);
					};
					reader.onerror = reject;
				});
				reader.readAsDataURL(blob);
				const base64Data = await base64Promise;

				const fileName = `session-${session}-video.webm`;

				if (callbacks?.onUploadArtifact) {
					const publicUrl = await callbacks.onUploadArtifact({
						participantId: state!.participantId,
						fileName: fileName,
						fileData: base64Data,
						contentType: 'video/webm',
						artifactType: 'video'
					});
					update((s) => ({
						...state!,
						sessionVideoUrl: publicUrl,
						events: [
							...s.events,
							{ timestamp: Date.now(), type: `session_${session}_video_saved`, payload: { url: publicUrl } }
						]
					}));
				}
			} catch (error) {
				console.error('Error saving session video:', error);
				update((s) => ({ ...s, error: '動画の保存に失敗しました。' }));
			}
		}
	};
}

export const kawasakiStore = createKawasakiStore();
