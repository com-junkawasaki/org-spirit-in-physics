import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const DASHBOARD_STATS_QUERY = gql`
  query DashboardStats {
    dashboardStats
  }
`;

export async function GET(request: NextRequest) {
  try {
    const client = getClient();
    const { data } = await client.query({ query: DASHBOARD_STATS_QUERY });
    const stats = JSON.parse(data.dashboardStats);

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard stats',
        totalParticipants: 0,
        totalSessions: 0,
        totalResponses: 0,
        averageSpiritProbability: 0,
        emotionDistribution: {},
        componentAverages: {
          word2vec: 0,
          reaction_time: 0,
          skin_potential: 0,
          emotion: 0
        }
      },
      { status: 500 }
    )
  }
}
