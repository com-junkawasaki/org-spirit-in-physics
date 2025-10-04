import { NextRequest, NextResponse } from "next/server";
import { supabase } from "scripts/src/lib/supabase";
import { parseWordResponsesFromEvents, getParticipantStatistics } from "scripts/src/lib/data-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');

  try {
    switch (type) {
      case 'participants':
        // Supabaseから参加者データを取得
        const { data: participantsData, error: supabaseError } = await supabase
          .from('participants')
          .select(`
            *,
            sessions (
              id
            ),
            video_files (
              id,
              file_name,
              file_path,
              file_size
            )
          `)
          .order('created_at', { ascending: false });

        if (supabaseError) {
          console.error('Error fetching participants:', supabaseError);
          return NextResponse.json({
            error: "Failed to fetch participants"
          }, { status: 500 });
        }

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

        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select(`
            *,
            sessions (
              id
            ),
            video_files (
              id,
              file_name,
              file_path,
              file_size
            )
          `)
          .eq('id', participantId)
          .single();

        if (participantError) {
          console.error('Error fetching participant:', participantError);
          return NextResponse.json({
            error: "Participant not found"
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            id: participant.id,
            signature: participant.signature,
            agreedAt: participant.agreed_at,
            hasSessionData: (participant.sessions?.length || 0) > 0,
            hasVideoFiles: (participant.video_files?.length || 0) > 0,
            videoFiles: participant.video_files || []
          }
        });

      case 'sessions':
        let query = supabase
          .from('sessions')
          .select(`
            *,
            participants (
              signature
            )
          `)
          .order('created_at', { ascending: false });

        if (participantId) {
          query = query.eq('participant_id', participantId);
        }

        const { data: sessionsData, error: sessionsError } = await query;

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError);
          return NextResponse.json({
            error: "Failed to fetch sessions"
          }, { status: 500 });
        }

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
        // Supabaseからデータを取得
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select(`
            *,
            sessions (
              id,
              events
            ),
            video_files (
              id
            )
          `);

        if (participantsError) {
          console.error('Error fetching analytics data:', participantsError);
          return NextResponse.json({
            error: "Failed to fetch analytics data"
          }, { status: 500 });
        }

        const stats = getParticipantStatistics(participants || []);

        // Calculate reaction time statistics from Supabase data
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

        // Supabaseから感情統計を取得
        const { data: emotions, error: emotionsError } = await supabase
          .from('emotions')
          .select('name');

        let emotionDistribution: Record<string, number> = {};
        if (!emotionsError && emotions) {
          emotionDistribution = emotions.reduce((acc: Record<string, number>, emotion: any) => {
            acc[emotion.name] = (acc[emotion.name] || 0) + 1;
            return acc;
          }, {});
        }

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
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('participant_id, events')
          .not('events', 'is', null);

        if (error) {
          console.error('Error fetching reaction time data:', error);
          return NextResponse.json({
            error: "Failed to fetch reaction time data"
          }, { status: 500 });
        }

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
