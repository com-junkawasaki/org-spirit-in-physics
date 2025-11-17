// Merkle DAG: participants.sessions.endpoint
// 参加者のセッション一覧取得APIエンドポイント
// GraphQL経由でデータを取得

import { NextRequest, NextResponse } from 'next/server'
import { graphqlClient, GetSessionsDocument } from '@/lib/graphql/client'
import type { GetSessionsQueryResult } from '@/generated/graphql'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = await Promise.resolve(params)
    const participantId = resolvedParams.id

    if (!participantId) {
      console.error('[SESSIONS API] Missing participantId parameter')
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    console.log(`[SESSIONS API] Fetching sessions for participant: ${participantId}`)
    console.log(`[SESSIONS API] GraphQL API URL: ${process.env.GRAPHQL_API_URL || 'not set'}`)

    // Query GraphQL service for sessions
    let data: GetSessionsQueryResult
    try {
      data = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId })
    } catch (graphqlError: any) {
      console.error('[SESSIONS API] GraphQL request failed:', graphqlError)
      // Re-throw to be caught by outer catch block
      throw graphqlError
    }

    console.log(`[SESSIONS API] GraphQL query completed, sessions count: ${data.sessions?.length || 0}`)
    console.log(`[SESSIONS API] Raw data:`, JSON.stringify(data, null, 2))

    // Transform GraphQL response to API response format
    const sessions = (data.sessions || []).map((session: any) => {
      // Parse createdAt timestamp
      const createdAt = session.createdAt || session.created_at
        ? new Date(session.createdAt || session.created_at).toISOString()
        : null

      // startTs and endTs are already in milliseconds (BIGINT)
      const startTs = session.startTs ?? session.start_ts ?? null
      const endTs = session.endTs ?? session.end_ts ?? null

      return {
        id: session.id || '',
        sessionIndex: session.sessionIndex ?? session.session_index ?? null,
        createdAt,
        startTs,
        endTs,
      }
    })

    // Sort by created_at DESC (most recent first)
    sessions.sort((a: any, b: any) => {
      if (!a.createdAt && !b.createdAt) return 0
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    console.log(`[SESSIONS API] Returning ${sessions.length} sessions`)

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('[SESSIONS API] Error fetching sessions:', error)
    console.error('[SESSIONS API] Error stack:', error.stack)
    console.error('[SESSIONS API] Error details:', {
      message: error.message,
      response: error.response,
      request: error.request,
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // GraphQL error details
    if (error.response?.errors) {
      const graphqlErrors = error.response.errors.map((e: any) => e.message).join('; ')
      console.error('[SESSIONS API] GraphQL errors:', graphqlErrors)
      return NextResponse.json(
        { error: `GraphQL query failed: ${graphqlErrors}`, details: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Failed to fetch sessions: ${errorMessage}`, details: error.stack },
      { status: 500 }
    )
  }
}

