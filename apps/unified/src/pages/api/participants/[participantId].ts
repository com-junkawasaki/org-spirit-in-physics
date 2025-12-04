import type { APIRoute } from 'astro';
import { getParticipantData } from '../../../lib/researcher/data';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const participantId = params.participantId;
  
  if (!participantId) {
    return new Response(
      JSON.stringify({ error: 'Participant ID is required' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  try {
    const participant = await getParticipantData(participantId);
    
    if (!participant) {
      return new Response(
        JSON.stringify({ error: 'Participant not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Transform to match ParticipantOverview expected format
    return new Response(
      JSON.stringify({
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
      }),
      { 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error(`[API /api/participants/${participantId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch participant',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

