import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const GET_PARTICIPANT_QUERY = gql`
  query GetParticipant($id: ID!) {
    participant(id: $id)
  }
`;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participantId = params.id;
    console.log(`API: Fetching participant ${participantId} from GraphQL...`)
    const client = getClient();

    const { data } = await client.query({
        query: GET_PARTICIPANT_QUERY,
        variables: { id: participantId },
    });
    
    const participant = JSON.parse(data.participant);

    return NextResponse.json(participant)
  } catch (error) {
    console.error(`API: Failed to fetch participant ${params.id}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch participant', details: (error as Error).message },
      { status: 500 }
    )
  }
}
