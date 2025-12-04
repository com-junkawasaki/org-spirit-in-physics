import type { APIRoute } from 'astro';
import { getAllParticipants, getParticipantData } from '../../../lib/researcher/data';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const participantId = url.searchParams.get('id');
    
    if (participantId) {
      // Get single participant
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
    } else {
      // Get all participants
      const participants = await getAllParticipants();
      
      // Transform to match ParticipantOverview expected format
      const formattedParticipants = participants.map(p => ({
        id: p.id,
        name: p.name || `参加者 ${p.id.slice(0, 8)}`,
        session_count: p.sessionCount || 0,
        total_responses: p.responseCount || 0,
        average_spirit_probability: p.averageSpiritProbability || 0,
        last_activity: p.lastActivity 
          ? new Date(p.lastActivity).toISOString() 
          : new Date().toISOString(),
        hasConsent: true,
        hasVideoFiles: false,
        hasHumeData: false
      }));
      
      return new Response(
        JSON.stringify(formattedParticipants),
        { 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('[API /api/participants] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch participants',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

