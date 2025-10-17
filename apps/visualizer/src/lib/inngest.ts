import { Inngest } from 'inngest';

// Merkle DAG: inngest_client -> workflow_orchestration
// Inngestクライアントの初期化（visualizer用）
export const inngest = new Inngest({
  id: 'spirit-in-physics-visualizer',
  name: 'Spirit-in-Physics Kernel Fusion Pipeline',
  concurrency: 3, // 同時実行数（核融合処理は重いため控えめに）
  retries: 3, // リトライ回数
  // ローカル開発環境の設定
  baseUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
});

// Merkle DAG: event_types -> workflow_triggers
// イベントタイプの定義
export const events = {
  // ファイルインポート・分析イベント
  FILE_IMPORT_REQUESTED: 'pipeline.file_import.requested',
  FILE_IMPORT_STARTED: 'pipeline.file_import.started',
  FILE_IMPORT_COMPLETED: 'pipeline.file_import.completed',
  FILE_IMPORT_FAILED: 'pipeline.file_import.failed',

  // ウィンドウ生成イベント
  WINDOWS_GENERATION_REQUESTED: 'pipeline.windows_generation.requested',
  WINDOWS_GENERATION_STARTED: 'pipeline.windows_generation.started',
  WINDOWS_GENERATION_COMPLETED: 'pipeline.windows_generation.completed',
  WINDOWS_GENERATION_FAILED: 'pipeline.windows_generation.failed',

  // 距離行列計算イベント
  DISTANCE_CALCULATION_REQUESTED: 'pipeline.distance_calculation.requested',
  DISTANCE_CALCULATION_STARTED: 'pipeline.distance_calculation.started',
  DISTANCE_CALCULATION_COMPLETED: 'pipeline.distance_calculation.completed',
  DISTANCE_CALCULATION_FAILED: 'pipeline.distance_calculation.failed',

  // 核融合イベント
  KERNEL_FUSION_REQUESTED: 'pipeline.kernel_fusion.requested',
  KERNEL_FUSION_STARTED: 'pipeline.kernel_fusion.started',
  KERNEL_FUSION_COMPLETED: 'pipeline.kernel_fusion.completed',
  KERNEL_FUSION_FAILED: 'pipeline.kernel_fusion.failed',

  // 埋め込み生成イベント
  EMBEDDING_GENERATION_REQUESTED: 'pipeline.embedding_generation.requested',
  EMBEDDING_GENERATION_STARTED: 'pipeline.embedding_generation.started',
  EMBEDDING_GENERATION_COMPLETED: 'pipeline.embedding_generation.completed',
  EMBEDDING_GENERATION_FAILED: 'pipeline.embedding_generation.failed',

  // Neo4j保存イベント
  NEO4J_PERSISTENCE_REQUESTED: 'pipeline.neo4j_persistence.requested',
  NEO4J_PERSISTENCE_STARTED: 'pipeline.neo4j_persistence.started',
  NEO4J_PERSISTENCE_COMPLETED: 'pipeline.neo4j_persistence.completed',
  NEO4J_PERSISTENCE_FAILED: 'pipeline.neo4j_persistence.failed',

  // エクスポートイベント
  EXPORT_REQUESTED: 'pipeline.export.requested',
  EXPORT_STARTED: 'pipeline.export.started',
  EXPORT_COMPLETED: 'pipeline.export.completed',
  EXPORT_FAILED: 'pipeline.export.failed',

  // 通知イベント
  NOTIFICATION_SENT: 'pipeline.notification.sent',
} as const;

// Merkle DAG: event_data_types -> workflow_inputs
// イベントデータの型定義
export interface FileImportEvent {
  participantId: string;
  dataRootPath: string;
  tenantId: string;
  userId: string;
  contentHash?: string;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
}

export interface WindowsGenerationEvent {
  participantId: string;
  sessionUri: string;
  physioUri: string;
  humeCsvUris: {
    burst: string[];
    face: string[];
    language: string[];
    prosody: string[];
  };
  stats: {
    sessionEvents: number;
    physioSamples: number;
    humeRecords: number;
  };
}

export interface DistanceCalculationEvent {
  participantId: string;
  windowsUri: string;
  count: number;
  modalities: string[];
}

export interface KernelFusionEvent {
  participantId: string;
  distances: {
    burst?: string;
    face?: string;
    language?: string;
    prosody?: string;
    reactionTime: string;
    physio: string;
  };
  n: number;
  options: {
    normalization: 'trace' | 'fro';
    nonNegativeWeights: boolean;
    timeKernel?: {
      timestamps: number[];
      tau: number;
      weight: number;
    } | null;
    dimensions: number;
  };
}

export interface EmbeddingGenerationEvent {
  participantId: string;
  weights: number[];
  fusedKernelUri: string;
  embeddingUri: string;
  dims: number;
  n: number;
}

export interface Neo4jPersistenceEvent {
  participantId: string;
  windows: Array<{
    word: string;
    start: number;
    end: number;
    reactionTimeMs: number | null;
    physioAggregation?: Record<string, number>;
    humeAggregation?: Record<string, Record<string, number>>;
  }>;
  embeddings: number[][];
  fusionResults: {
    weights: number[];
    embedding: number[][];
    eigenValues: number[];
  };
  metadata: {
    nodes: number;
    relationships: number;
  };
}

export interface ExportEvent {
  participantId: string;
  visualization: {
    points: Array<{
      x: number;
      y: number;
      z?: number;
      word: string;
      index: number;
    }>;
    method: string;
    dimensions: number;
  };
  distanceMatrices: Record<string, number[][]>;
  fusion: {
    weights: number[];
  };
  exports: string[];
}

// Merkle DAG: workflow_function_types -> workflow_signatures
// ワークフロー関数の型定義
export type FileImportWorkflow = (event: FileImportEvent) => Promise<void>;
export type WindowsGenerationWorkflow = (event: WindowsGenerationEvent) => Promise<void>;
export type DistanceCalculationWorkflow = (event: DistanceCalculationEvent) => Promise<void>;
export type KernelFusionWorkflow = (event: KernelFusionEvent) => Promise<void>;
export type EmbeddingGenerationWorkflow = (event: EmbeddingGenerationEvent) => Promise<void>;
export type Neo4jPersistenceWorkflow = (event: Neo4jPersistenceEvent) => Promise<void>;
export type ExportWorkflow = (event: ExportEvent) => Promise<void>;
