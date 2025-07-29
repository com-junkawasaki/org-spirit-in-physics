import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';
import { createSessionDirectory, writeFile, DirectoryHandleWithPermissions } from '@/lib/file-system';

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

    // File System Handles
    rootDirectoryHandle: DirectoryHandleWithPermissions | null;
    sessionDirectoryHandle: FileSystemDirectoryHandle | null;

    // Actions
    setRootDirectoryHandle: (handle: DirectoryHandleWithPermissions) => void;
    startSession: (numberOfWords: number) => Promise<void>;
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
            rootDirectoryHandle: null,
            sessionDirectoryHandle: null,

            // Actions Implementation
            setRootDirectoryHandle: (handle) => set({ rootDirectoryHandle: handle }),

            startSession: async (numberOfWords) => {
                const state = get();
                if (state.testStatus === 'idle' || state.testStatus === 'session-1-complete') {
                    if (!state.rootDirectoryHandle) {
                        console.error("Root directory handle is not set.");
                        return;
                    }
                    if (state.testStatus === 'idle') {
                        // Create a new session directory for the first session
                        const sessionHandle = await createSessionDirectory(state.rootDirectoryHandle);
                        if (!sessionHandle) {
                            console.error("Failed to create session directory.");
                            return;
                        }
                        set({ sessionDirectoryHandle: sessionHandle });
                    }

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
                if ((state.testStatus !== 'session-1-running' && state.testStatus !== 'session-2-running') || !state.sessionDirectoryHandle) return;

                const fileName = `session-${state.currentSession}-word-${state.currentWordIndex + 1}-${state.stimulusWords[state.currentWordIndex].replace(/\s+/g, '-')}.webm`;
                
                // Write audio blob to file asynchronously
                writeFile(state.sessionDirectoryHandle, fileName, audioBlob);

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
                // ... (logic is mostly unchanged, but we now save metadata to a file)
                const metadata = {
                    assessmentId: state.assessmentId,
                    userId: 'user-placeholder',
                    timestamp: new Date().toISOString(),
                    session: state.currentSession,
                    responses: state.userResponses.filter(r => r.session === state.currentSession)
                };

                if (state.sessionDirectoryHandle) {
                    writeFile(state.sessionDirectoryHandle, `session-${state.currentSession}-metadata.json`, JSON.stringify(metadata, null, 2));
                }


                if (state.currentSession === 1) {
                    set({ testStatus: 'session-1-complete', currentWordIndex: -1 });
                } else {
                    // ... (final completion logic)
                    set(prev => ({
                        testStatus: 'completed',
                        // ... (completedAssessments update logic)
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
                    // Do not reset directory handles, user might want to use the same root.
                    sessionDirectoryHandle: null,
                })
            }
        }),
        {
            name: "kawasaki-model-storage-v3",
            // Persisting FileSystemDirectoryHandle is not possible directly.
            // We will handle this in the component by asking the user to select the directory each time.
            // Therefore, we exclude the handles from the persisted state.
            partialize: (state) =>
                Object.fromEntries(
                  Object.entries(state).filter(
                    ([key]) => !['rootDirectoryHandle', 'sessionDirectoryHandle'].includes(key)
                  )
                ),
        },
    ),
);
