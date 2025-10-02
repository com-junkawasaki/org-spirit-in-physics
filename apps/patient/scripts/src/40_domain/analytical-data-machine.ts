// Merkle DAG: 分析データドメインマシン
// XStateを使用した分析データの状態管理

import { createMachine, assign } from 'xstate';
import type { AnalyticalDataPort } from '../20_ports/analytical-data';

export interface AnalyticalDataContext {
  participants: any[];
  emotionTimeSeries: any[];
  emotionDistribution: any[];
  emotionCorrelations: any[];
  clusteringData: any[];
  error: string | null;
  loading: boolean;
}

export type AnalyticalDataEvent =
  | { type: 'LOAD_PARTICIPANTS' }
  | { type: 'LOAD_EMOTION_TIME_SERIES'; participantId: string; emotionName?: string }
  | { type: 'LOAD_EMOTION_DISTRIBUTION'; participantId?: string }
  | { type: 'LOAD_EMOTION_CORRELATIONS' }
  | { type: 'LOAD_CLUSTERING_DATA' }
  | { type: 'SYNC_PARTICIPANT_DATA'; participant: any }
  | { type: 'SYNC_SESSION_DATA'; session: any }
  | { type: 'SYNC_EMOTION_ANALYSIS_DATA'; analysis: any }
  | { type: 'ANALYSIS_SUCCESS'; data: any }
  | { type: 'ANALYSIS_ERROR'; error: string };

