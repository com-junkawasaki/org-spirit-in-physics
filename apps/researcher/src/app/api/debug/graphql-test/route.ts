// Merkle DAG: debug.graphql-test.endpoint
// Debug endpoint for testing GraphQL service connectivity

import { NextRequest, NextResponse } from 'next/server'
import { createGraphQLClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } from '@/lib/graphql/client'
import type { GetParticipantsQueryResult, GetSessionsQueryResult, GetTimelineQueryResult } from '@/generated/graphql'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const participantId = searchParams.get('participantId')
  const testType = searchParams.get('test') || 'all'

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
    errors: [],
  }

  try {
    const graphqlClient = createGraphQLClient()
    const url = graphqlClient['endpoint'] || 'unknown'
    results.graphqlUrl = url

    // Test 1: Get participants
    if (testType === 'all' || testType === 'participants') {
      try {
        console.log('[GraphQL Test] Testing GetParticipants query...')
        const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
        results.tests.participants = {
          success: true,
          count: participantsData.participants?.length || 0,
          sample: participantsData.participants?.slice(0, 3).map(p => ({
            id: p.id,
            age: p.age,
            gender: p.gender,
          })),
        }
        console.log(`[GraphQL Test] GetParticipants succeeded: ${results.tests.participants.count} participants`)
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        results.tests.participants = {
          success: false,
          error: errorMessage,
        }
        results.errors.push(`GetParticipants failed: ${errorMessage}`)
        console.error('[GraphQL Test] GetParticipants failed:', error)
      }
    }

    // Test 2: Get sessions for a participant
    if ((testType === 'all' || testType === 'sessions') && participantId) {
      try {
        console.log(`[GraphQL Test] Testing GetSessions query for participant ${participantId}...`)
        const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId })
        results.tests.sessions = {
          success: true,
          participantId,
          count: sessionsData.sessions?.length || 0,
          sessions: sessionsData.sessions?.map(s => ({
            id: s.id,
            sessionIndex: s.sessionIndex,
            startTs: s.startTs,
            endTs: s.endTs,
          })),
        }
        console.log(`[GraphQL Test] GetSessions succeeded: ${results.tests.sessions.count} sessions`)
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        results.tests.sessions = {
          success: false,
          participantId,
          error: errorMessage,
        }
        results.errors.push(`GetSessions failed: ${errorMessage}`)
        console.error('[GraphQL Test] GetSessions failed:', error)
      }
    }

    // Test 3: Get timeline for a participant
    if ((testType === 'all' || testType === 'timeline') && participantId) {
      try {
        console.log(`[GraphQL Test] Testing GetTimeline query for participant ${participantId}...`)
        const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
        const timeline = timelineData.timeline || []
        const responseCount = timeline.filter((p) => p.hasResponse).length
        const reactionValues = timeline
          .filter((p) => p.reactionValue != null)
          .map((p) => p.reactionValue ?? 0)
        const averageSpiritProbability = reactionValues.length > 0
          ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
          : 0

        results.tests.timeline = {
          success: true,
          participantId,
          count: timeline.length,
          responseCount,
          averageSpiritProbability,
          sample: timeline.slice(0, 3).map(p => ({
            time: p.time,
            word: p.word,
            hasResponse: p.hasResponse,
            reactionValue: p.reactionValue,
          })),
        }
        console.log(`[GraphQL Test] GetTimeline succeeded: ${results.tests.timeline.count} points, ${responseCount} responses`)
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        results.tests.timeline = {
          success: false,
          participantId,
          error: errorMessage,
        }
        results.errors.push(`GetTimeline failed: ${errorMessage}`)
        console.error('[GraphQL Test] GetTimeline failed:', error)
      }
    }

    // Summary
    const allTests = Object.values(results.tests)
    const successCount = allTests.filter((t: any) => t.success).length
    const totalCount = allTests.length
    results.summary = {
      totalTests: totalCount,
      successfulTests: successCount,
      failedTests: totalCount - successCount,
      allPassed: successCount === totalCount && totalCount > 0,
    }

    return NextResponse.json(results, {
      status: results.summary.allPassed ? 200 : 500,
    })
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    results.errors.push(`General error: ${errorMessage}`)
    console.error('[GraphQL Test] General error:', error)
    return NextResponse.json(results, { status: 500 })
  }
}

