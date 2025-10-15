// Merkle DAG: Neogmaモデル定義
// Neogmaを使用した型安全なNeo4j Object-Graph Mapping

import { Neogma, ModelFactory, ModelRelatedNodesI } from 'neogma';

// 共通の型定義
interface BaseNode {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Neogmaの制約を満たすためのインデックスシグネチャ
}

// モデル型定義 - 実行時にcreateNeogmaModels関数でインスタンス化されます

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
    any, // 循環参照を避けるためanyを使用
    {
      id: string;
      participant_id: string;
      start_ts: string;
      end_ts?: string;
      status: string;
    }
  >;
  responses: ModelRelatedNodesI<
    any, // 循環参照を避けるためanyを使用
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
    any,
    ParticipantProperties
  >;
  responses: ModelRelatedNodesI<
    any,
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
    any,
    ParticipantProperties
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
      emotion_data: any;
      confidence_score?: number;
      analysis_timestamp: string;
    }
  >;
}

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
    any,
    ResponseProperties
  >;
}

// WordStimulusモデル
interface WordStimulusProperties extends BaseNode {
  word: string;
  category?: string;
  language: string;
  pronunciation?: string;
  meaning_vector?: any;
}

// ImportJobモデル
interface ImportJobProperties extends BaseNode {
  session_id: string;
  participant_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  error_message?: string;
  completed_at?: string;
}

// Neogmaモデル初期化関数
export function createNeogmaModels(neogmaInstance: Neogma) {
  // Neogmaインスタンスを使ってモデルを再作成
  const ParticipantModel = ModelFactory<ParticipantProperties, ParticipantRelatedNodes>(
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
    },
    neogmaInstance
  );

  const ExperimentSessionModel = ModelFactory<ExperimentSessionProperties, ExperimentSessionRelatedNodes>(
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
    },
    neogmaInstance
  );

  const ResponseModel = ModelFactory<ResponseProperties, ResponseRelatedNodes>(
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
    },
    neogmaInstance
  );

  const EmotionAnalysisModel = ModelFactory<EmotionAnalysisProperties, EmotionAnalysisRelatedNodes>(
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
    },
    neogmaInstance
  );

  const WordStimulusModel = ModelFactory<WordStimulusProperties, {}>(
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
    neogmaInstance
  );

  const ImportJobModel = ModelFactory<ImportJobProperties, {}>(
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
    neogmaInstance
  );

  return {
    Participant: ParticipantModel,
    ExperimentSession: ExperimentSessionModel,
    Response: ResponseModel,
    EmotionAnalysis: EmotionAnalysisModel,
    WordStimulus: WordStimulusModel,
    ImportJob: ImportJobModel,
  };
}

// Merkle DAG: Neogmaモデル定義完了
// これらのモデルは型安全なNeo4j操作を提供
