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
        const currentSession = get().currentSession;
        if (currentSession === 1) {
            set({ testStatus: 'session-1-complete', currentWordIndex: -1, currentSession: 2 });
            get().logEvent('session_1_completed');
        } else {
            set({ testStatus: 'completed' });
            get().logEvent('session_2_completed');
            get().logEvent('test_completed');
        }
    },
    
    advanceToNextWord: () => {
        const { currentWordIndex, stimulusWords, completeSession } = get();
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

    resetTest: () => {
        set(initialState);
        get().logEvent('test_reset');
    },

    saveSessionVideo: (session, blob) => {
        // This is a placeholder for saving video.
        // In a real app, you'd upload this to a server.
        const url = URL.createObjectURL(blob);
        set({ sessionVideoUrl: url });
        get().logEvent(`session_${session}_video_saved`, { url });
    },
  }))
);
