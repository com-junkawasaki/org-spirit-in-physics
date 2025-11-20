// Merkle DAG: Neo4jユースケース定義
// ガイドライン: トランザクション境界はユースケース単位

// import { Neo4jUseCaseExamples } from './neo4j-transaction-manager';

// ユースケース定義の拡張
export const USE_CASES = {
  // 参加者管理ユースケース
  PARTICIPANT_REGISTRATION: 'participant_registration',
  PARTICIPANT_UPDATE: 'participant_update',
  PARTICIPANT_DELETE: 'participant_delete',
  
  // 実験セッション管理ユースケース
  SESSION_START: 'experiment_session_start',
  SESSION_UPDATE: 'session_update',
  SESSION_COMPLETE: 'session_complete',
  
  // 応答データ管理ユースケース
  RESPONSE_RECORDING: 'response_recording',
  RESPONSE_BATCH_UPDATE: 'response_batch_update',
  
  // 感情分析ユースケース
  EMOTION_ANALYSIS_CREATE: 'emotion_analysis_create',
  EMOTION_ANALYSIS_BATCH: 'emotion_analysis_batch',
  
  // インポートジョブユースケース
  IMPORT_JOB_CREATE: 'import_job_create',
  IMPORT_JOB_UPDATE: 'import_job_update',
  IMPORT_JOB_COMPLETE: 'import_job_complete',
  
  // 分析実行ユースケース
  ANALYSIS_RUN_CREATE: 'analysis_run_create',
  ANALYSIS_RUN_UPDATE: 'analysis_run_update',
  ANALYSIS_RUN_COMPLETE: 'analysis_run_complete',
} as const;

// ユースケース実装の登録
export function registerUseCases(transactionManager: any) {
  // 参加者登録ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.PARTICIPANT_REGISTRATION,
    name: 'Participant Registration',
    operations: [
      {
        type: 'MERGE',
        query: `
          MERGE (p:Participant {id: $id})
          SET p += $properties
          RETURN p
        `,
        params: {
          id: '$id',
          properties: '$properties'
        }
      }
    ],
    dependencies: [],
    priority: 1
  });

  // 実験セッション開始ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.SESSION_START,
    name: 'Experiment Session Start',
    operations: [
      {
        type: 'MERGE',
        query: `
          MATCH (p:Participant {id: $participantId})
          MERGE (s:ExperimentSession {id: $sessionId})
          SET s += $sessionProperties
          MERGE (p)-[:HAS_SESSION]->(s)
          RETURN s
        `,
        params: {
          participantId: '$participantId',
          sessionId: '$sessionId',
          sessionProperties: '$sessionProperties'
        }
      }
    ],
    dependencies: [USE_CASES.PARTICIPANT_REGISTRATION],
    priority: 2
  });

  // 応答データ記録ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.RESPONSE_RECORDING,
    name: 'Response Recording',
    operations: [
      {
        type: 'MERGE',
        query: `
          MATCH (s:ExperimentSession {id: $sessionId})
          MERGE (r:Response {id: $responseId})
          SET r += $responseProperties
          MERGE (s)-[:HAS_RESPONSE]->(r)
          RETURN r
        `,
        params: {
          sessionId: '$sessionId',
          responseId: '$responseId',
          responseProperties: '$responseProperties'
        }
      },
      {
        type: 'UPDATE',
        query: `
          MATCH (s:ExperimentSession {id: $sessionId})
          SET s.completed_responses = s.completed_responses + 1,
              s.updated_at = $updatedAt
          RETURN s
        `,
        params: {
          sessionId: '$sessionId',
          updatedAt: '$updatedAt'
        }
      }
    ],
    dependencies: [USE_CASES.SESSION_START],
    priority: 3
  });

  // 感情分析バッチ処理ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.EMOTION_ANALYSIS_BATCH,
    name: 'Emotion Analysis Batch Processing',
    operations: [
      {
        type: 'CREATE',
        query: `
          UNWIND $emotionData as emotion
          CREATE (e:EmotionAnalysis)
          SET e += emotion
          RETURN count(e) as created_count
        `,
        params: {
          emotionData: '$emotionData'
        }
      }
    ],
    dependencies: [USE_CASES.RESPONSE_RECORDING],
    priority: 4
  });

  // インポートジョブ作成ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.IMPORT_JOB_CREATE,
    name: 'Import Job Creation',
    operations: [
      {
        type: 'MERGE',
        query: `
          MERGE (j:ImportJob {id: $jobId})
          SET j += $jobProperties
          RETURN j
        `,
        params: {
          jobId: '$jobId',
          jobProperties: '$jobProperties'
        }
      }
    ],
    dependencies: [],
    priority: 1
  });

  // インポートジョブ完了ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.IMPORT_JOB_COMPLETE,
    name: 'Import Job Completion',
    operations: [
      {
        type: 'UPDATE',
        query: `
          MATCH (j:ImportJob {id: $jobId})
          SET j.status = $status,
              j.progress_percentage = $progress,
              j.completed_at = $completedAt,
              j.updated_at = $updatedAt
          RETURN j
        `,
        params: {
          jobId: '$jobId',
          status: '$status',
          progress: '$progress',
          completedAt: '$completedAt',
          updatedAt: '$updatedAt'
        }
      }
    ],
    dependencies: [USE_CASES.IMPORT_JOB_CREATE],
    priority: 2
  });

  // 分析実行作成ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.ANALYSIS_RUN_CREATE,
    name: 'Analysis Run Creation',
    operations: [
      {
        type: 'MERGE',
        query: `
          MERGE (ar:AnalysisRun {id: $runId})
          SET ar += $runProperties
          RETURN ar
        `,
        params: {
          runId: '$runId',
          runProperties: '$runProperties'
        }
      }
    ],
    dependencies: [],
    priority: 1
  });

  // 分析実行更新ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.ANALYSIS_RUN_UPDATE,
    name: 'Analysis Run Update',
    operations: [
      {
        type: 'UPDATE',
        query: `
          MATCH (ar:AnalysisRun {id: $runId})
          SET ar += $updateProperties,
              ar.updated_at = $updatedAt
          RETURN ar
        `,
        params: {
          runId: '$runId',
          updateProperties: '$updateProperties',
          updatedAt: '$updatedAt'
        }
      }
    ],
    dependencies: [USE_CASES.ANALYSIS_RUN_CREATE],
    priority: 2
  });

  // 分析実行完了ユースケース
  transactionManager.registerUseCase({
    id: USE_CASES.ANALYSIS_RUN_COMPLETE,
    name: 'Analysis Run Completion',
    operations: [
      {
        type: 'UPDATE',
        query: `
          MATCH (ar:AnalysisRun {id: $runId})
          SET ar.status = $status,
              ar.progress = $progress,
              ar.completed_at = $completedAt,
              ar.updated_at = $updatedAt
          RETURN ar
        `,
        params: {
          runId: '$runId',
          status: '$status',
          progress: '$progress',
          completedAt: '$completedAt',
          updatedAt: '$updatedAt'
        }
      }
    ],
    dependencies: [USE_CASES.ANALYSIS_RUN_UPDATE],
    priority: 3
  });
}

