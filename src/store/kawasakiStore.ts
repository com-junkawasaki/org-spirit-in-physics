import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';

// Types for recorded data and test results
interface RecordedResponse {
    stimulusWord: string;
    session: 1 | 2;
    audioBlob: Blob;
    // videoBlob?: Blob; // Future-proofing for video
}

interface SessionResult {
    sessionId: 1 | 2;
    responses: RecordedResponse[];
}

interface FullTestResult {
    userId: string;
    assessmentId: string;
    sessionResults: SessionResult[];
    timestamp: string;
}

// Zustand Store State and Actions
interface KawasakiState {
    // Final results storage
    completedAssessments: FullTestResult[];

    // Real-time test state
    testStatus: 'idle' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
    currentSession: 1 | 2;
    currentWordIndex: number;
    stimulusWords: string[];
    userResponses: RecordedResponse[];
    assessmentId: string | null;

    // Actions
    startSession: (numberOfWords: number) => void;
    recordResponse: (audioBlob: Blob) => void;
    completeSession: () => void;
    resetTest: () => void;
}

export const useKawasakiStore = create<KawasakiState>()(
    persist(
        (set, get) => ({
            // Default state
            completedAssessments: [],
            testStatus: 'idle',
            currentSession: 1,
            currentWordIndex: -1,
            stimulusWords: [],
            userResponses: [],
            assessmentId: null,

            // Actions Implementation
            startSession: (numberOfWords) => {
                const state = get();
                if (state.testStatus === 'idle' || state.testStatus === 'session-1-complete') {
                    const sessionNumber = state.testStatus === 'idle' ? 1 : 2;
                    const shuffled = [...JUNG_STIMULUS_WORDS].sort(() => Math.random() - 0.5);
                    const words = shuffled.slice(0, numberOfWords);
                    
                    set({
                        testStatus: sessionNumber === 1 ? 'session-1-running' : 'session-2-running',
                        currentSession: sessionNumber,
                        stimulusWords: words,
                        currentWordIndex: 0,
                        assessmentId: state.assessmentId || uuidv4(),
                    });
                }
            },

            recordResponse: (audioBlob) => {
                const state = get();
                if (state.testStatus !== 'session-1-running' && state.testStatus !== 'session-2-running') return;

                const newResponse: RecordedResponse = {
                    stimulusWord: state.stimulusWords[state.currentWordIndex],
                    session: state.currentSession,
                    audioBlob,
                };
                
                const nextIndex = state.currentWordIndex + 1;
                const updatedResponses = [...state.userResponses, newResponse];
                
                set({ userResponses: updatedResponses });

                if (nextIndex >= state.stimulusWords.length) {
                    get().completeSession();
                } else {
                    set({ currentWordIndex: nextIndex });
                }
            },

            completeSession: () => {
                const state = get();
                if (state.currentSession === 1) {
                    set({ testStatus: 'session-1-complete', currentWordIndex: -1 });
                } else {
                    // Final completion
                    const finalResult: FullTestResult = {
                        userId: 'user-placeholder', // This should be set properly
                        assessmentId: state.assessmentId!,
                        sessionResults: [
                            { sessionId: 1, responses: state.userResponses.filter(r => r.session === 1) },
                            { sessionId: 2, responses: state.userResponses.filter(r => r.session === 2) }
                        ],
                        timestamp: new Date().toISOString(),
                    };
                    set(prev => ({
                        testStatus: 'completed',
                        completedAssessments: [...prev.completedAssessments, finalResult],
                    }));
                }
            },
            
            resetTest: () => {
                set({
                    testStatus: 'idle',
                    currentSession: 1,
                    currentWordIndex: -1,
                    stimulusWords: [],
                    userResponses: [],
                    assessmentId: null,
                })
            }
        }),
        {
            name: "kawasaki-model-storage-v2", // Renamed to avoid conflicts with old structure
            // Note: Storing Blobs in localStorage via persist middleware can be tricky.
            // This might need a custom storage implementation if it causes issues.
        },
    ),
);
