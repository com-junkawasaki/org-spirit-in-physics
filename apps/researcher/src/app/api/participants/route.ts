import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const GET_PARTICIPANTS_QUERY = gql`
  query GetParticipants {
    participants
  }
`;

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants from GraphQL...')
    const client = getClient();
    
    const { data } = await client.query({ query: GET_PARTICIPANTS_QUERY });
    const participants = JSON.parse(data.participants);

    return NextResponse.json(participants)
  } catch (error) {
    console.error('API: Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants', details: (error as Error).message },
      { status: 500 }
    )
  }
}
