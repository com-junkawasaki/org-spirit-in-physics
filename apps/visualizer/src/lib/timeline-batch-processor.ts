// Merkle DAG: timeline_batch_processor -> batch_integration_logic
// 統合処理を実行してTimelineIntegrationPointノードを作成するバッチ処理ロジック
// 依存関係: neo4j client, timeline integration functions, TimelineIntegrationPointManager
// BPMN: TimelineIntegrationBatchProcess

import { createNeo4jClient } from './neo4j';
import { TimelineIntegrationPointManager } from './neo4j-timeline-manager';
import { convertIntegratedDataToTimelinePoints } from './timeline-integration-converter';
import {
  getSessionData,
  getEmotionData,
  getPhysiologicalData,
  integrateTimelineData,
} from './timeline-integration-functions';

export interface BatchProcessResult {
  success: boolean;
  participantId: string;
  sessionId: string;
  createdCount: number;
  totalTimeMs: number;
  metadata: {
    sessionEvents: number;
    emotionEntries: number;
    physiologicalEntries: number;
    timelinePoints: number;
  };
  error?: string;
}

/**
 * 統合処理を実行してTimelineIntegrationPointノードを作成するバッチ処理
 */
export async function generateTimelinePoints(
  participantId: string,
  sessionId: string
): Promise<BatchProcessResult> {
  const startTime = Date.now();

  try {
    if (!participantId) {
      throw new Error('participantId is required');
    }

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    console.log(`[TIMELINE GENERATE] ===== Batch integration started =====`);
    console.log(`[TIMELINE GENERATE] Participant: ${participantId}, Session: ${sessionId}`);

    const client = createNeo4jClient();
    const manager = new TimelineIntegrationPointManager();

    // 既存のTimelineIntegrationPointを削除
    console.log(`[TIMELINE GENERATE] Deleting existing timeline points...`);
    const deletedCount = await manager.deleteTimelinePointsBySession(sessionId);
    console.log(`[TIMELINE GENERATE] Deleted ${deletedCount} existing timeline points`);

    // データ取得
    console.log(`[TIMELINE GENERATE] Step 1/3: Fetching data...`);
    const sessionData = await getSessionData(client, participantId, sessionId);
    const emotionData = await getEmotionData(client, participantId, sessionId);
    const physiologicalData = await getPhysiologicalData(client, participantId, sessionId);
    console.log(`[TIMELINE GENERATE] ✓ Data fetched: ${sessionData.wordEvents.length} events, ${emotionData.length} emotions, ${physiologicalData.length} physiological`);

    // 統合処理
    console.log(`[TIMELINE GENERATE] Step 2/3: Integrating timeline data...`);
    const integratedData = integrateTimelineData(sessionData, emotionData, physiologicalData);
    console.log(`[TIMELINE GENERATE] ✓ Integration completed: ${integratedData.length} timeline points`);

    // TimelineIntegrationPointノード作成
    console.log(`[TIMELINE GENERATE] Step 3/3: Creating TimelineIntegrationPoint nodes...`);
    const timelinePoints = convertIntegratedDataToTimelinePoints(
      integratedData,
      participantId,
      sessionId
    );
    const createdCount = await manager.createTimelinePointsBulk(timelinePoints);
    console.log(`[TIMELINE GENERATE] ✓ Created ${createdCount} TimelineIntegrationPoint nodes`);

    const totalTime = Date.now() - startTime;
    console.log(`[TIMELINE GENERATE] ===== Batch integration completed in ${totalTime}ms =====`);

    return {
      success: true,
      participantId,
      sessionId,
      createdCount,
      totalTimeMs: totalTime,
      metadata: {
        sessionEvents: sessionData.wordEvents.length,
        emotionEntries: emotionData.length,
        physiologicalEntries: physiologicalData.length,
        timelinePoints: integratedData.length,
      }
    };
  } catch (error) {
    console.error('[TIMELINE GENERATE] ✗ Batch integration failed:', error);
    const totalTime = Date.now() - startTime;
    return {
      success: false,
      participantId,
      sessionId,
      createdCount: 0,
      totalTimeMs: totalTime,
      metadata: {
        sessionEvents: 0,
        emotionEntries: 0,
        physiologicalEntries: 0,
        timelinePoints: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Merkle DAG: timeline_batch_processor -> implementation_complete
// 統合処理バッチ処理ロジックの実装完了

