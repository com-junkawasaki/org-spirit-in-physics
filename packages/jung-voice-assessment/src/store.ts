import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { ApolloClient } from '@apollo/client';
import type { 
  Word, 
  WordResponse, 
  TestResult, 
  MediaStatus, 
  KawasakiStoreState, 
  KawasakiStoreActions, 
  KawasakiStore,
  GraphQLMutations,
  GraphQLCallbacks
} from './types';

// Re-export Word for backward compatibility
export type { Word };

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
  participantId: null,
  graphQLClient: null,
  graphQLMutations: null,
  graphQLCallbacks: null,
};

export const useKawasakiStore = create<KawasakiStore>()(
  immer((set, get) => ({
    ...initialState,
    graphQLMutations: null,
    graphQLCallbacks: null,

    setStimulusWords: (words) => set({ stimulusWords: words }),
    setGraphQLClient: (client) => set({ graphQLClient: client }),
    setGraphQLMutations: (mutations) => set({ graphQLMutations: mutations }),
    setGraphQLCallbacks: (callbacks) => set({ graphQLCallbacks: callbacks }),

    initializeParticipant: () => {
        const participantId = uuidv4();
        set({ participantId });
        get().logEvent('participant_initialized', { participantId });
    },
    
    startPreflight: () => {
        set({ testStatus: 'preflight', deviceStatus: 'pending' });
        get().logEvent('preflight_started');
    },

    setDeviceStatus: (status) => set({ deviceStatus: status }),
    setStream: (stream) => set({ stream }),
    setError: (error) => set({ error }),
    setMediaStatus: (status) => set({ mediaStatus: status }),

    logEvent: (type, payload = {}) => {
        set(state => {
            state.events.push({ timestamp: Date.now(), type, payload });
        });
    },

    startSession: (numberOfWords) => {
        const sessionNumber = get().currentSession === 1 ? 1 : 2;
        const { stimulusWords } = get();
        const shuffledWords = [...stimulusWords].sort(() => 0.5 - Math.random()).slice(0, numberOfWords);

        set(state => {
            state.testStatus = sessionNumber === 1 ? 'session-1-running' : 'session-2-running';
            state.stimulusWords = shuffledWords;
            state.currentWordIndex = 0;
            state.currentSession = sessionNumber === 1 ? 1 : 2;
        });
        get().logEvent('session_started', { session: get().currentSession, numberOfWords });
    },

    completeSession: () => {
        const { logEvent, currentSession } = get();
        console.log(`completeSession called for session: ${currentSession}`);
        if (currentSession === 1) {
            set({ testStatus: 'session-1-complete', currentWordIndex: -1, currentSession: 2 });
            logEvent('session_1_completed');
        } else {
            set({ testStatus: 'completed' });
            get().logEvent('session_2_completed');
            get().logEvent('test_completed');
        }
    },
    
    advanceToNextWord: () => {
        const { currentWordIndex, stimulusWords, completeSession, testStatus } = get();
        if (testStatus === 'completed') return;

        get().saveSessionData();

        if (currentWordIndex + 1 >= stimulusWords.length) {
            completeSession();
        } else {
            set(state => {
                state.currentWordIndex += 1;
            });
        }
    },

    recordWordResponse: ({ responseWord, reactionTimeMs, audioBlob }) => {
        const { currentWordIndex, stimulusWords, advanceToNextWord, logEvent } = get();
        const stimulusWord = stimulusWords[currentWordIndex];
        if (!stimulusWord) {
            get().setError('Stimulus word not found');
            return;
        }

        const response: WordResponse = {
            stimulusWord,
            responseWord,
            reactionTimeMs,
            audioBlob,
        };
        
        set(state => {
            state.wordResponses.push(response);
        });

        logEvent('word_response_recorded', {
            stimulus: stimulusWord.word,
            response: responseWord,
            reaction: reactionTimeMs,
        });
        
        get().saveSessionData();
        
        advanceToNextWord();
    },

    saveSessionData: async () => {
        const { participantId, events, wordResponses, currentSession, graphQLClient, graphQLMutations, graphQLCallbacks } = get();
        
        if (graphQLCallbacks?.onSaveSession) {
            try {
                const sessionStartedEvent = events.find((e: any) => e.type === 'session_started');
                const startTs = sessionStartedEvent?.timestamp || Date.now();
                const sessionIndex = currentSession || (sessionStartedEvent?.payload?.session as number | undefined) || 1;
                
                await graphQLCallbacks.onSaveSession({
                    participantId: participantId!,
                    sessionIndex,
                    startTs,
                    events,
                });
                
                get().logEvent('session_data_saved');
            } catch (error) {
                console.error('Error in saveSessionData:', error);
                get().setError('セッションデータの保存に失敗しました。');
            }
        } else if (graphQLClient && graphQLMutations?.createSession) {
            try {
                const sessionStartedEvent = events.find((e: any) => e.type === 'session_started');
                const startTs = sessionStartedEvent?.timestamp || Date.now();
                const sessionIndex = currentSession || (sessionStartedEvent?.payload?.session as number | undefined) || 1;
                
                const result = await graphQLClient.mutate({
                    mutation: graphQLMutations.createSession,
                    variables: {
                        input: {
                            participantId: participantId!,
                            sessionIndex: sessionIndex,
                            startTs: startTs,
                            events: events,
                        },
                    },
                });

                if (result.errors) {
                    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
                }

                get().logEvent('session_data_saved');
            } catch (error) {
                console.error('Error in saveSessionData:', error);
                get().setError('セッションデータの保存に失敗しました。');
            }
        }
    },

    resetTest: () => {
        set(initialState);
        get().logEvent('test_reset');
    },

    saveSessionVideo: async (session, blob) => {
        const { participantId, logEvent, setError, graphQLClient, graphQLMutations, graphQLCallbacks } = get();
        if (!participantId) {
            setError('Participant ID is not set, cannot save video.');
            return;
        }

        console.log(`Attempting to save session video for session ${session}`);

        try {
            // Convert blob to base64
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

            if (graphQLCallbacks?.onUploadArtifact) {
                const publicUrl = await graphQLCallbacks.onUploadArtifact({
                    participantId: participantId,
                    fileName: fileName,
                    fileData: base64Data,
                    contentType: 'video/webm',
                    artifactType: 'video',
                });
                set({ sessionVideoUrl: publicUrl });
                logEvent(`session_${session}_video_saved`, { url: publicUrl });
            } else if (graphQLClient && graphQLMutations?.uploadArtifact) {
                const result = await graphQLClient.mutate({
                    mutation: graphQLMutations.uploadArtifact,
                    variables: {
                        input: {
                            participantId: participantId,
                            fileName: fileName,
                            fileData: base64Data,
                            contentType: 'video/webm',
                            artifactType: 'video',
                        },
                    },
                });

                if (result.errors) {
                    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
                }

                const publicUrl = result.data?.uploadArtifact;
                if (!publicUrl) {
                    throw new Error('No URL returned from upload_artifact mutation');
                }

                set({ sessionVideoUrl: publicUrl });
                logEvent(`session_${session}_video_saved`, { url: publicUrl });
            }

        } catch (error) {
            console.error('Error saving session video:', error);
            setError('動画の保存に失敗しました。');
        }
    },
  }))
);

