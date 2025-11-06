import { NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const ANALYSIS_REPORT_QUERY = gql`
  query AnalysisReport {
    analysisReport
  }
`;

export async function GET() {
  try {
    console.log('API: Generating analysis report from GraphQL...')
    const client = getClient();

    const { data } = await client.query({
        query: ANALYSIS_REPORT_QUERY,
    });
    
    const reportData = JSON.parse(data.analysisReport);

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating analysis report:', error)
    return NextResponse.json({ error: 'Failed to generate analysis report' }, { status: 500 })
  }
}
