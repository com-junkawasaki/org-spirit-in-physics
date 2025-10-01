// Merkle DAG: 分析データ同期ワークフロー
// KuzuからDuckDBへのデータ同期を管理

import { createMachine, assign, spawn } from 'xstate';
import type { AnalyticalDataPort } from '../../20_ports/analytical-data';

export interface AnalyticalDataSyncContext {
  port: AnalyticalDataPort;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  lastSyncTime: string | null;
  error: string | null;
  progress: {
    participantsProcessed: number;
    sessionsProcessed: number;
    analysesProcessed: number;
    totalParticipants: number;
    totalSessions: number;
    totalAnalyses: number;
  };
}

export type AnalyticalDataSyncEvent =
  | { type: 'START_SYNC' }
  | { type: 'SYNC_PARTICIPANTS' }
  | { type: 'SYNC_SESSIONS' }
  | { type: 'SYNC_ANALYSES' }
  | { type: 'SYNC_PROGRESS'; progress: Partial<AnalyticalDataSyncContext['progress']> }
  | { type: 'SYNC_COMPLETED' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'RESET' };

export const analyticalDataSyncMachine = createMachine<AnalyticalDataSyncContext, AnalyticalDataSyncEvent>(
  {
    id: 'analyticalDataSync',
    initial: 'idle',
    context: {
      port: null as any,
      syncStatus: 'idle',
      lastSyncTime: null,
      error: null,
      progress: {
        participantsProcessed: 0,
        sessionsProcessed: 0,
        analysesProcessed: 0,
        totalParticipants: 0,
        totalSessions: 0,
        totalAnalyses: 0,
      },
    },
    states: {
      idle: {
        entry: assign({
          syncStatus: 'idle',
          error: null,
        }),
        on: {
          START_SYNC: 'initializing',
          RESET: {
            actions: assign({
              syncStatus: 'idle',
              lastSyncTime: null,
              error: null,
              progress: () => ({
                participantsProcessed: 0,
                sessionsProcessed: 0,
                analysesProcessed: 0,
                totalParticipants: 0,
                totalSessions: 0,
                totalAnalyses: 0,
              }),
            }),
          },
        },
      },
      initializing: {
        entry: assign({ syncStatus: 'syncing' }),
        invoke: {
          src: 'initializeSync',
          onDone: 'syncingParticipants',
          onError: {
            target: 'error',
            actions: assign({
              error: (_, event) => event.data.message,
            }),
          },
        },
      },
      syncingParticipants: {
        invoke: {
          src: 'syncParticipants',
          onDone: 'syncingSessions',
          onError: {
            target: 'error',
            actions: assign({
              error: (_, event) => event.data.message,
            }),
          },
        },
      },
      syncingSessions: {
        invoke: {
          src: 'syncSessions',
          onDone: 'syncingAnalyses',
          onError: {
            target: 'error',
            actions: assign({
              error: (_, event) => event.data.message,
            }),
          },
        },
      },
      syncingAnalyses: {
        invoke: {
          src: 'syncAnalyses',
          onDone: 'completed',
          onError: {
            target: 'error',
            actions: assign({
              error: (_, event) => event.data.message,
            }),
          },
        },
      },
      completed: {
        entry: [
          assign({
            syncStatus: 'completed',
            lastSyncTime: () => new Date().toISOString(),
          }),
        ],
        on: {
          RESET: 'idle',
        },
      },
      error: {
        entry: assign({ syncStatus: 'error' }),
        on: {
          RESET: 'idle',
        },
      },
    },
    on: {
      SYNC_PROGRESS: {
        actions: assign({
          progress: (context, event) => ({
            ...context.progress,
            ...event.progress,
          }),
        }),
      },
    },
  },
  {
    services: {
      initializeSync: async (context) => {
        // DuckDB初期化
        await context.port.initialize?.();
        console.log('Analytical data sync initialized');
      },
      syncParticipants: async (context) => {
        // 実際の実装ではKuzuManagerからデータを取得
        // ここではモックデータを使用
        const mockParticipants = [
          {
            id: 'participant-1',
            signature: 'Test User 1',
            agreedAt: new Date().toISOString(),
            agreements: { consent: true },
          },
        ];

        for (const participant of mockParticipants) {
          await context.port.syncParticipantData(participant);
        }

        return { processed: mockParticipants.length };
      },
      syncSessions: async (context) => {
        // 実際の実装ではKuzuManagerからデータを取得
        const mockSessions = [
          {
            id: 'session-1',
            participantId: 'participant-1',
            events: [],
            createdAt: new Date().toISOString(),
          },
        ];

        for (const session of mockSessions) {
          await context.port.syncSessionData(session);
        }

        return { processed: mockSessions.length };
      },
      syncAnalyses: async (context) => {
        // 実際の実装ではKuzuManagerからデータを取得
        const mockAnalyses = [
          {
            id: 'analysis-1',
            participantId: 'participant-1',
            videoFileId: 'video-1',
            sessionType: 'voice',
            timestamp: new Date().toISOString(),
            processingTime: 1500,
            emotions: [
              { name: 'joy', score: 0.8, confidence: 0.9 },
              { name: 'sadness', score: 0.1, confidence: 0.8 },
              { name: 'anger', score: 0.05, confidence: 0.7 },
            ],
          },
        ];

        for (const analysis of mockAnalyses) {
          await context.port.syncEmotionAnalysisData(analysis);
        }

        return { processed: mockAnalyses.length };
      },
    },
  }
);

// Merkle DAG: 分析データ同期ワークフローの作成関数
export function createAnalyticalDataSyncWorkflow(port: AnalyticalDataPort) {
  return analyticalDataSyncMachine.withContext({
    ...analyticalDataSyncMachine.context,
    port,
  });
}
