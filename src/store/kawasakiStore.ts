import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TestResults } from "@/components/jung-voice-assessment/types";
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import { v4 as uuidv4 } from 'uuid';

interface VoiceAssessmentData {
    userId: string;
    assessmentId: string;
    results: TestResults;
    timestamp: string;
}

// WordResponseの型を定義
interface WordResponse {
    stimulusWord: string;
    responseWord: string;
    reactionTimeMs: number;
    isDelayed: boolean;
}


interface KawasakiState {
    voiceAssessments: VoiceAssessmentData[];
    updateVoiceAssessment: (data: VoiceAssessmentData) => void;
    
    // Voice Test State
    testStatus: 'idle' | 'running' | 'completed';
    currentWordIndex: number;
    stimulusWords: string[];
    userResponses: WordResponse[];
    startTime: number;
    assessmentId: string | null;

    // Voice Test Actions
    startTest: (numberOfWords: number) => void;
    recordResponse: (responseWord: string) => void;
    completeTest: () => void;
    resetTest: () => void;
}

export const useKawasakiStore = create<KawasakiState>()(
    persist(
        (set, get) => ({
            voiceAssessments: [],

            updateVoiceAssessment: (data) =>
                set((state) => {
                    const existingIndex = state.voiceAssessments.findIndex(
                        (assessment) => assessment.assessmentId === data.assessmentId,
                    );

                    if (existingIndex >= 0) {
                        const updatedAssessments = [...state.voiceAssessments];
                        updatedAssessments[existingIndex] = data;
                        return { voiceAssessments: updatedAssessments };
                    } else {
                        return {
                            voiceAssessments: [...state.voiceAssessments, data],
                        };
                    }
                }),

            // Voice Test State Implementation
            testStatus: 'idle',
            currentWordIndex: -1,
            stimulusWords: [],
            userResponses: [],
            startTime: 0,
            assessmentId: null,

            // Voice Test Actions Implementation
            startTest: (numberOfWords) => {
                const shuffled = [...JUNG_STIMULUS_WORDS].sort(() => Math.random() - 0.5);
                const words = shuffled.slice(0, numberOfWords);
                set({
                    testStatus: 'running',
                    stimulusWords: words,
                    currentWordIndex: 0,
                    userResponses: [],
                    assessmentId: uuidv4(),
                    startTime: Date.now(), // 最初の単語の開始時間
                });
            },

            recordResponse: (responseWord) => {
                const state = get();
                if (state.testStatus !== 'running') return;
                
                const reactionTimeMs = Date.now() - state.startTime;
                const newResponse: WordResponse = {
                    stimulusWord: state.stimulusWords[state.currentWordIndex],
                    responseWord: responseWord,
                    reactionTimeMs,
                    isDelayed: reactionTimeMs > 2000,
                };
                
                const nextIndex = state.currentWordIndex + 1;
                const updatedResponses = [...state.userResponses, newResponse];
                
                if (nextIndex >= state.stimulusWords.length) {
                    set({ userResponses: updatedResponses });
                    get().completeTest();
                } else {
                    set({
                        userResponses: updatedResponses,
                        currentWordIndex: nextIndex,
                        startTime: Date.now(), // 次の単語の開始時間
                    });
                }
            },

            completeTest: () => {
                const state = get();
                if (state.testStatus !== 'running' || !state.assessmentId) return;

                const totalReactionTime = state.userResponses.reduce((acc, res) => acc + res.reactionTimeMs, 0);
                const avgReactionTime = state.userResponses.length > 0 ? totalReactionTime / state.userResponses.length : 0;

                const results: TestResults = {
                    responses: state.userResponses,
                    averageReactionTimeMs: avgReactionTime,
                    delayedResponseCount: state.userResponses.filter(res => res.isDelayed).length,
                    completedAt: new Date().toISOString()
                };

                const newAssessment: VoiceAssessmentData = {
                    userId: 'user-placeholder', // Replace with actual user ID later
                    assessmentId: state.assessmentId,
                    results,
                    timestamp: new Date().toISOString(),
                };

                set(prevState => ({
                    testStatus: 'completed',
                    voiceAssessments: [...prevState.voiceAssessments, newAssessment],
                }));
            },
            
            resetTest: () => {
                set({
                    testStatus: 'idle',
                    currentWordIndex: -1,
                    stimulusWords: [],
                    userResponses: [],
                    assessmentId: null,
                    startTime: 0
                })
            }
        }),
        {
            name: "kawasaki-model-storage",
        },
    ),
);
