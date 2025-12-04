import type { APIRoute } from 'astro';
import {
  loadAllParticipants,
  loadAllSessionData,
  parseWordResponsesFromEvents,
  getParticipantStatistics,
  initializeDatabase
} from '../../../../lib/participant/data-loader';
import { getEmotionStatisticsFromGraphQL } from '../../../../lib/participant/emotion-analysis';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const searchParams = url.searchParams;
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // PostgreSQL/TimescaleDBデータベースの初期化（GraphQLサービス経由）
        await initializeDatabase();
        const participants = await loadAllParticipants();
        const participantStats = getParticipantStatistics(participants);

        // Transform to match expected format
        const formattedParticipants = participants.map(p => ({
          id: p.id,
          age: null, // Age not available in current data
          gender: null, // Gender not available in current data
          handedness: null, // Handedness not available in current data
          createdAt: p.agreedAt,
          sessionCount: p.hasSessionData ? 1 : 0, // Simplified
          lastActivity: p.agreedAt,
          status: p.hasSessionData ? 'completed' : 'in_progress',
          hasVideoFiles: p.hasVideoFiles,
          videoFiles: p.videoFiles
        }));

        return new Response(
          JSON.stringify({
            success: true,
            data: formattedParticipants,
            total: formattedParticipants.length,
            stats: participantStats
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'participant':
        if (!participantId) {
          return new Response(
            JSON.stringify({
              error: 'Participant ID is required'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const participants_list = await loadAllParticipants();
        const participant = participants_list.find(p => p.id === participantId);
        if (!participant) {
          return new Response(
            JSON.stringify({
              error: 'Participant not found'
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: participant.id,
              signature: participant.signature,
              agreedAt: participant.agreedAt,
              hasSessionData: participant.hasSessionData,
              hasVideoFiles: participant.hasVideoFiles,
              videoFiles: participant.videoFiles
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'sessions':
        const allSessionData = await loadAllSessionData();
        const sessions = participantId
          ? allSessionData.filter(s => s.participantId === participantId)
          : allSessionData;

        // Transform session data to match expected format
        const formattedSessions = sessions.map(({ participantId, sessionData }) => {
          const wordResponses = parseWordResponsesFromEvents(sessionData.events);

          // Extract session start/end times from events
          const sessionStartedEvent = sessionData.events.find(e => e.type === 'session_started');
          const sessionStartTime = sessionStartedEvent
            ? new Date(sessionStartedEvent.timestamp).toISOString()
            : new Date().toISOString();

          const sessionEndedEvent = sessionData.events
            .filter(e => e.type === 'response_window_closed')
            .pop();
          const sessionEndTime = sessionEndedEvent
            ? new Date(sessionEndedEvent.timestamp).toISOString()
            : sessionStartTime;

          return {
            participantId,
            sessionId: `session-${sessionStartedEvent?.payload?.session || 1}`,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            wordCount: wordResponses.length,
            wordResponses: wordResponses.slice(0, 10), // Limit to first 10 for preview
            totalWords: wordResponses.length
          };
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: formattedSessions,
            total: formattedSessions.length
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid type parameter. Must be "participants", "participant", or "sessions"'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in experimental-data API:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

