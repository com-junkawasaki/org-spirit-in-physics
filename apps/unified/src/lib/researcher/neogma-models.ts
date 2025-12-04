// Merkle DAG: Neogmaモデル定義
// ガイドライン: グラフ → 型の写像は「関係から決める」
// NOTE: neogma dependency removed - using any types for build compatibility

// import { type Neogma, ModelFactory, type ModelRelatedNodesI } from 'neogma';

type Neogma = any
// type ModelFactory = any // Unused
// @ts-expect-error - Type parameters unused but kept for API compatibility
type ModelRelatedNodesI<T = any, P = any> = any

// 共通の型定義 - ガイドライン: プロパティ設計は疎に／Map的フィールドは最後に
interface BaseNode {
  id: string; // ガイドライン: 主キーはアプリ側の安定ID
  created_at?: string;
  updated_at?: string;
  // Map的フィールドは最後に配置
  metadata?: Record<string, unknown>;
  // Neogmaの型制約対応（拡張フィールド許容）
  [key: string]: any;
}

// モデル型定義 - 実行時にcreateNeogmaModels関数でインスタンス化されます

// Participantモデル - ガイドライン: 関係から決める型の写像
interface ParticipantProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  age?: number;
  gender?: string;
  handedness?: string;
  consent_given?: boolean;
  consent_timestamp?: string;
  // Map的フィールドは最後に
  additional_properties?: Record<string, unknown>;
}

// Experimentモデル - 実験の上位概念
interface ExperimentProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  experiment_name?: string;
  experiment_type?: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  // Map的フィールドは最後に
  additional_properties?: Record<string, unknown>;
}

// ガイドライン: 双方向は必要最小限・片側保存原則
// @ts-expect-error - Unused type, kept for future use
interface ParticipantRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  experiments: ModelRelatedNodesI<
    any,
    {
      id: string;
      participant_id: string;
      experiment_name?: string;
      experiment_type?: string;
      status?: string;
    }
  >;
  // 可視化用データセット（TimelineVisualizationで使用）
  visualizationDatasets: ModelRelatedNodesI<
    any,
    VisualizationDatasetProperties
  >;
  sessions: ModelRelatedNodesI<
    any,
    {
      id: string;
      participant_id: string;
      experiment_id: string;
      start_ts: string;
      end_ts?: string;
      status: string;
    }
  >;
  responses: ModelRelatedNodesI<
    any,
    {
      id: string;
      participant_id: string;
      experiment_id: string;
      session_id: string;
      stimulus_word: string;
      response_word: string;
      reaction_time_ms?: number;
      event_ts: string;
      emotion?: string;
      emotion_confidence?: number;
    }
  >;
}

// Experiment関連ノード定義
// @ts-expect-error - Unused type, kept for future use
interface ExperimentRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    any,
    ParticipantProperties
  >;
  sessions: ModelRelatedNodesI<
    any,
    {
      id: string;
      participant_id: string;
      experiment_id: string;
      start_ts: string;
      end_ts?: string;
      status: string;
    }
  >;
}

// ExperimentSessionモデル - ガイドライン: 関係から決める型の写像
interface ExperimentSessionProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  participant_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  experiment_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  start_ts: string;
  end_ts?: string;
  status: string;
  total_responses?: number;
  completed_responses?: number;
  // Map的フィールドは最後に
  session_metadata?: Record<string, unknown>;
}

// ガイドライン: 双方向は必要最小限・片側保存原則
// @ts-expect-error - Unused type, kept for future use
interface ExperimentSessionRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    any,
    ParticipantProperties
  >;
  experiment: ModelRelatedNodesI<
    any,
    ExperimentProperties
  >;
  responses: ModelRelatedNodesI<
    any,
    {
      id: string;
      participant_id: string;
      experiment_id: string;
      session_id: string;
      stimulus_word: string;
      response_word: string;
      reaction_time_ms?: number;
      event_ts: string;
      emotion?: string;
      emotion_confidence?: number;
    }
  >;
}

