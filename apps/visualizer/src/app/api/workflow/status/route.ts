import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // ワークフローのステータス情報を返す
    const workflowStatus = {
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalParticipants: 12,
        activeSessions: 8,
        completedAnalyses: 5
      },
      nodes: [
        {
          id: 'participants',
          status: 'completed',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'consent',
          status: 'completed',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'sessions',
          status: 'running',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'video-files',
          status: 'pending',
          lastUpdated: null
        },
        {
          id: 'hume-analysis',
          status: 'pending',
          lastUpdated: null
        },
        {
          id: 'physiological-data',
          status: 'pending',
          lastUpdated: null
        },
        {
          id: 'kawasaki-model',
          status: 'pending',
          lastUpdated: null
        },
        {
          id: 'results',
          status: 'pending',
          lastUpdated: null
        }
      ]
    }

    return NextResponse.json(workflowStatus)
  } catch (error) {
    console.error('Failed to fetch workflow status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow status' },
      { status: 500 }
    )
  }
}
