// Merkle DAG: admin_batch_status_api -> batch_status_tracking_service
// API route to get batch processing status from database

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      )
    }

    // Query GraphQL API to get batch job status
    const graphqlUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
    
    // For now, return a simple status check
    // In the future, we can add a GraphQL query to check participant_timeline_batch_jobs table
    // or check participant_timeline_cache for completion
    
    try {
      // Check if cache exists (indicates batch processing completed)
      const cacheCheckQuery = {
        query: `
          query {
            participantTimeline(participantId: "${participantId}") {
              metadata {
                dataSource
                totalDataPoints
              }
            }
          }
        `
      }

      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cacheCheckQuery),
      })

      if (response.ok) {
        const data = await response.json()
        const dataSource = data.data?.participantTimeline?.metadata?.dataSource
        
        // If dataSource is 'batch' or 'batch_merged', batch processing has completed
        const status = dataSource === 'batch' || dataSource === 'batch_merged' 
          ? 'completed' 
          : 'pending'

        return NextResponse.json({
          participantId,
          status,
          dataSource,
          lastChecked: new Date().toISOString(),
        })
      } else {
        return NextResponse.json({
          participantId,
          status: 'unknown',
          error: 'Failed to check cache status',
          lastChecked: new Date().toISOString(),
        })
      }
    } catch (error) {
      return NextResponse.json({
        participantId,
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('[Batch Status API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get batch status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

