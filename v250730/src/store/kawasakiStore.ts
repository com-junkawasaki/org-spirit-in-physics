import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Word, KawasakiStore, KawasakiStoreState, WordResponse } from '@/components/jung-voice-assessment/types';
import { JUNG_STIMULUS_WORDS } from '@/components/jung-voice-assessment/constants';

const JUNG_WORDS: Word[] = Object.entries(JUNG_STIMULUS_WORDS).map(
  ([key, value]) => ({
    word: value.japanese,
    key: key,
  })
);

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
};

export const useKawasakiStore = create<KawasakiStore>()(
  immer((set, get) => ({
    ...initialState,

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
        // JUNG_WORDSを直接変更しないように、コピーを作成してからシャッフルする
        const shuffledWords = [...JUNG_WORDS].sort(() => 0.5 - Math.random()).slice(0, numberOfWords);

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
        console.log(`completeSession called for session: ${currentSession}`); // デバッグ用ログ
        if (currentSession === 1) {
            set({ testStatus: 'session-1-complete', currentWordIndex: -1, currentSession: 2 });
            logEvent('session_1_completed');
        } else {
            set({ testStatus: 'completed' });
            get().logEvent('session_2_completed');
            get().logEvent('test_completed');
            // Save all data at the very end
            get().saveSessionData();
        }
    },
    
    advanceToNextWord: () => {
        const { currentWordIndex, stimulusWords, completeSession, testStatus } = get();
        if (testStatus === 'completed') return;

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
            reactionTime: reactionTimeMs,
        });
        
        advanceToNextWord();
    },

    saveSessionData: async () => {
        const { participantId, events, wordResponses } = get();
        const payload = {
            type: 'session-data' as const,
            data: {
                participantId,
                events,
                wordResponses: wordResponses.map(r => ({
                    ...r,
                    audioBlob: undefined, // remove blob before serialization
                })),
            }
        };
        console.log('Attempting to save session data:', payload); // デバッグ用ログ
        try {
            const response = await fetch('/api/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error('Failed to save session data');
            }
            get().logEvent('session_data_saved');
        } catch (error) {
            console.error('Error in saveSessionData:', error);
            get().setError('セッションデータの保存に失敗しました。');
        }
    },

    resetTest: () => {
        set(initialState);
        get().logEvent('test_reset');
    },

    saveSessionVideo: async (session, blob) => {
        const { participantId, logEvent, setError } = get();
        if (!participantId) {
            setError('Participant ID is not set, cannot save video.');
            return;
        }

        const formData = new FormData();
        formData.append('file', blob, `session-${session}.webm`);
        formData.append('sessionId', participantId);
        formData.append('fileName', `session-${session}-video.webm`);

        try {
            const response = await fetch('/api/save-artifact', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save session video: ${errorText}`);
            }
            const url = `/artifacts_cache/${participantId}/session-${session}-video.webm`;
            set({ sessionVideoUrl: url });
            logEvent(`session_${session}_video_saved`, { url });

        } catch (error) {
            console.error(error);
            setError('動画の保存に失敗しました。');
        }
    },
  }))
);
