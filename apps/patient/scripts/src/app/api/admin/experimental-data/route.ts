import { NextRequest, NextResponse } from "next/server";
import { arangodb } from "scripts/src/lib/supabase";
import { parseWordResponsesFromEvents, getParticipantStatistics } from "scripts/src/lib/data-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // ArangoDBから参加者データを取得（暫定：モックデータ）
        const participantsData = []; // TODO: Implement ArangoDB query
        const participantStats = getParticipantStatistics(participantsData || []);

        // Transform to match expected format
        const formattedParticipants = (participantsData || []).map((p: any) => ({
          id: p.id,
          age: null, // Age not available in current data
          gender: null, // Gender not available in current data
          handedness: null, // Handedness not available in current data
          createdAt: p.agreed_at,
          sessionCount: p.sessions?.length || 0,
          lastActivity: p.updated_at || p.created_at,
          status: (p.sessions?.length || 0) > 0 ? 'completed' : 'in_progress',
          hasVideoFiles: (p.video_files?.length || 0) > 0,
          videoFiles: p.video_files || []
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

        // ArangoDBから参加者データを取得（暫定：モックデータ）
        const participant = null; // TODO: Implement ArangoDB query

        if (!participant) {
          return NextResponse.json({
            error: "Participant not found"
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            id: participantId,
            signature: "mock",
            agreedAt: new Date().toISOString(),
            hasSessionData: false,
            hasVideoFiles: false,
            videoFiles: []
          }
        });

      case 'sessions':
        // ArangoDBからセッションデータを取得（暫定：モックデータ）
        const sessionsData = []; // TODO: Implement ArangoDB query

        // Transform session data to match expected format
        const formattedSessions = (sessionsData || []).map((session: any) => {
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
            participantId: session.participant_id,
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
        // ArangoDBからデータを取得（暫定：モックデータ）
        const participants = []; // TODO: Implement ArangoDB query

        const stats = getParticipantStatistics(participants || []);

        // Calculate reaction time statistics from ArangoDB data
        let totalReactionTime = 0;
        let totalResponses = 0;

        (participants || []).forEach((participant: any) => {
          (participant.sessions || []).forEach((session: any) => {
            const wordResponses = parseWordResponsesFromEvents(session.events || []);
            wordResponses.forEach((response: any) => {
              totalReactionTime += response.reactionTimeMs;
              totalResponses += 1;
            });
          });
        });

        const averageReactionTime = totalResponses > 0 ? totalReactionTime / totalResponses : 0;

        // ArangoDBから感情統計を取得（暫定：モックデータ）
        const emotionDistribution: Record<string, number> = {}; // TODO: Implement ArangoDB query

        const totalSessions = (participants || []).reduce((acc: number, p: any) =>
          acc + (p.sessions?.length || 0), 0);

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
        // ArangoDBからreaction timeデータを取得（暫定：モックデータ）
        const sessions = []; // TODO: Implement ArangoDB query

        const reactionTimeData = (sessions || []).flatMap((session: any) => {
          const wordResponses = parseWordResponsesFromEvents(session.events || []);

          return wordResponses.map((response: any) => ({
            participantId: session.participant_id,
            sessionType: 'session-1', // Simplified
            stimulusWord: response.stimulusWord,
            responseWord: response.responseWord,
            reactionTimeMs: response.reactionTimeMs,
            isDelayed: response.isDelayed,
            timestamp: new Date(response.timestamp).toISOString()
          }));
        });

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