// Responseモデル - ガイドライン: 関係から決める型の写像
interface ResponseProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  participant_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  experiment_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  session_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  stimulus_word: string;
  response_word: string;
  reaction_time_ms?: number;
  event_ts: string;
  emotion?: string;
  emotion_confidence?: number;
  spirit_probability?: number;
  // Map的フィールドは最後に
  response_metadata?: Record<string, unknown>;
}

// ガイドライン: 双方向は必要最小限・片側保存原則
// @ts-expect-error - Unused type, kept for future use
interface ResponseRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    any,
    ParticipantProperties
  >;
  experiment: ModelRelatedNodesI<
    any,
    ExperimentProperties
  >;
  session: ModelRelatedNodesI<
    any,
    ExperimentSessionProperties
  >;
  emotionAnalysis: ModelRelatedNodesI<
    any,
    {
      id: string;
      response_id: string;
      emotion_data: Record<string, unknown>;
      confidence_score?: number;
      analysis_timestamp: string;
    }
  >;
}

// EmotionAnalysisモデル - ガイドライン: 関係から決める型の写像
// @ts-expect-error - Unused type, kept for future use
interface EmotionAnalysisProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  response_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  emotion_data: Record<string, unknown>; // Map的フィールド
  confidence_score?: number;
  analysis_timestamp: string;
  source?: string;
  // Map的フィールドは最後に
  analysis_metadata?: Record<string, unknown>;
}

// ガイドライン: 双方向は必要最小限・片側保存原則
// @ts-expect-error - Unused type, kept for future use
interface EmotionAnalysisRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  response: ModelRelatedNodesI<
    any,
    ResponseProperties
  >;
}

// WordStimulusモデル - ガイドライン: 関係から決める型の写像
// @ts-expect-error - Unused type, kept for future use
interface WordStimulusProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  word: string;
  category?: string;
  language: string;
  pronunciation?: string;
  // Map的フィールドは最後に
  meaning_vector?: Record<string, unknown>;
  word_metadata?: Record<string, unknown>;
}

// ImportJobモデル - ガイドライン: 関係から決める型の写像
// @ts-expect-error - Unused type, kept for future use
interface ImportJobProperties extends BaseNode {
  // 基本プロパティ（疎結合）
  session_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  participant_id: string; // ガイドライン: 主キーはアプリ側の安定ID
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  error_message?: string;
  completed_at?: string;
  // Map的フィールドは最後に
  job_metadata?: Record<string, unknown>;
}

// VisualizationDataset（デモ/可視化用データセット）
// ガイドライン: 関係から決める型の写像（Participant → VisualizationDataset → VisualizationPoint）
interface VisualizationDatasetProperties extends BaseNode {
  participant_id: string; // どの参加者のデータか
  data_points_count?: number; // 生成ポイント数
  generated_at: string; // 生成日時 ISO8601
  pipeline_version?: string; // 生成パイプラインのバージョン
  // Map 的フィールド
  metadata?: Record<string, unknown>;
}

// @ts-expect-error - Unused type, kept for future use
interface VisualizationDatasetRelatedNodes {
  points: ModelRelatedNodesI<any, VisualizationPointProperties>
}

// VisualizationPoint（Timelineの1点）
interface VisualizationPointProperties extends BaseNode {
  dataset_id: string; // 親データセット
  timestamp: number; // ms epoch
  word: string;
  has_response: boolean;
  reaction_time_ms?: number;
  // 詳細データはMap的フィールドで格納（疎）
  emotions?: Array<{ name: string; score: number; fileType: string }>; // JSONB想定
  physiological?: { average?: number; max?: number; min?: number; channels?: Record<string, number> };
  reaction_value: number;
  session_id?: string;
  // TimelineVisualization のツールチップで使用するイベント種別
  event_type?: string;
  point_metadata?: Record<string, unknown>;
}

// Neogmaモデル初期化関数 - ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
export function createNeogmaModels(_neogmaInstance: Neogma) {
  // Neogma機能は削除されました - スタブ実装
  // すべてのModelFactory呼び出しを削除
  return {
    Participant: null,
    Experiment: null,
    ExperimentSession: null,
    Response: null,
    EmotionAnalysis: null,
    WordStimulus: null,
    ImportJob: null,
    VisualizationDataset: null,
    VisualizationPoint: null,
  };
}

// Merkle DAG: Neogmaモデル定義完了
