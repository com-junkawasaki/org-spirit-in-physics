// Merkle DAG: system_status_api -> connection_health_check
// System status API for checking ArangoDB, Temporal, and Hume AI connections

import { NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'

interface ConnectionStatus {
  service: string
  status: 'connected' | 'disconnected' | 'error'
  message: string
  responseTime?: number
  details?: Record<string, unknown>
}

export async function GET() {
  const startTime = Date.now()
  const statuses: ConnectionStatus[] = []

  try {
    // Check ArangoDB connection
    const arangoStatus = await checkArangoDBConnection()
    statuses.push(arangoStatus)

    // Check Temporal connection
    const temporalStatus = await checkTemporalConnection()
    statuses.push(temporalStatus)

    // Check Hume AI connection
    const humeStatus = await checkHumeAIConnection()
    statuses.push(humeStatus)

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalResponseTime: totalTime,
      services: statuses,
      overallStatus: statuses.every(s => s.status === 'connected') ? 'healthy' : 'degraded'
    })
  } catch (error) {
    console.error('System status check failed:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'System status check failed',
        services: statuses,
        overallStatus: 'error'
      },
      { status: 500 }
    )
  }
}

async function checkArangoDBConnection(): Promise<ConnectionStatus> {
  const startTime = Date.now()
  
  try {
    const client = createArangoDBClient()
    
    // Simple query to test connection
    const result = await client.query('RETURN 1')
    
    const responseTime = Date.now() - startTime
    
    if (result && result.length > 0) {
      return {
        service: 'ArangoDB',
        status: 'connected',
        message: 'Database connection successful',
        responseTime,
        details: {
          queryResult: result[0],
          database: process.env.ARANGODB_DATABASE_NAME || 'spirit_in_physics'
        }
      }
    } else {
      return {
        service: 'ArangoDB',
        status: 'error',
        message: 'Database query returned no results',
        responseTime
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      service: 'ArangoDB',
      status: 'disconnected',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime
    }
  }
}

async function checkTemporalConnection(): Promise<ConnectionStatus> {
  const startTime = Date.now()
  
  try {
    // Check if Temporal server is running by testing port connectivity
    const temporalHost = process.env.TEMPORAL_HOST || 'localhost'
    const temporalPort = parseInt(process.env.TEMPORAL_PORT || '7233')
    
    // Use a simple fetch to test if the port is open
    // Temporal server will respond with gRPC binary data, which we'll catch
    try {
      await fetch(`http://${temporalHost}:${temporalPort}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
    } catch (fetchError) {
      // Check both the error message and the cause
      const errorMessage = fetchError instanceof Error ? fetchError.message : ''
      const errorCause = (fetchError as any)?.cause
      const causeMessage = errorCause instanceof Error ? errorCause.message : ''
      const causeName = errorCause instanceof Error ? errorCause.name : ''
      
      // If we get an HTTP parser error, it means the server is running (gRPC response)
      if (fetchError instanceof Error && (
        errorMessage.includes('HTTP/0.9') ||
        errorMessage.includes('HTTPParserError') ||
        errorMessage.includes('does not match the HTTP/1.1 protocol') ||
        errorMessage.includes('HPE_INVALID_CONSTANT') ||
        causeName.includes('HTTPParserError') ||
        causeMessage.includes('does not match the HTTP/1.1 protocol') ||
        causeMessage.includes('HPE_INVALID_CONSTANT')
      )) {
        const responseTime = Date.now() - startTime
        return {
          service: 'Temporal',
          status: 'connected',
          message: 'Temporal server is running',
          responseTime,
          details: {
            host: temporalHost,
            port: temporalPort,
            protocol: 'gRPC'
          }
        }
      }
      throw fetchError
    }
    
    // If we get here, the server responded normally (unexpected)
    const responseTime = Date.now() - startTime
    return {
      service: 'Temporal',
      status: 'connected',
      message: 'Temporal server is running',
      responseTime,
      details: {
        host: temporalHost,
        port: temporalPort,
        protocol: 'gRPC'
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    
    // Check if it's a connection refused error (server not running)
    if (error instanceof Error && (
      error.message.includes('ECONNREFUSED') || 
      error.message.includes('Connection timeout') ||
      error.message.includes('fetch failed')
    )) {
      return {
        service: 'Temporal',
        status: 'disconnected',
        message: 'Temporal server is not running',
        responseTime
      }
    }
    
    return {
      service: 'Temporal',
      status: 'disconnected',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime
    }
  }
}

async function checkHumeAIConnection(): Promise<ConnectionStatus> {
  const startTime = Date.now()
  
  try {
    // Check if Hume AI API key is configured
    const apiKey = process.env.HUME_API_KEY
    
    if (!apiKey) {
      return {
        service: 'Hume AI',
        status: 'disconnected',
        message: 'API key not configured',
        responseTime: Date.now() - startTime
      }
    }
    
    // Try to make a simple API call to Hume AI
    const response = await fetch('https://api.hume.ai/v0/face', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        models: {
          face: {
            prob_threshold: 0.9
          }
        },
        data: ''
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        service: 'Hume AI',
        status: 'connected',
        message: 'Hume AI API is accessible',
        responseTime,
        details: {
          apiKeyConfigured: true,
          endpoint: 'https://api.hume.ai/v0/face'
        }
      }
    } else if (response.status === 401) {
      return {
        service: 'Hume AI',
        status: 'disconnected',
        message: 'Invalid API key',
        responseTime
      }
    } else {
      return {
        service: 'Hume AI',
        status: 'error',
        message: `API responded with status ${response.status}`,
        responseTime
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      service: 'Hume AI',
      status: 'disconnected',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime
    }
  }
}
