// Merkle DAG: api.timeline.generate -> batch_integration_endpoint
// 統合処理を実行してTimelineIntegrationPointノードを作成するバッチ処理API
// 依存関係: neo4j client, timeline integration functions, TimelineIntegrationPointManager
// BPMN: TimelineIntegrationBatchProcess

import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { TimelineIntegrationPointManager } from '@/lib/neo4j-timeline-manager';
import { convertIntegratedDataToTimelinePoints } from '@/lib/timeline-integration-converter';
import {
  getSessionData,
  getEmotionData,
  getPhysiologicalData,
  integrateTimelineData,
} from '@/lib/timeline-integration-functions';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { participantId, sessionId } = body;

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: 'participantId is required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('[TIMELINE GENERATE] ✗ Batch integration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined,
        } : undefined
      },
      { status: 500 }
    );
  }
}

// Merkle DAG: api.timeline.generate -> implementation_complete
// 統合処理バッチAPIエンドポイントの実装完了

