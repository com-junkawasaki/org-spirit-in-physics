import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/client";
import { gql } from "@apollo/client";

const PARTICIPANTS_QUERY = gql`
    query Participants {
        participants
    }
`;
const SESSIONS_QUERY = gql`
    query Sessions($participantId: String) {
        sessions(participantId: $participantId)
    }
`;
const ANALYTICS_QUERY = gql`
    query Analytics {
        analytics
    }
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const participantId = searchParams.get('participantId');
  const client = getClient();

  try {
    let query;
    let variables = {};
    let dataKey = '';

    switch (type) {
      case 'participants':
        query = PARTICIPANTS_QUERY;
        dataKey = 'participants';
        break;
      case 'sessions':
        query = SESSIONS_QUERY;
        variables = { participantId };
        dataKey = 'sessions';
        break;
      case 'analytics':
        query = ANALYTICS_QUERY;
        dataKey = 'analytics';
        break;
      default:
        return NextResponse.json({ error: "Invalid type parameter." }, { status: 400 });
    }

    const { data } = await client.query({ query, variables });
    const result = JSON.parse(data[dataKey]);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching experimental data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
