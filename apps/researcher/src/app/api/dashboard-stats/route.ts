import { NextRequest, NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const stats = await getDashboardStats()

    // Return stats as-is since they're already processed in the data layer
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