export const analyticalDataMachine = createMachine<AnalyticalDataContext, AnalyticalDataEvent>(
  {
    id: 'analyticalData',
    initial: 'idle',
    context: {
      participants: [],
      emotionTimeSeries: [],
      emotionDistribution: [],
      emotionCorrelations: [],
      clusteringData: [],
      error: null,
      loading: false,
    },
    states: {
      idle: {
        on: {
          LOAD_PARTICIPANTS: 'loadingParticipants',
          LOAD_EMOTION_TIME_SERIES: 'loadingEmotionTimeSeries',
          LOAD_EMOTION_DISTRIBUTION: 'loadingEmotionDistribution',
          LOAD_EMOTION_CORRELATIONS: 'loadingEmotionCorrelations',
          LOAD_CLUSTERING_DATA: 'loadingClusteringData',
          SYNC_PARTICIPANT_DATA: 'syncingParticipant',
          SYNC_SESSION_DATA: 'syncingSession',
          SYNC_EMOTION_ANALYSIS_DATA: 'syncingEmotionAnalysis',
        },
      },
      loadingParticipants: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'loadParticipants',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                participants: (_, event) => event.data,
                loading: false,
              }),
            ],
          },
          onError: {
            target: 'idle',
            actions: [
              assign({
                error: (_, event) => event.data.message,
                loading: false,
              }),
            ],
          },
        },
      },
      loadingEmotionTimeSeries: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'loadEmotionTimeSeries',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                emotionTimeSeries: (_, event) => event.data,
                loading: false,
              }),
            ],
          },
          onError: {
            target: 'idle',
            actions: [
              assign({
                error: (_, event) => event.data.message,
                loading: false,
              }),
            ],
          },
        },
      },
      loadingEmotionDistribution: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'loadEmotionDistribution',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                emotionDistribution: (_, event) => event.data,
                loading: false,
              }),
            ],
          },
          onError: {
            target: 'idle',
            actions: [
              assign({
                error: (_, event) => event.data.message,
                loading: false,
              }),
            ],
          },
        },
      },
      loadingEmotionCorrelations: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'loadEmotionCorrelations',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                emotionCorrelations: (_, event) => event.data,
                loading: false,
              }),
            ],
          },
          onError: {
            target: 'idle',
            actions: [
              assign({
                error: (_, event) => event.data.message,
                loading: false,
              }),
            ],
          },
        },
      },
      loadingClusteringData: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'loadClusteringData',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                clusteringData: (_, event) => event.data,
                loading: false,
              }),
            ],
          },
          onError: {
            target: 'idle',
            actions: [
              assign({
                error: (_, event) => event.data.message,
                loading: false,
              }),
            ],
          },
        },
      },
      syncingParticipant: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'syncParticipantData',
          onDone: 'idle',
          onError: {
            target: 'idle',
            actions: assign({
              error: (_, event) => event.data.message,
              loading: false,
            }),
          },
        },
      },
      syncingSession: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'syncSessionData',
          onDone: 'idle',
          onError: {
            target: 'idle',
            actions: assign({
              error: (_, event) => event.data.message,
              loading: false,
            }),
          },
        },
      },
      syncingEmotionAnalysis: {
        entry: assign({ loading: true, error: null }),
        invoke: {
          src: 'syncEmotionAnalysisData',
          onDone: 'idle',
          onError: {
            target: 'idle',
            actions: assign({
              error: (_, event) => event.data.message,
              loading: false,
            }),
          },
        },
      },
    },
  },
  {
    services: {
      loadParticipants: async (context, event) => {
        // 実際の実装ではAnalyticalDataPortを注入
        const port = context as any; // 実際にはDIコンテナから取得
        return await port.getAllParticipantAnalytics();
      },
      loadEmotionTimeSeries: async (context, event) => {
        const port = context as any;
        if (event.type === 'LOAD_EMOTION_TIME_SERIES') {
          return await port.getEmotionTimeSeries(event.participantId, event.emotionName);
        }
        return [];
      },
      loadEmotionDistribution: async (context, event) => {
        const port = context as any;
        if (event.type === 'LOAD_EMOTION_DISTRIBUTION') {
          return await port.getEmotionDistribution(event.participantId);
        }
        return [];
      },
      loadEmotionCorrelations: async (context, event) => {
        const port = context as any;
        return await port.getEmotionCorrelations();
      },
      loadClusteringData: async (context, event) => {
        const port = context as any;
        return await port.getClusteringData();
      },
      syncParticipantData: async (context, event) => {
        const port = context as any;
        if (event.type === 'SYNC_PARTICIPANT_DATA') {
          await port.syncParticipantData(event.participant);
        }
      },
      syncSessionData: async (context, event) => {
        const port = context as any;
        if (event.type === 'SYNC_SESSION_DATA') {
          await port.syncSessionData(event.session);
        }
      },
      syncEmotionAnalysisData: async (context, event) => {
        const port = context as any;
        if (event.type === 'SYNC_EMOTION_ANALYSIS_DATA') {
          await port.syncEmotionAnalysisData(event.analysis);
        }
      },
    },
  }
);

// Merkle DAG: 分析データサービスの作成関数
export function createAnalyticalDataService(port: AnalyticalDataPort) {
  return {
    machine: analyticalDataMachine.withContext({
      ...analyticalDataMachine.context,
      port, // ポートをコンテキストに注入
    }),
    actions: {
      loadParticipants: () => ({ type: 'LOAD_PARTICIPANTS' as const }),
      loadEmotionTimeSeries: (participantId: string, emotionName?: string) => ({
        type: 'LOAD_EMOTION_TIME_SERIES' as const,
        participantId,
        emotionName,
      }),
      loadEmotionDistribution: (participantId?: string) => ({
        type: 'LOAD_EMOTION_DISTRIBUTION' as const,
        participantId,
      }),
      loadEmotionCorrelations: () => ({ type: 'LOAD_EMOTION_CORRELATIONS' as const }),
      loadClusteringData: () => ({ type: 'LOAD_CLUSTERING_DATA' as const }),
      syncParticipantData: (participant: any) => ({
        type: 'SYNC_PARTICIPANT_DATA' as const,
        participant,
      }),
      syncSessionData: (session: any) => ({
        type: 'SYNC_SESSION_DATA' as const,
        session,
      }),
      syncEmotionAnalysisData: (analysis: any) => ({
        type: 'SYNC_EMOTION_ANALYSIS_DATA' as const,
        analysis,
      }),
    },
  };
}
