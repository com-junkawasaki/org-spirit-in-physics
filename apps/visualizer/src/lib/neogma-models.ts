// Merkle DAG: Neogmaモデル定義
// Neogmaを使用した型安全なNeo4j Object-Graph Mapping

import { Neogma, ModelFactory, ModelRelatedNodesI } from 'neogma';

// 共通の型定義
interface BaseNode {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// Participantモデル
interface ParticipantProperties extends BaseNode {
  age?: number;
  gender?: string;
  handedness?: string;
  consent_given?: boolean;
  consent_timestamp?: string;
}

interface ParticipantRelatedNodes {
  sessions: ModelRelatedNodesI<
    typeof ExperimentSession,
    {
      id: string;
      participant_id: string;
      start_ts: string;
      end_ts?: string;
      status: string;
    }
  >;
  responses: ModelRelatedNodesI<
    typeof Response,
    {
      id: string;
      participant_id: string;
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

export const Participant = ModelFactory<ParticipantProperties, ParticipantRelatedNodes>(
  {
    label: 'Participant',
    schema: {
      id: { type: 'string', required: true },
      age: { type: 'number', minimum: 0 },
      gender: { type: 'string' },
      handedness: { type: 'string' },
      consent_given: { type: 'boolean', default: false },
      consent_timestamp: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
    relationshipCreationKeys: {
      sessions: 'HAS_SESSION',
      responses: 'HAS_RESPONSE',
    },
  },
  {} as Neogma // Will be set when initializing
);

// ExperimentSessionモデル
interface ExperimentSessionProperties extends BaseNode {
  participant_id: string;
  start_ts: string;
  end_ts?: string;
  status: string;
  total_responses?: number;
  completed_responses?: number;
}

interface ExperimentSessionRelatedNodes {
  participant: ModelRelatedNodesI<
    typeof Participant,
    ParticipantProperties
  >;
  responses: ModelRelatedNodesI<
    typeof Response,
    {
      id: string;
      participant_id: string;
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

export const ExperimentSession = ModelFactory<ExperimentSessionProperties, ExperimentSessionRelatedNodes>(
  {
    label: 'ExperimentSession',
    schema: {
      id: { type: 'string', required: true },
      participant_id: { type: 'string', required: true },
      start_ts: { type: 'string', required: true },
      end_ts: { type: 'string' },
      status: { type: 'string', required: true },
      total_responses: { type: 'number', minimum: 0 },
      completed_responses: { type: 'number', minimum: 0 },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
    relationshipCreationKeys: {
      participant: 'HAS_SESSION',
      responses: 'HAS_RESPONSE',
    },
  },
  {} as Neogma
);

// Responseモデル
interface ResponseProperties extends BaseNode {
  participant_id: string;
  session_id: string;
  stimulus_word: string;
  response_word: string;
  reaction_time_ms?: number;
  event_ts: string;
  emotion?: string;
  emotion_confidence?: number;
  spirit_probability?: number;
}

interface ResponseRelatedNodes {
  participant: ModelRelatedNodesI<
    typeof Participant,
    ParticipantProperties
  >;
  session: ModelRelatedNodesI<
    typeof ExperimentSession,
    ExperimentSessionProperties
  >;
  emotionAnalysis: ModelRelatedNodesI<
    typeof EmotionAnalysis,
    {
      id: string;
      response_id: string;
      emotion_data: any;
      confidence_score?: number;
      analysis_timestamp: string;
    }
  >;
}

export const Response = ModelFactory<ResponseProperties, ResponseRelatedNodes>(
  {
    label: 'Response',
    schema: {
      id: { type: 'string', required: true },
      participant_id: { type: 'string', required: true },
      session_id: { type: 'string', required: true },
      stimulus_word: { type: 'string', required: true },
      response_word: { type: 'string', required: true },
      reaction_time_ms: { type: 'number', minimum: 0 },
      event_ts: { type: 'string', required: true },
      emotion: { type: 'string' },
      emotion_confidence: { type: 'number', minimum: 0, maximum: 1 },
      spirit_probability: { type: 'number', minimum: 0, maximum: 1 },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
    relationshipCreationKeys: {
      participant: 'HAS_RESPONSE',
      session: 'HAS_RESPONSE',
      emotionAnalysis: 'HAS_EMOTION_ANALYSIS',
    },
  },
  {} as Neogma
);

// EmotionAnalysisモデル
interface EmotionAnalysisProperties extends BaseNode {
  response_id: string;
  emotion_data: any;
  confidence_score?: number;
  analysis_timestamp: string;
  source?: string;
}

interface EmotionAnalysisRelatedNodes {
  response: ModelRelatedNodesI<
    typeof Response,
    ResponseProperties
  >;
}

export const EmotionAnalysis = ModelFactory<EmotionAnalysisProperties, EmotionAnalysisRelatedNodes>(
  {
    label: 'EmotionAnalysis',
    schema: {
      id: { type: 'string', required: true },
      response_id: { type: 'string', required: true },
      emotion_data: { type: 'any', required: true },
      confidence_score: { type: 'number', minimum: 0, maximum: 1 },
      analysis_timestamp: { type: 'string', required: true },
      source: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
    relationshipCreationKeys: {
      response: 'HAS_EMOTION_ANALYSIS',
    },
  },
  {} as Neogma
);

// WordStimulusモデル
interface WordStimulusProperties extends BaseNode {
  word: string;
  category?: string;
  language: string;
  pronunciation?: string;
  meaning_vector?: any;
}

export const WordStimulus = ModelFactory<WordStimulusProperties, {}>(
  {
    label: 'WordStimulus',
    schema: {
      id: { type: 'string', required: true },
      word: { type: 'string', required: true },
      category: { type: 'string' },
      language: { type: 'string', required: true },
      pronunciation: { type: 'string' },
      meaning_vector: { type: 'any' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
  },
  {} as Neogma
);

// ImportJobモデル（ジョブ管理用）
interface ImportJobProperties extends BaseNode {
  session_id: string;
  participant_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  error_message?: string;
  completed_at?: string;
}

export const ImportJob = ModelFactory<ImportJobProperties, {}>(
  {
    label: 'ImportJob',
    schema: {
      id: { type: 'string', required: true },
      session_id: { type: 'string', required: true },
      participant_id: { type: 'string', required: true },
      status: { type: 'string', required: true, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] },
      progress_percentage: { type: 'number', minimum: 0, maximum: 100, default: 0 },
      error_message: { type: 'string' },
      completed_at: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
    primaryKeyField: 'id',
  },
  {} as Neogma
);

// Neogmaインスタンス初期化関数
export function initializeNeogmaModels(neogmaInstance: Neogma) {
  // 各モデルにNeogmaインスタンスを設定
  Object.assign(Participant, { neogma: neogmaInstance });
  Object.assign(ExperimentSession, { neogma: neogmaInstance });
  Object.assign(Response, { neogma: neogmaInstance });
  Object.assign(EmotionAnalysis, { neogma: neogmaInstance });
  Object.assign(WordStimulus, { neogma: neogmaInstance });
  Object.assign(ImportJob, { neogma: neogmaInstance });

  return {
    Participant,
    ExperimentSession,
    Response,
    EmotionAnalysis,
    WordStimulus,
    ImportJob,
  };
}

// Merkle DAG: Neogmaモデル定義完了
// これらのモデルは型安全なNeo4j操作を提供
