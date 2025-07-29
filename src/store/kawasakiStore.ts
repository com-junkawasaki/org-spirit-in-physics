import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';

// Types for recorded data and test results
interface RecordedResponse {
    stimulusWord: string;
    session: 1 | 2;
    fileName: string;
}

interface SessionResult {
    sessionId: 1 | 2;
    responses: RecordedResponse[];
}

interface EventLog {
    timestamp: string;
    event: string;
    details: Record<string, any>;
}

interface FullTestResult {
    userId: string;
    assessmentId: string;
    sessionResults: SessionResult[];
    eventLog: EventLog[];
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
    eventLog: EventLog[];
    assessmentId: string | null;

    // Actions
    startSession: (numberOfWords: number) => void;
    recordResponse: (audioBlob: Blob) => void;
    logEvent: (event: string, details?: Record<string, any>) => void;
    saveSessionVideo: (session: 1 | 2, videoBlob: Blob) => void;
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
            eventLog: [],
            assessmentId: null,

            // Actions Implementation
            logEvent: (event, details = {}) => {
                const newLog: EventLog = {
                    timestamp: new Date().toISOString(),
                    event,
                    details,
                };
                set(state => ({ eventLog: [...state.eventLog, newLog] }));
            },

            startSession: (numberOfWords) => {
                const state = get();
                if (state.testStatus === 'idle' || state.testStatus === 'session-1-complete') {
                    const sessionNumber = state.testStatus === 'idle' ? 1 : 2;
                    get().logEvent('session_start', { session: sessionNumber });
                    
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

                const word = state.stimulusWords[state.currentWordIndex];
                const fileName = `session-${state.currentSession}-word-${state.currentWordIndex + 1}-${word.replace(/\s+/g, '-')}.webm`;
                
                get().logEvent('response_recorded', { session: state.currentSession, word: word, fileName: fileName });
                
                // Save audio file via API route
                const formData = new FormData();
                formData.append('file', audioBlob);
                formData.append('sessionId', state.assessmentId);
                formData.append('fileName', fileName);

                fetch('/api/save-artifact', {
                    method: 'POST',
                    body: formData,
                }).catch(error => console.error('Failed to save artifact:', error));


                const newResponse: RecordedResponse = {
                    stimulusWord: word,
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

            saveSessionVideo: (session, videoBlob) => {
                const state = get();
                if (!state.assessmentId) return;

                const fileName = `session-${session}-video-recording.webm`;
                get().logEvent('session_video_saved', { session: session, fileName: fileName });

                const formData = new FormData();
                formData.append('file', videoBlob);
                formData.append('sessionId', state.assessmentId);
                formData.append('fileName', fileName);

                fetch('/api/save-artifact', {
                    method: 'POST',
                    body: formData,
                }).catch(error => console.error('Failed to save session video:', error));
            },

            completeSession: () => {
                const state = get();
                get().logEvent('session_complete', { session: state.currentSession });
                const metadata = {
                    assessmentId: state.assessmentId,
                    userId: 'user-placeholder',
                    timestamp: new Date().toISOString(),
                    session: state.currentSession,
                    responses: state.userResponses.filter(r => r.session === state.currentSession),
                    fullLog: state.eventLog, // Include full log in session metadata
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
                    const finalResult: FullTestResult = {
                        userId: 'user-placeholder',
                        assessmentId: state.assessmentId!,
                        sessionResults: [
                            { sessionId: 1, responses: state.userResponses.filter(r => r.session === 1) },
                            { sessionId: 2, responses: state.userResponses.filter(r => r.session === 2) }
                        ],
                        eventLog: state.eventLog,
                        timestamp: new Date().toISOString(),
                    };
                     set(prev => ({
                        testStatus: 'completed',
                        completedAssessments: [...prev.completedAssessments, finalResult],
                    }));
                }
            },
            
            resetTest: () => {
                get().logEvent('test_reset');
                set({
                    testStatus: 'idle',
                    currentSession: 1,
                    currentWordIndex: -1,
                    stimulusWords: [],
                    userResponses: [],
                    assessmentId: null,
                    eventLog: [],
                })
            }
        }),
        {
            name: "kawasaki-model-storage-v5",
        },
    ),
);
