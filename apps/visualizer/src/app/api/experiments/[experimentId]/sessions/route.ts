// Merkle DAG: experiment_sessions_api -> experiment_sessions_endpoints
// 実験セッションAPIエンドポイント - Next.js API Routesでの公開

import { NextRequest, NextResponse } from 'next/server'
import { getSessionManager } from '@/lib/session-manager'

interface RouteParams {
  params: {
    experimentId: string
  }
}

// GET /api/experiments/[experimentId]/sessions - 実験セッション一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const participantId = searchParams.get('participantId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessionManager = getSessionManager()
    let sessions = await sessionManager.getExperimentSessions(experimentId)

    // フィルタリング
    if (status && status !== 'all') {
      sessions = sessions.filter(session => session.status === status)
    }

    if (participantId) {
      sessions = sessions.filter(session => session.participantId === participantId)
    }

    // ページネーション
    const paginatedSessions = sessions.slice(offset, offset + limit)

    return NextResponse.json({
      sessions: paginatedSessions,
      pagination: {
        total: sessions.length,
        limit,
        offset,
        hasMore: offset + limit < sessions.length
      }
    })
  } catch (error) {
    console.error('Failed to fetch experiment sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch experiment sessions' },
      { status: 500 }
    )
  }
}

// POST /api/experiments/[experimentId]/sessions - 新規セッション作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const body = await request.json()
    const { participantId, sessionType = 'Word Association Test' } = body

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    const sessionManager = getSessionManager()
    
    const sessionData = {
      experimentId,
      participantId,
      sessionType,
      startTime: new Date().toISOString(),
      status: 'pending' as const
    }

    const sessionId = await sessionManager.createSession(sessionData)

    return NextResponse.json({
      id: sessionId,
      experimentId,
      participantId,
      sessionType,
      startTime: sessionData.startTime,
      status: 'pending'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
