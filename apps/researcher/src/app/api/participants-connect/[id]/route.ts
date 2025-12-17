// Merkle DAG: participants.connect.detail.endpoint
// 参加者詳細取得APIエンドポイント（Connect RPC版）

import { NextRequest, NextResponse } from 'next/server';
import { getParticipantData } from '@/lib/connect/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const participantId = resolvedParams.id;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    const participant = await getParticipantData(participantId);

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error('[Participant Connect API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participant', details: (error as Error).message },
      { status: 500 }
    );
  }
}
