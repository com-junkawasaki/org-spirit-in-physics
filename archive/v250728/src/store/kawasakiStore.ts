import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';
import type { TestResults as VoiceTestResults } from '@/components/jung-voice-assessment/types';

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
    voiceAssessments: VoiceTestResults[];

    // Real-time test state
    testStatus: 'idle' | 'preflight' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
    mediaStatus: 'idle' | 'recording_response';
    deviceStatus: 'idle' | 'pending' | 'success' | 'error';
    currentSession: 1 | 2;
    currentWordIndex: number;
    stimulusWords: string[];
    userResponses: RecordedResponse[];
    eventLog: EventLog[];
    assessmentId: string | null;
    stream: MediaStream | null;
    error: string | null;

    // Actions
    advanceToNextWord: () => void;
    startPreflight: () => void;
    setDeviceStatus: (status: KawasakiState['deviceStatus']) => void;
    startSession: (numberOfWords: number) => void;
    recordResponse: (audioBlob: Blob) => void;
    logEvent: (event: string, details?: Record<string, any>) => void;
    saveSessionVideo: (session: 1 | 2, videoBlob: Blob) => void;
    completeSession: () => void;
    resetTest: () => void;
    restoreSession: (logData: EventLog[], session: 1 | 2, assessmentId: string) => void;
    setMediaStatus: (status: KawasakiState['mediaStatus']) => void;
    updateVoiceAssessment: (assessment: VoiceTestResults) => void;
    setStream: (stream: MediaStream | null) => void;
    setError: (error: string | null) => void;
}

export const useKawasakiStore = create<KawasakiState>()(
    persist(
        (set, get) => ({
            // Default state
            completedAssessments: [],
            voiceAssessments: [],
            testStatus: 'idle',
            mediaStatus: 'idle',
            deviceStatus: 'idle',
            currentSession: 1,
            currentWordIndex: -1,
            stimulusWords: [],
            userResponses: [],
            eventLog: [],
            assessmentId: null,
            stream: null,
            error: null,

            // Actions Implementation
            advanceToNextWord: () => {
                set((state) => ({ currentWordIndex: state.currentWordIndex + 1 }));
            },

            startPreflight: () => {
                set({ testStatus: 'preflight', deviceStatus: 'pending' });
            },

            setDeviceStatus: (status) => set({ deviceStatus: status }),

            logEvent: (event, details = {}) => {
                const newLog: EventLog = {
                    timestamp: new Date().toISOString(),
                    event,
                    details,
                };
                const updatedLog = [...get().eventLog, newLog];
                set({ eventLog: updatedLog });

                // --- Live Log Saving ---
                const state = get();
                if (!state.assessmentId) return;

                const logBlob = new Blob([JSON.stringify(updatedLog, null, 2)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('file', logBlob);
                formData.append('sessionId', state.assessmentId);
                formData.append('fileName', `session-${state.currentSession}-log.json`);

                fetch('/api/save-artifact', {
                    method: 'POST',
                    body: formData,
                }).catch(error => console.error('Failed to save live log:', error));
                // --- End Live Log Saving ---
            },

            setMediaStatus: (status) => set({ mediaStatus: status }),

            startSession: (numberOfWords) => {
                const state = get();
                if (state.testStatus === 'preflight' || state.testStatus === 'session-1-complete') {
                    const sessionNumber = state.testStatus === 'preflight' ? 1 : 2;
                    const assessmentId = state.assessmentId || uuidv4();
                    
                    set({
                        testStatus: sessionNumber === 1 ? 'session-1-running' : 'session-2-running',
                        currentSession: sessionNumber,
                        stimulusWords: [...JUNG_STIMULUS_WORDS].sort(() => 0.5 - Math.random()).slice(0, numberOfWords),
                        currentWordIndex: 0,
                        assessmentId: assessmentId,
                        // Reset event log only for the very first session
                        eventLog: sessionNumber === 1 ? [] : state.eventLog, 
                    });
                    
                    get().logEvent('session_start', { session: sessionNumber });
                }
            },

            recordResponse: (audioBlob) => {
                // This will now be triggered AFTER the 6s recording, not used for the session video
                const state = get();
                if ((state.testStatus !== 'session-1-running' && state.testStatus !== 'session-2-running') || !state.assessmentId) return;
                
                const word = state.stimulusWords[state.currentWordIndex];
                const fileName = `word-audio-s${state.currentSession}-w${state.currentWordIndex + 1}-${word.replace(/\s+/g, '-')}.webm`;
                
                get().logEvent('word_response_audio_saved', { session: state.currentSession, word: word, fileName: fileName });

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
                // This is now only for the final video
                const state = get();
                if (!state.assessmentId) return;

                const fileName = `session-${session}-video-final.webm`;
                get().logEvent('final_video_saved', { session, fileName, size: videoBlob.size });
                
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
            
            restoreSession: (logData, session, assessmentId) => {
                const lastWordDisplayed = [...logData].reverse().find(log => log.event === 'word_displayed');
                const lastWordIndex = lastWordDisplayed ? lastWordDisplayed.details.wordIndex : -1;
                
                const stimulusWords = [...JUNG_STIMULUS_WORDS].sort(() => 0.5 - Math.random()).slice(0, 10); // Assuming 10 words for now
                
                set({
                    eventLog: logData,
                    assessmentId: assessmentId,
                    currentSession: session,
                    testStatus: session === 1 ? 'session-1-running' : 'session-2-running',
                    currentWordIndex: lastWordIndex + 1,
                    stimulusWords: stimulusWords // Note: stimulusWords will be different, a limitation for now.
                });
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
                    stream: null, // Reset stream
                    error: null,  // Reset error
                })
            },
            
            updateVoiceAssessment: (assessment) => {
                set((state) => ({
                    voiceAssessments: [...state.voiceAssessments, assessment]
                }))
            },

            setStream: (stream) => set({ stream }),
            setError: (error) => set({ error }),
        }),
        {
            name: "kawasaki-model-storage-v10", // Incremented version
            partialize: (state) => {
                // Exclude non-serializable 'stream' property from persisted state
                const { stream, ...rest } = state;
                return rest;
            },
        },
    ),
);
