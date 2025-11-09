/**
 * Merkle DAG: api.admin.batch.generate_display_data
 * API endpoint to trigger display data generation for a participant
 * RDF: https://spirit-in-physics.gftd.ai/api/admin/batch/generate-display-data
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get GraphQL API URL
    const graphqlUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
    const graphqlBaseUrl = graphqlUrl.endsWith('/graphql') 
      ? graphqlUrl.slice(0, -7)
      : graphqlUrl.replace(/\/graphql\/?$/, '')

    // Call timeline batch service to generate display data
    // This will trigger the batch processing which includes display data generation
    const batchServiceUrl = process.env.TIMELINE_BATCH_SERVICE_URL || 'http://timeline-batch:8082'
    
    // For now, we'll trigger the regular batch processing which includes display data generation
    // In the future, we could have a dedicated endpoint for display data only
    const response = await fetch(`${batchServiceUrl}/batch/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        participantId,
        incremental: false // Always full regeneration for display data
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Generate Display Data API] Batch service error:', errorText)
      return NextResponse.json(
        { error: 'Failed to start display data generation', details: errorText },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      jobId: data.jobId,
      message: 'Display data generation started',
    })
  } catch (error: any) {
    console.error('[Generate Display Data API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

