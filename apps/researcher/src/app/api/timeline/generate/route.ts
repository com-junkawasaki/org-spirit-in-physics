// Merkle DAG: api.timeline.generate -> batch_integration_endpoint
// 統合処理を実行してTimelineIntegrationPointノードを作成するバッチ処理API
// 依存関係: timeline-batch-processor
// BPMN: TimelineIntegrationBatchProcess

import { NextRequest, NextResponse } from 'next/server';
import { generateTimelinePoints } from '@/lib/timeline-batch-processor';

export async function POST(request: NextRequest) {
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

    const result = await generateTimelinePoints(participantId, sessionId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Batch integration failed',
          details: process.env.NODE_ENV === 'development' ? {
            participantId: result.participantId,
            sessionId: result.sessionId,
          } : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
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

