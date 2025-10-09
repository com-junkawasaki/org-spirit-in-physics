import { NextRequest, NextResponse } from "next/server";
// import { supabase } from "scripts/src/lib/supabase"; // Temporarily disabled
import { parseWordResponsesFromEvents, getParticipantStatistics } from "scripts/src/lib/data-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // TODO: Replace with actual data fetching - temporarily returning mock data
        const mockParticipants = [
          {
            id: 'mock-1',
            age: null,
            gender: null,
            handedness: null,
            createdAt: new Date().toISOString(),
            sessionCount: 1,
            lastActivity: new Date().toISOString(),
            status: 'completed',
            hasVideoFiles: true,
            videoFiles: []
          }
        ];

        const participantStats = getParticipantStatistics([]);

        return NextResponse.json({
          success: true,
          data: mockParticipants,
          total: mockParticipants.length,
          stats: participantStats
        });

      case 'participant':
        if (!participantId) {
          return NextResponse.json({
            error: "Participant ID is required"
          }, { status: 400 });
        }

        // TODO: Replace with actual data fetching
        return NextResponse.json({
          success: true,
          data: {
            id: participantId,
            signature: 'mock-signature',
            agreedAt: new Date().toISOString(),
            hasSessionData: true,
            hasVideoFiles: true,
            videoFiles: []
          }
        });

      case 'sessions':
        // TODO: Replace with actual data fetching
        const mockSessions = [
          {
            participantId: participantId || 'mock-1',
            sessionId: 'session-1',
            sessionType: 'session-1',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            wordResponses: [],
            averageReactionTime: 500,
            emotionData: []
          }
        ];

        return NextResponse.json({
          success: true,
          data: participantId ? mockSessions.filter(s => s.participantId === participantId) : mockSessions,
          total: mockSessions.length
        });

      case 'analytics':
        // TODO: Replace with actual data fetching
        const stats = getParticipantStatistics([]);

        return NextResponse.json({
          success: true,
          data: {
            totalParticipants: 1,
            completedSessions: 1,
            completionRate: 100,
            averageSessionDuration: 2700, // Estimated 45 minutes in seconds
            averageReactionTime: 500,
            emotionDistribution: { happy: 10, sad: 5, neutral: 15 },
            totalSessions: 1,
            participantsWithVideo: 1
          }
        });

      case 'reaction-times':
        // TODO: Replace with actual data fetching
        const mockReactionTimes = [
          {
            participantId: 'mock-1',
            sessionType: 'session-1',
            stimulusWord: 'test',
            responseWord: 'response',
            reactionTimeMs: 500,
            isDelayed: false,
            timestamp: new Date().toISOString()
          }
        ];

        return NextResponse.json({
          success: true,
          data: mockReactionTimes
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
