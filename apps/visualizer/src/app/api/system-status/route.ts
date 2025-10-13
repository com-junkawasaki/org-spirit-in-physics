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
    // Check if Temporal server is running on default port
    const temporalUrl = process.env.TEMPORAL_URL || 'http://localhost:7233'
    
    // Try to connect to Temporal server health endpoint
    const response = await fetch(`${temporalUrl}/api/v1/namespaces`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      const data = await response.json()
      return {
        service: 'Temporal',
        status: 'connected',
        message: 'Temporal server is running',
        responseTime,
        details: {
          namespaces: data.namespaces || [],
          server: temporalUrl
        }
      }
    } else {
      return {
        service: 'Temporal',
        status: 'error',
        message: `Server responded with status ${response.status}`,
        responseTime
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
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
