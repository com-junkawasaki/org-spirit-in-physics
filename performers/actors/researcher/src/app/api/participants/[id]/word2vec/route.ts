/**
 * Merkle DAG: api.participants.word2vec
 * Next.js API route for fetching participant word2vec data
 * RDF: https://spirit-in-physics.gftd.ai/api/participants/word2vec
 * 
 * This route calls the GraphQL API's participantWord2Vec query and transforms
 * the response to match the format expected by TimelineVisualization component.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const totalStart = Date.now()
  const participantId = params.id

  if (!participantId) {
    return NextResponse.json(
      { success: false, error: 'Participant ID is required' },
      { status: 400 }
    )
  }

  // Validate environment variables
  const graphqlUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
  console.log('[Word2Vec API] Starting request for participant:', participantId)
  console.log('[Word2Vec API] GraphQL URL:', graphqlUrl)

  try {
    const graphqlQuery = `
      query ParticipantWord2Vec($participantId: String!) {
        participantWord2Vec(participantId: $participantId) {
          wordData {
            word
            embedding
          }
        }
      }
    `

    const requestBody = {
      query: graphqlQuery,
      variables: { participantId },
    }

    console.log('[Word2Vec API] Sending GraphQL request:', {
      url: graphqlUrl,
      participantId,
      queryLength: graphqlQuery.length,
    })

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    const graphqlStart = Date.now()
    try {
      response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[Word2Vec API] GraphQL API request timeout after 30 seconds')
        return NextResponse.json(
          { 
            success: false, 
            error: 'GraphQL API request timeout',
            details: 'The request took longer than 30 seconds to complete',
            graphqlUrl,
          },
          { status: 504 }
        )
      }

      console.error('[Word2Vec API] GraphQL API connection error:', {
        error: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
        graphqlUrl,
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to GraphQL API',
          details: fetchError.message || 'Connection error',
          graphqlUrl,
        },
        { status: 503 }
      )
    }

    console.log('[Word2Vec API] GraphQL API response status:', response.status, response.statusText)

    if (!response.ok) {
      let errorBody: string | null = null
      try {
        errorBody = await response.text()
        console.error('[Word2Vec API] GraphQL API error response body:', errorBody)
      } catch (e) {
        console.error('[Word2Vec API] Failed to read error response body')
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `GraphQL API returned ${response.status}: ${response.statusText}`,
          details: errorBody || 'No error details available',
          graphqlUrl,
        },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    let result: any
    try {
      result = await response.json()
      console.log('[Word2Vec API] GraphQL API response received:', {
        hasData: !!result.data,
        hasErrors: !!result.errors,
        errorsCount: result.errors?.length || 0,
      })
    } catch (parseError: any) {
      console.error('[Word2Vec API] Failed to parse GraphQL API response as JSON:', parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from GraphQL API',
          details: parseError.message,
          graphqlUrl,
        },
        { status: 502 }
      )
    }

    if (result.errors) {
      console.error('[Word2Vec API] GraphQL errors:', JSON.stringify(result.errors, null, 2))
      const errorMessages = result.errors.map((e: any) => e.message).join('; ')
      const errorPaths = result.errors.map((e: any) => e.path).filter(Boolean)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'GraphQL query errors',
          details: errorMessages,
          paths: errorPaths,
          graphqlUrl,
        },
        { status: 500 }
      )
    }

    const graphqlMs = Date.now() - graphqlStart

    const word2vecResponse = result.data?.participantWord2Vec

    if (!word2vecResponse) {
      console.error('[Word2Vec API] No word2vec data in GraphQL response:', {
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
      })
      const totalMs = Date.now() - totalStart
      console.log('[Performance] Word2Vec API: graphql_ms=' + graphqlMs + ', total_ms=' + totalMs + ', result=error')
      return NextResponse.json(
        { 
          success: false, 
          error: 'No word2vec data returned from GraphQL API',
          details: 'The GraphQL query succeeded but participantWord2Vec field is missing',
          graphqlUrl,
        },
        { status: 500 }
      )
    }

    // Transform GraphQL response to format expected by TimelineVisualization
    const transformStart = Date.now()
    const wordData = word2vecResponse.wordData.map((item: any) => ({
      word: item.word,
      embedding: item.embedding || [],
    }))

    const transformMs = Date.now() - transformStart

    console.log('[Word2Vec API] Successfully processed word2vec data:', {
      wordCount: wordData.length,
    })

    const responseData = {
      wordData,
    }

    const totalMs = Date.now() - totalStart
    const responseSize = JSON.stringify(responseData).length
    console.log('[Performance] Word2Vec API: graphql_ms=' + graphqlMs + ', transform_ms=' + transformMs + ', response_size_kb=' + Math.round(responseSize / 1024) + ', total_ms=' + totalMs + ', word_count=' + wordData.length)

    return NextResponse.json({
      success: true,
      ...responseData,
    })
  } catch (error: any) {
    console.error('[Word2Vec API] Unexpected error:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      participantId,
      graphqlUrl,
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        graphqlUrl,
      },
      { status: 500 }
    )
  }
}

