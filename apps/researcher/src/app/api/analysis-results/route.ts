import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const ANALYSIS_RESULTS_QUERY = gql`
  query AnalysisResults($participantId: String) {
    analysisResults(participantId: $participantId)
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')
    const client = getClient();

    const { data } = await client.query({
        query: ANALYSIS_RESULTS_QUERY,
        variables: { participantId },
    });

    const results = JSON.parse(data.analysisResults);

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to fetch analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis results' },
      { status: 500 }
    )
  }
}