import { NextRequest, NextResponse } from 'next/server';
import { getParticipantData } from '@/lib/researcher/data';

export async function GET(
  _request: NextRequest,
  { params }: { params: { participantId: string } }
) {
  const participantId = params.participantId;
  
  if (!participantId) {
    return NextResponse.json(
      { error: 'Participant ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const participant = await getParticipantData(participantId);
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Transform to match ParticipantOverview expected format
    return NextResponse.json({
      id: participant.id,
      name: participant.name || `参加者 ${participant.id.slice(0, 8)}`,
      sessionCount: participant.sessionCount || 0,
      responseCount: participant.responseCount || 0,
      averageSpiritProbability: participant.averageSpiritProbability || 0,
      lastActivity: participant.lastActivity 
        ? new Date(participant.lastActivity).toISOString() 
        : new Date().toISOString(),
      hasConsent: true,
      hasVideoFiles: false,
      hasHumeData: false
    });
  } catch (error) {
    console.error(`[API /api/participants/${participantId}] Error:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch participant',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
