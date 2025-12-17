// Merkle DAG: participants.timeline.connect.endpoint
// Timeline data API endpoint using Connect RPC
// Connect RPC経由でタイムラインデータを取得

import { NextRequest, NextResponse } from 'next/server';
import { timelineClient } from '@/lib/connect/client';
import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: participantId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || undefined;
    const startTimeParam = searchParams.get('startTime');
    const endTimeParam = searchParams.get('endTime');
    const interval = searchParams.get('interval') || undefined;

    // Parse timestamps
    let startTime: Date | undefined;
    let endTime: Date | undefined;
    
    if (startTimeParam) {
      startTime = new Date(startTimeParam);
    }
    if (endTimeParam) {
      endTime = new Date(endTimeParam);
    }

    // Build Connect RPC request
    const rpcRequest: GetTimelineRequest = {
      participantId,
      sessionId,
      startTime: startTime ? { seconds: Math.floor(startTime.getTime() / 1000) } : undefined,
      endTime: endTime ? { seconds: Math.floor(endTime.getTime() / 1000) } : undefined,
      interval,
    };

    // Call Connect RPC service
    const response = await timelineClient.getTimeline(rpcRequest);

    // Transform to match GraphQL response format for compatibility
    const timelinePoints = response.points.map((point) => ({
      time: point.time?.seconds ? new Date(point.time.seconds * 1000).toISOString() : null,
      participantId: point.participantId,
      sessionId: point.sessionId,
      word: point.word || null,
      eventType: point.eventType || null,
      reactionValue: point.reactionValue || null,
      reactionTime: point.reactionTime || null,
      hasResponse: point.hasResponse,
      emotions: point.emotions.map((e) => ({
        name: e.name,
        score: e.score,
        fileType: e.fileType,
        color: e.color || null,
      })),
      physiological: point.physiological.map((p) => ({
        timestamp: p.timestamp?.seconds ? new Date(p.timestamp.seconds * 1000).toISOString() : null,
        value: p.value || null,
        metadata: p.metadata || null,
      })),
      metadata: point.metadata || {},
    }));

    return NextResponse.json({
      timeline: timelinePoints,
    });
  } catch (error: any) {
    console.error('[Timeline Connect API] Error:', error);
    return NextResponse.json(
      {
        errors: [{
          message: error.message || 'Failed to fetch timeline data',
        }],
      },
      { status: 500 }
    );
  }
}
