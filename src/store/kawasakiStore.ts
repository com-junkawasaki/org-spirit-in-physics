import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';

// Types for recorded data and test results
interface RecordedResponse {
    stimulusWord: string;
    session: 1 | 2;
    // audioBlob is no longer stored in zustand, it will be written to disk directly.
    fileName: string;
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
                if ((state.testStatus !== 'session-1-running' && state.testStatus !== 'session-2-running') || !state.assessmentId) return;

                const fileName = `session-${state.currentSession}-word-${state.currentWordIndex + 1}-${state.stimulusWords[state.currentWordIndex].replace(/\s+/g, '-')}.webm`;
                
                // Save file via API route
                const formData = new FormData();
                formData.append('file', audioBlob);
                formData.append('sessionId', state.assessmentId);
                formData.append('fileName', fileName);

                fetch('/api/save-artifact', {
                    method: 'POST',
                    body: formData,
                }).catch(error => console.error('Failed to save artifact:', error));


                const newResponse: RecordedResponse = {
                    stimulusWord: state.stimulusWords[state.currentWordIndex],
                    session: state.currentSession,
                    fileName: fileName,
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
                const metadata = {
                    assessmentId: state.assessmentId,
                    userId: 'user-placeholder',
                    timestamp: new Date().toISOString(),
                    session: state.currentSession,
                    responses: state.userResponses.filter(r => r.session === state.currentSession)
                };
                
                // Save metadata file via API route
                const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('file', metadataBlob);
                formData.append('sessionId', state.assessmentId!);
                formData.append('fileName', `session-${state.currentSession}-metadata.json`);

                fetch('/api/save-artifact', {
                    method: 'POST',
                    body: formData,
                }).catch(error => console.error('Failed to save metadata:', error));


                if (state.currentSession === 1) {
                    set({ testStatus: 'session-1-complete', currentWordIndex: -1 });
                } else {
                    // ... (final completion logic)
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
            name: "kawasaki-model-storage-v4",
            // Blobs are not stored in zustand anymore, so no special serialization needed.
        },
    ),
);
