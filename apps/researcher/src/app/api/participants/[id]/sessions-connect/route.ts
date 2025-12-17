// Merkle DAG: participants.sessions.connect.endpoint
// 参加者のセッション一覧取得APIエンドポイント（Connect RPC版）
// Connect RPC経由でデータを取得

import { NextRequest, NextResponse } from 'next/server';
import { sessionClient } from '@/lib/connect/client';
import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params);
    const participantId = resolvedParams.id;

    if (!participantId) {
      console.error('[SESSIONS CONNECT API] Missing participantId parameter');
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    console.log(`[SESSIONS CONNECT API] Fetching sessions for participant: ${participantId}`);

    // Call Connect RPC service
    const rpcRequest: GetSessionsRequest = { participantId };
    const response = await sessionClient.getSessions(rpcRequest);

    console.log(`[SESSIONS CONNECT API] Query completed, sessions count: ${response.sessions?.length || 0}`);

    // Transform Connect RPC response to API response format
    const sessions = (response.sessions || []).map((session) => {
      // Parse createdAt timestamp
      const createdAt = session.createdAt?.seconds
        ? new Date(session.createdAt.seconds * 1000).toISOString()
        : null;

      // startTs and endTs are already in milliseconds (BIGINT)
      const startTs = session.startTs ?? null;
      const endTs = session.endTs ?? null;

      return {
        id: session.id || '',
        sessionIndex: session.sessionIndex ?? null,
        createdAt,
        startTs,
        endTs,
      };
    });

    // Sort by created_at DESC (most recent first)
    sessions.sort((a: any, b: any) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`[SESSIONS CONNECT API] Returning ${sessions.length} sessions`);

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('[SESSIONS CONNECT API] Error fetching sessions:', error);
    console.error('[SESSIONS CONNECT API] Error stack:', error.stack);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to fetch sessions: ${errorMessage}`, details: error.stack },
      { status: 500 }
    );
  }
}
