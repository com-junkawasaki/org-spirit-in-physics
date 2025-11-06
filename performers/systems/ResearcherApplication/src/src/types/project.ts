// Merkle DAG: types.project_schema -> project_data_validation
// Project関連の型定義

import type { WorkflowNode, WorkflowEdge } from '@/lib/workflow-types'

/**
 * Project のステータス
 */
export type ProjectStatus =
  | 'planning'
  | 'recruiting'
  | 'running'
  | 'analyzing'
  | 'completed'

/**
 * Project の基本情報
 */
export interface Project {
  id: string // UUID
  name: string
  description: string | null
  purpose: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
  created_by: string // 研究者ID
}

/**
 * 実験設定のセッションパラメータ
 */
export interface SessionParameters {
  word_display_duration_ms: number
  response_window_ms: number
  rest_duration_ms: number
}

/**
 * 分析パラメータのタイムカーネル
 */
export interface TimeKernel {
  timestamps: number[]
  tau: number
  weight: number
}

/**
 * 分析パラメータ
 */
export interface AnalysisParameters {
  dimensions: number // 埋め込み次元数 (2 or 3)
  k: number // k-NN
  normalization: 'trace' | 'fro'
  nonNegativeWeights: boolean
  timeKernel?: TimeKernel
}

/**
 * Project の実験設定
 */
export interface ExperimentConfig {
  project_id: string
  session_types: ('session-1' | 'session-2')[]
  word_list: string[] // 単語刺激リスト
  session_parameters: SessionParameters
  analysis_parameters: AnalysisParameters
  created_at: string
  updated_at: string
}

/**
 * Project のワークフロー定義
 */
export interface ProjectWorkflow {
  project_id: string
  workflow_data: {
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
  created_at: string
  updated_at: string
}

/**
 * Project 参加者関連情報
 */
export interface ProjectParticipant {
  project_id: string
  participant_id: string
  joined_at: string
  participant?: {
    id: string
    name: string | null
    created_at: string
  }
}

/**
 * Project 統計情報
 */
export interface ProjectStats {
  project_id: string
  total_participants: number
  total_sessions: number
  total_responses: number
  active_sessions: number
  completed_analyses: number
  average_spirit_probability: number
}

/**
 * Project 作成時のリクエスト
 */
export interface CreateProjectRequest {
  name: string
  description?: string
  purpose?: string
  status?: ProjectStatus
  created_by: string
}

/**
 * Project 更新時のリクエスト
 */
export interface UpdateProjectRequest {
  name?: string
  description?: string
  purpose?: string
  status?: ProjectStatus
}

/**
 * Project 詳細情報（関連データを含む）
 */
export interface ProjectDetail extends Project {
  experiment_config?: ExperimentConfig | null
  workflow?: ProjectWorkflow | null
  participants: ProjectParticipant[]
  stats: ProjectStats
}

/**
 * Project 一覧のクエリパラメータ
 */
export interface ProjectListQuery {
  status?: ProjectStatus
  created_by?: string
  search?: string
  limit?: number
  offset?: number
}

