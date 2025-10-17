// Merkle DAG: Neogmaモデル定義
// Neogmaを使用した型安全なNeo4j Object-Graph Mapping
// ガイドライン: グラフ → 型の写像は「関係から決める」

import { type Neogma, ModelFactory, type ModelRelatedNodesI } from 'neogma';

// 共通の型定義 - ガイドライン: プロパティ設計は疎に／Map的フィールドは最後に
interface BaseNode {
  id: string; // ガイドライン: 主キーはアプリ側の安定ID
  created_at?: string;
  updated_at?: string;
  // Map的フィールドは最後に配置
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Neogmaの制約を満たすためのインデックスシグネチャ
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
interface ParticipantRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  experiments: ModelRelatedNodesI<
    unknown, // 循環参照を避けるためunknownを使用
    {
      id: string;
      participant_id: string;
      experiment_name?: string;
      experiment_type?: string;
      status?: string;
    }
  >;
  sessions: ModelRelatedNodesI<
    unknown, // 循環参照を避けるためunknownを使用
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
    unknown, // 循環参照を避けるためunknownを使用
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
interface ExperimentRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    unknown,
    ParticipantProperties
  >;
  sessions: ModelRelatedNodesI<
    unknown,
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
interface ExperimentSessionRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    unknown,
    ParticipantProperties
  >;
  experiment: ModelRelatedNodesI<
    unknown,
    ExperimentProperties
  >;
  responses: ModelRelatedNodesI<
    unknown,
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
interface ResponseRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  participant: ModelRelatedNodesI<
    unknown,
    ParticipantProperties
  >;
  experiment: ModelRelatedNodesI<
    unknown,
    ExperimentProperties
  >;
  session: ModelRelatedNodesI<
    unknown,
    ExperimentSessionProperties
  >;
  emotionAnalysis: ModelRelatedNodesI<
    unknown,
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
interface EmotionAnalysisRelatedNodes {
  // 一方向関係のみ定義（片側保存）
  response: ModelRelatedNodesI<
    unknown,
    ResponseProperties
  >;
}

// WordStimulusモデル - ガイドライン: 関係から決める型の写像
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

interface VisualizationDatasetRelatedNodes {
  points: ModelRelatedNodesI<
    unknown,
    {
      id: string;
      dataset_id: string;
      // タイムラインの個別ポイント
      timestamp: number;
      word: string;
      has_response: boolean;
      reaction_time_ms?: number;
      emotions?: Record<string, unknown>[]; // { name, score, fileType }
      physiological?: Record<string, unknown>; // { average, max, min, channels }
      reaction_value: number;
      session_id?: string;
    }
  >
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
  point_metadata?: Record<string, unknown>;
}

// Neogmaモデル初期化関数 - ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
export function createNeogmaModels(neogmaInstance: Neogma) {
  // Neogmaインスタンスを使ってモデルを再作成
  const ParticipantModel = ModelFactory<ParticipantProperties, ParticipantRelatedNodes>(
    {
      label: 'Participant',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        age: { type: 'number', minimum: 0, maximum: 150 },
        gender: { type: 'string' },
        handedness: { type: 'string' },
        consent_given: { type: 'boolean', default: false },
        consent_timestamp: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        additional_properties: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const ExperimentModel = ModelFactory<ExperimentProperties, ExperimentRelatedNodes>(
    {
      label: 'Experiment',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        experiment_name: { type: 'string' },
        experiment_type: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        additional_properties: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const ExperimentSessionModel = ModelFactory<ExperimentSessionProperties, ExperimentSessionRelatedNodes>(
    {
      label: 'ExperimentSession',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        participant_id: { type: 'string', required: true },
        experiment_id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        start_ts: { type: 'string', required: true },
        end_ts: { type: 'string' },
        status: { type: 'string', required: true },
        total_responses: { type: 'number', minimum: 0 },
        completed_responses: { type: 'number', minimum: 0 },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        session_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const ResponseModel = ModelFactory<ResponseProperties, ResponseRelatedNodes>(
    {
      label: 'Response',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        participant_id: { type: 'string', required: true },
        experiment_id: { type: 'string', required: true },
        session_id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        stimulus_word: { type: 'string', required: true },
        response_word: { type: 'string', required: true },
        reaction_time_ms: { type: 'number', minimum: 0 },
        event_ts: { type: 'string', required: true },
        emotion: { type: 'string' },
        emotion_confidence: { type: 'number', minimum: 0, maximum: 1 },
        spirit_probability: { type: 'number', minimum: 0, maximum: 1 },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        response_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const EmotionAnalysisModel = ModelFactory<EmotionAnalysisProperties, EmotionAnalysisRelatedNodes>(
    {
      label: 'EmotionAnalysis',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        response_id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        confidence_score: { type: 'number', minimum: 0, maximum: 1 },
        analysis_timestamp: { type: 'string', required: true },
        source: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        emotion_data: { type: 'object', required: true },
        analysis_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const WordStimulusModel = ModelFactory<WordStimulusProperties, Record<string, never>>(
    {
      label: 'WordStimulus',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        word: { type: 'string', required: true },
        category: { type: 'string' },
        language: { type: 'string', required: true },
        pronunciation: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        meaning_vector: { type: 'object' },
        word_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const ImportJobModel = ModelFactory<ImportJobProperties, Record<string, never>>(
    {
      label: 'ImportJob',
      schema: {
        // ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める
        id: { type: 'string', required: true },
        session_id: { type: 'string', required: true },
        participant_id: { type: 'string', required: true },
        // 基本プロパティ（疎結合）
        status: { type: 'string', required: true, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] },
        progress_percentage: { type: 'number', minimum: 0, maximum: 100, default: 0 },
        error_message: { type: 'string' },
        completed_at: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        // Map的フィールドは最後に
        job_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id', // ガイドライン: 主キーはアプリ側の安定ID
    },
    neogmaInstance
  );

  const VisualizationDatasetModel = ModelFactory<VisualizationDatasetProperties, VisualizationDatasetRelatedNodes>(
    {
      label: 'VisualizationDataset',
      schema: {
        id: { type: 'string', required: true },
        participant_id: { type: 'string', required: true },
        data_points_count: { type: 'number', minimum: 0 },
        generated_at: { type: 'string', required: true },
        pipeline_version: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id',
    },
    neogmaInstance
  )

  const VisualizationPointModel = ModelFactory<VisualizationPointProperties, Record<string, never>>(
    {
      label: 'VisualizationPoint',
      schema: {
        id: { type: 'string', required: true },
        dataset_id: { type: 'string', required: true },
        timestamp: { type: 'number', minimum: 0 },
        word: { type: 'string', required: true },
        has_response: { type: 'boolean', default: false },
        reaction_time_ms: { type: 'number', minimum: 0 },
        reaction_value: { type: 'number' },
        session_id: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        emotions: { type: 'array' },
        physiological: { type: 'object' },
        point_metadata: { type: 'object' },
        metadata: { type: 'object' },
      },
      primaryKeyField: 'id',
    },
    neogmaInstance
  )

  return {
    Participant: ParticipantModel,
    Experiment: ExperimentModel,
    ExperimentSession: ExperimentSessionModel,
    Response: ResponseModel,
    EmotionAnalysis: EmotionAnalysisModel,
    WordStimulus: WordStimulusModel,
    ImportJob: ImportJobModel,
    VisualizationDataset: VisualizationDatasetModel,
    VisualizationPoint: VisualizationPointModel,
  };
}

// Merkle DAG: Neogmaモデル定義完了
// これらのモデルは型安全なNeo4j操作を提供
