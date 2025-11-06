import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const IMPORT_ANALYSIS_RESULTS_MUTATION = gql`
  mutation ImportAnalysisResults($results: [AnalysisResultInput!]!, $participantId: String) {
    importAnalysisResults(results: $results, participantId: $participantId)
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { results, participantId } = body

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Results array is required' },
        { status: 400 }
      )
    }

    const client = getClient();
    const { data } = await client.mutate({
        mutation: IMPORT_ANALYSIS_RESULTS_MUTATION,
        variables: { results, participantId },
    });

    const resultData = JSON.parse(data.importAnalysisResults);

    return NextResponse.json(resultData)

  } catch (error) {
    console.error('Failed to import analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to import analysis results', details: (error as Error).message },
      { status: 500 }
    )
  }
}
