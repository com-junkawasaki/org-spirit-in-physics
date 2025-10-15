import type { Node, Edge } from '@xyflow/react'

export type WorkflowNodeType =
  | 'participant'
  | 'consent'
  | 'session'
  | 'video'
  | 'hume'
  | 'physiological'
  | 'analysis'
  | 'results'

export interface WorkflowNodeData {
  label: string
  type: WorkflowNodeType
  status: 'pending' | 'running' | 'completed' | 'error'
  description: string
  data?: Record<string, unknown>
}

export interface WorkflowEdgeData {
  label?: string
  type: 'data' | 'control' | 'analysis'
}

export type WorkflowNode = Node<WorkflowNodeData>
export type WorkflowEdge = Edge<WorkflowEdgeData>

export interface WorkflowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: {
    version: string
    lastUpdated: string
    totalParticipants: number
    activeSessions: number
    completedAnalyses: number
  }
}

// ワークフロー定義
export const WORKFLOW_NODES: Omit<WorkflowNode, 'position'>[] = [
  {
    id: 'participants',
    type: 'default',
    data: {
      label: '参加者データ',
      type: 'participant',
      status: 'completed',
      description: '実験参加者の基本情報と登録データ',
    },
  },
  {
    id: 'consent',
    type: 'default',
    data: {
      label: '同意書',
      type: 'consent',
      status: 'completed',
      description: '参加者の同意書と倫理的承認',
    },
  },
  {
    id: 'sessions',
    type: 'default',
    data: {
      label: '実験セッション',
      type: 'session',
      status: 'running',
      description: '参加者の実験セッションデータ',
    },
  },
  {
    id: 'video-files',
    type: 'default',
    data: {
      label: 'ビデオファイル',
      type: 'video',
      status: 'pending',
      description: '実験中のビデオ録画データ',
    },
  },
  {
    id: 'hume-analysis',
    type: 'default',
    data: {
      label: 'Hume AI感情分析',
      type: 'hume',
      status: 'pending',
      description: 'Hume AIによる感情・表情分析',
    },
  },
  {
    id: 'physiological-data',
    type: 'default',
    data: {
      label: '生理データ',
      type: 'physiological',
      status: 'pending',
      description: '皮膚電位などの生体信号データ',
    },
  },
  {
    id: 'kawasaki-model',
    type: 'default',
    data: {
      label: '川崎モデル分析',
      type: 'analysis',
      status: 'pending',
      description: 'Word2Vec + 感情 + 生理データの統合分析',
    },
  },
  {
    id: 'results',
    type: 'default',
    data: {
      label: '分析結果',
      type: 'results',
      status: 'pending',
      description: 'Spirit確率と分析レポート',
    },
  },
]

export const WORKFLOW_EDGES: WorkflowEdge[] = [
  {
    id: 'participants-to-consent',
    source: 'participants',
    target: 'consent',
    type: 'default',
    data: { type: 'control' },
  },
  {
    id: 'consent-to-sessions',
    source: 'consent',
    target: 'sessions',
    type: 'default',
    data: { type: 'control' },
  },
  {
    id: 'sessions-to-video',
    source: 'sessions',
    target: 'video-files',
    type: 'default',
    data: { type: 'data' },
  },
  {
    id: 'sessions-to-physiological',
    source: 'sessions',
    target: 'physiological-data',
    type: 'default',
    data: { type: 'data' },
  },
  {
    id: 'video-to-hume',
    source: 'video-files',
    target: 'hume-analysis',
    type: 'default',
    data: { type: 'data' },
  },
  {
    id: 'hume-to-kawasaki',
    source: 'hume-analysis',
    target: 'kawasaki-model',
    type: 'default',
    data: { type: 'analysis' },
  },
  {
    id: 'physiological-to-kawasaki',
    source: 'physiological-data',
    target: 'kawasaki-model',
    type: 'default',
    data: { type: 'analysis' },
  },
  {
    id: 'sessions-to-kawasaki',
    source: 'sessions',
    target: 'kawasaki-model',
    type: 'default',
    data: { type: 'analysis' },
  },
  {
    id: 'kawasaki-to-results',
    source: 'kawasaki-model',
    target: 'results',
    type: 'default',
    data: { type: 'data' },
  },
]
