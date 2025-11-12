import { NextRequest, NextResponse } from "next/server";
import { parseWordResponsesFromEvents, getParticipantStatistics, loadAllSessionData } from "scripts/src/lib/data-loader";
import { neo4jManager } from "scripts/src/lib/database/neo4j-manager";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // Neo4jから参加者データを取得
        const neo4jParticipants = await neo4jManager.getAllParticipants();

        // Convert to data-loader Participant format
        const participantsData: import("scripts/src/lib/data-loader").Participant[] = neo4jParticipants.map(p => ({
          id: p.id,
          signature: p.signature || "unknown",
          agreedAt: p.agreedAt || new Date(),
          agreements: p.agreements || {},
          hasSessionData: p.hasSessionData || false,
          hasVideoFiles: p.hasVideoFiles || false,
          videoFiles: p.videoFiles || []
        }));

        const participantStats = getParticipantStatistics(participantsData);

        // Transform to match expected format
        const formattedParticipants = (participantsData || []).map((p: any) => ({
          id: p.id,
          age: p.age,
          gender: p.gender,
          handedness: p.handedness,
          createdAt: p.agreedAt || p.createdAt,
          sessionCount: p.sessionCount || 0,
          lastActivity: p.agreedAt || p.createdAt,
          status: (p.sessionCount || 0) > 0 ? 'completed' : 'in_progress',
          hasVideoFiles: p.hasVideoFiles || false,
          videoFiles: p.videoFiles || []
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

        // Neo4jから参加者データを取得
        const participant = await neo4jManager.getParticipant(participantId);

        if (!participant) {
          return NextResponse.json({
            error: "Participant not found"
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            id: participantId,
            signature: participant.signature || "unknown",
            agreedAt: participant.agreedAt || new Date().toISOString(),
            hasSessionData: participant.hasSessionData || false,
            hasVideoFiles: participant.hasVideoFiles || false,
            videoFiles: participant.videoFiles || []
          }
        });

      case 'sessions':
        // Neo4jからセッションデータを取得
        const sessionsData = await loadAllSessionData();

        // Transform session data to match expected format
        const formattedSessions = (sessionsData || []).map((record: any) => {
          const session = record.sessionData;
          const wordResponses = parseWordResponsesFromEvents(session.events || []);

          // Extract session start/end times from events
          const sessionStartedEvent = (session.events || []).find((e: any) => e.type === 'session_started');
          const sessionStartTime = sessionStartedEvent
            ? new Date(sessionStartedEvent.timestamp).toISOString()
            : new Date().toISOString();

          const sessionEndedEvent = (session.events || [])
            .filter((e: any) => e.type === 'response_window_closed')
            .pop();
          const sessionEndTime = sessionEndedEvent
            ? new Date(sessionEndedEvent.timestamp).toISOString()
            : sessionStartTime;

          return {
            participantId: record.participantId,
            sessionId: session.participantId, // Using participantId as sessionId for now
            sessionType: session.participantId,
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
        // Neo4jからデータを取得
        const analyticsNeo4jParticipants = await neo4jManager.getAllParticipants();

        // Convert to data-loader Participant format
        const participants: import("scripts/src/lib/data-loader").Participant[] = analyticsNeo4jParticipants.map(p => ({
          id: p.id,
          signature: p.signature || "unknown",
          agreedAt: p.agreedAt || new Date(),
          agreements: p.agreements || {},
          hasSessionData: p.hasSessionData || false,
          hasVideoFiles: p.hasVideoFiles || false,
          videoFiles: p.videoFiles || []
        }));

        const stats = getParticipantStatistics(participants);

        // Calculate reaction time statistics from Neo4j data
        let totalReactionTime = 0;
        let totalResponses = 0;

        // Get sessions data for reaction time calculation
        const analyticsSessionsData = await loadAllSessionData();
        analyticsSessionsData.forEach((sessionRecord: any) => {
          const wordResponses = parseWordResponsesFromEvents(sessionRecord.sessionData.events || []);
          wordResponses.forEach((response: any) => {
            totalReactionTime += response.reactionTimeMs;
            totalResponses += 1;
          });
        });

        const averageReactionTime = totalResponses > 0 ? totalReactionTime / totalResponses : 0;

        // Neo4jから感情統計を取得
        const emotionStats = await neo4jManager.getEmotionStatistics();
        const emotionDistribution: Record<string, number> = {};
        emotionStats.dominantEmotions.forEach((item: any) => {
          emotionDistribution[item.emotion] = item.count;
        });

        const totalSessions = participants.reduce((acc: number, p: any) =>
          acc + (p.sessionCount || 0), 0);

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
        // Neo4jからreaction timeデータを取得
        const reactionTimeSessionsData = await loadAllSessionData();
        const reactionTimeData: any[] = [];

        reactionTimeSessionsData.forEach((sessionRecord: any) => {
          const wordResponses = parseWordResponsesFromEvents(sessionRecord.sessionData.events || []);
          wordResponses.forEach((response: any) => {
            reactionTimeData.push({
              participantId: sessionRecord.participantId,
              sessionType: sessionRecord.participantId, // Using participantId as sessionType
              stimulusWord: response.stimulusWord,
              responseWord: response.responseWord,
              reactionTimeMs: response.reactionTimeMs,
              isDelayed: response.isDelayed,
              timestamp: response.timestamp
            });
          });
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
