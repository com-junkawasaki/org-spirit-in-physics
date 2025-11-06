// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/client";
import { gql } from "@apollo/client";

const ANALYZE_EMOTIONS_MUTATION = gql`
  mutation AnalyzeEmotions($participantId: String!, $videoFile: String!, $sessionType: String!) {
    analyzeEmotions(participantId: $participantId, videoFile: $videoFile, sessionType: $sessionType)
  }
`;

const EMOTION_STATISTICS_QUERY = gql`
  query EmotionStatistics($participantId: String) {
    emotionStatistics(participantId: $participantId)
  }
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const participantId = searchParams.get('participantId');

  try {
    const client = getClient();
    switch (action) {
      case 'get-results':
      case 'get-statistics':
        const { data } = await client.query({
          query: EMOTION_STATISTICS_QUERY,
          variables: { participantId },
        });
        const stats = JSON.parse(data.emotionStatistics);
        return NextResponse.json({ success: true, data: stats });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in emotion analysis:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, participantId, videoFile, sessionType } = body;
    const client = getClient();

    switch (action) {
      case 'analyze-single-workflow':
        if (!participantId || !videoFile || !sessionType) {
          return NextResponse.json({ error: "participantId, videoFile, and sessionType are required" }, { status: 400 });
        }
        const { data } = await client.mutate({
          mutation: ANALYZE_EMOTIONS_MUTATION,
          variables: { participantId, videoFile, sessionType },
        });
        return NextResponse.json({ success: true, data: JSON.parse(data.analyzeEmotions) });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in emotion analysis POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