// ユースケース実行ヘルパー関数
export class UseCaseExecutor {
  constructor(private transactionManager: any) {}

  // 参加者登録
  async registerParticipant(participantData: {
    id: string;
    age?: number;
    gender?: string;
    handedness?: string;
    consent_given?: boolean;
    consent_timestamp?: string;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.PARTICIPANT_REGISTRATION,
      {
        id: participantData.id,
        properties: {
          ...participantData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    );
  }

  // 実験セッション開始
  async startExperimentSession(sessionData: {
    sessionId: string;
    participantId: string;
    startTs: string;
    status: string;
    totalResponses?: number;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.SESSION_START,
      {
        sessionId: sessionData.sessionId,
        participantId: sessionData.participantId,
        sessionProperties: {
          ...sessionData,
          completed_responses: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    );
  }

  // 応答データ記録
  async recordResponse(responseData: {
    responseId: string;
    sessionId: string;
    participantId: string;
    stimulusWord: string;
    responseWord: string;
    reactionTimeMs?: number;
    eventTs: string;
    emotion?: string;
    emotionConfidence?: number;
    spiritProbability?: number;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.RESPONSE_RECORDING,
      {
        responseId: responseData.responseId,
        sessionId: responseData.sessionId,
        responseProperties: {
          ...responseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }
    );
  }

  // 感情分析バッチ処理
  async processEmotionAnalysisBatch(emotionData: Array<{
    id: string;
    response_id: string;
    emotion_data: Record<string, unknown>;
    confidence_score?: number;
    analysis_timestamp: string;
    source?: string;
  }>) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.EMOTION_ANALYSIS_BATCH,
      {
        emotionData: emotionData.map(emotion => ({
          ...emotion,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }
    );
  }

  // インポートジョブ作成
  async createImportJob(jobData: {
    jobId: string;
    sessionId: string;
    participantId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    progressPercentage?: number;
    errorMessage?: string;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.IMPORT_JOB_CREATE,
      {
        jobId: jobData.jobId,
        jobProperties: {
          ...jobData,
          progress_percentage: jobData.progressPercentage || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    );
  }

  // インポートジョブ完了
  async completeImportJob(jobId: string, status: 'COMPLETED' | 'FAILED', errorMessage?: string) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.IMPORT_JOB_COMPLETE,
      {
        jobId,
        status,
        progress: status === 'COMPLETED' ? 100 : 0,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage
      }
    );
  }

  // 分析実行作成
  async createAnalysisRun(runData: {
    runId: string;
    participantId: string;
    status: string;
    progress?: number;
    modelVersion?: string;
    notes?: string;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.ANALYSIS_RUN_CREATE,
      {
        runId: runData.runId,
        runProperties: {
          ...runData,
          progress: runData.progress || 0,
          model_version: runData.modelVersion || '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    );
  }

  // 分析実行更新
  async updateAnalysisRun(runId: string, updateData: {
    status?: string;
    progress?: number;
    notes?: string;
  }) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.ANALYSIS_RUN_UPDATE,
      {
        runId,
        updateProperties: updateData,
        updatedAt: new Date().toISOString()
      }
    );
  }

  // 分析実行完了
  async completeAnalysisRun(runId: string, status: 'COMPLETED' | 'FAILED', notes?: string) {
    return this.transactionManager.executeUseCaseTransaction(
      USE_CASES.ANALYSIS_RUN_COMPLETE,
      {
        runId,
        status,
        progress: status === 'COMPLETED' ? 100 : 0,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes
      }
    );
  }
}

// Merkle DAG: neo4j_use_cases -> implementation_complete
// トランザクション境界のユースケース単位最適化の実装完了
