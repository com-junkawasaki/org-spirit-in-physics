import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from "scripts/src/lib/arangodb";
import { parseWordResponsesFromEvents, getParticipantStatistics } from "scripts/src/lib/data-loader";
import { ParticipantQueries, SessionQueries, ResponseQueries, EmotionQueries } from "scripts/src/lib/neo4j-queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // Neo4jから参加者データを取得 (Cypher Builder使用)
        const client = createNeo4jClient();
        const participantsQuery = ParticipantQueries.getAllParticipants();
        const participantsData = await client.query(participantsQuery);
        const participantStats = getParticipantStatistics(participantsData || []);

        // Transform to match expected format
        const formattedParticipants = (participantsData || []).map((p: any) => ({
          id: p.id,
          age: null, // Age not available in current data
          gender: null, // Gender not available in current data
          handedness: null, // Handedness not available in current data
          createdAt: p.agreedAt || p.createdAt,
          sessionCount: p.sessionCount || 0,
          lastActivity: p.agreedAt || p.createdAt,
          status: (p.sessionCount || 0) > 0 ? 'completed' : 'in_progress',
          hasVideoFiles: false, // TODO: Implement video file checking
          videoFiles: []
        }));

        return NextResponse.json({
          success: true,
          data: formattedParticipants,
          total: formattedParticipants.length,
          stats: participantStats
        });

      case 'participant':
        if (!participantId) {
          return NextResponse.json({
            error: "Participant ID is required"
          }, { status: 400 });
        }

        // Neo4jから参加者データを取得 (Cypher Builder使用)
        const client = createNeo4jClient();
        const participantQuery = ParticipantQueries.getParticipant(participantId);
        const participantData = await client.query(participantQuery);

        if (!participantData || participantData.length === 0) {
          return NextResponse.json({
            error: "Participant not found"
          }, { status: 404 });
        }

        const participant = participantData[0].p;
        return NextResponse.json({
          success: true,
          data: {
            id: participantId,
            signature: participant.signature || "unknown",
            agreedAt: participant.agreedAt || new Date().toISOString(),
            hasSessionData: false, // TODO: Implement session data checking
            hasVideoFiles: false, // TODO: Implement video file checking
            videoFiles: []
          }
        });

      case 'sessions':
        // Neo4jからセッションデータを取得 (Cypher Builder使用)
        const client = createNeo4jClient();
        const sessionsQuery = ParticipantQueries.getAllSessions();
        const sessionsData = await client.query(sessionsQuery);

        // Transform session data to match expected format
        const formattedSessions = (sessionsData || []).map((record: any) => {
          const session = record.s;
          const wordResponses = parseWordResponsesFromEvents(session.events || []);

          // Extract session start/end times from events
          const sessionStartedEvent = (session.events || []).find((e: any) => e.type === 'session_started');
          const sessionStartTime = sessionStartedEvent
            ? new Date(sessionStartedEvent.timestamp).toISOString()
            : session.created_at;

          const sessionEndedEvent = (session.events || [])
            .filter((e: any) => e.type === 'response_window_closed')
            .pop();
          const sessionEndTime = sessionEndedEvent
            ? new Date(sessionEndedEvent.timestamp).toISOString()
            : sessionStartTime;

          return {
            participantId: record.participant_id,
            sessionId: session.id,
            sessionType: session.id,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            wordResponses,
            averageReactionTime: wordResponses.length > 0
              ? wordResponses.reduce((acc: any, r: any) => acc + r.reactionTimeMs, 0) / wordResponses.length
              : 0,
            emotionData: [] // Emotion data will be fetched separately if needed
          };
        });

        return NextResponse.json({
          success: true,
          data: formattedSessions,
          total: formattedSessions.length
        });

      case 'analytics':
        // Neo4jからデータを取得 (Cypher Builder使用)
        const client = createNeo4jClient();
        const participantsQuery = ParticipantQueries.getAllParticipants();
        const participantsData = await client.query(participantsQuery);
        const participants = participantsData || [];

        const stats = getParticipantStatistics(participants);

        // Calculate reaction time statistics from Neo4j data
        let totalReactionTime = 0;
        let totalResponses = 0;

        participants.forEach((participant: any) => {
          // For now, calculate from session data if available
          // TODO: Implement proper reaction time calculation from Neo4j
        });

        const averageReactionTime = totalResponses > 0 ? totalReactionTime / totalResponses : 0;

        // Neo4jから感情統計を取得 (Cypher Builder使用)
        const emotionQuery = EmotionQueries.getEmotionStatistics();
        const emotionData = await client.query(emotionQuery);
        const emotionDistribution: Record<string, number> = {};

        (emotionData || []).forEach((record: any) => {
          const emotion = record.emotion;
          if (emotion) {
            emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + 1;
          }
        });

        const totalSessions = participants.reduce((acc: number, p: any) =>
          acc + (p.session_count || 0), 0);

        return NextResponse.json({
          success: true,
          data: {
            totalParticipants: stats.totalParticipants,
            completedSessions: stats.participantsWithSessionData,
            completionRate: stats.completionRate,
            averageSessionDuration: 2700, // Estimated 45 minutes in seconds
            averageReactionTime,
            emotionDistribution,
            totalSessions,
            participantsWithVideo: stats.participantsWithVideo
          }
        });

      case 'reaction-times':
        // Neo4jからreaction timeデータを取得 (Cypher Builder使用)
        const client = createNeo4jClient();
        const reactionTimeQuery = ResponseQueries.getAllResponsesForReactionTimes();
        const responseData = await client.query(reactionTimeQuery);

        const reactionTimeData = (responseData || []).map((record: any) => ({
          participantId: record.participant_id,
          sessionType: record.session_id,
          stimulusWord: record.stimulus_word,
          responseWord: record.response_word,
          reactionTimeMs: record.reaction_time_ms || 0,
          isDelayed: (record.reaction_time_ms || 0) > 3000, // 3秒以上を遅延とみなす
          timestamp: record.event_ts ? new Date(record.event_ts).toISOString() : new Date().toISOString()
        }));

        return NextResponse.json({
          success: true,
          data: reactionTimeData
        });

      default:
        return NextResponse.json({
          error: "Invalid type parameter. Use: participants, participant, sessions, analytics, reaction-times"
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching experimental data:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
