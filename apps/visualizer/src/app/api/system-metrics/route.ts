// Merkle DAG: system_metrics_api -> metrics_data_provider
// Single responsibility: Provide system metrics data
// Open/Closed: Extensible for new metric types
// Liskov Substitution: Implements MetricsProvider interface
// Interface Segregation: Focused on metrics data only
// Dependency Inversion: Depends on data interfaces, not concrete implementations

import { NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

// Merkle DAG: system_metrics_api -> metrics_data_interface
interface SystemMetricsData {
  timestamp: string
  participants: {
    total: number
    active: number
    completed: number
  }
  sessions: {
    total: number
    active: number
    completed: number
  }
  responses: {
    total: number
    averageSpiritProbability: number
    processed: number
    pending: number
  }
  jobs: {
    active: number
    completed: number
    failed: number
    total: number
  }
  performance: {
    averageResponseTime: number
    databaseConnections: number
    memoryUsage: number
    cpuUsage: number
  }
  health: {
    overall: 'healthy' | 'degraded' | 'critical'
    services: Array<{
      name: string
      status: 'healthy' | 'degraded' | 'critical'
      responseTime: number
      lastChecked: string
    }>
  }
}

// Merkle DAG: system_metrics_api -> metrics_calculator
class MetricsCalculator {
  private dbClient: unknown

  constructor(dbClient: unknown) {
    this.dbClient = dbClient
  }

  // Merkle DAG: system_metrics_api -> participants_metrics_calculator
  async calculateParticipantsMetrics(): Promise<SystemMetricsData['participants']> {
    try {
      const totalQuery = `MATCH (p:Participant) RETURN count(p) as total`
      const activeQuery = `MATCH (p:Participant) WHERE p.status = 'active' RETURN count(p) as active`
      const completedQuery = `MATCH (p:Participant) WHERE p.status = 'completed' RETURN count(p) as completed`

      const [totalResult, activeResult, completedResult] = await Promise.all([
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(totalQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(activeQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(completedQuery)
      ])

      return {
        total: totalResult[0]?.total || 0,
        active: activeResult[0]?.active || 0,
        completed: completedResult[0]?.completed || 0
      }
    } catch (error) {
      console.error('Failed to calculate participants metrics:', error)
      return { total: 0, active: 0, completed: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> sessions_metrics_calculator
  async calculateSessionsMetrics(): Promise<SystemMetricsData['sessions']> {
    try {
      const totalQuery = `MATCH (s:Session) RETURN count(s) as total`
      const activeQuery = `MATCH (s:Session) WHERE s.status = 'active' RETURN count(s) as active`
      const completedQuery = `MATCH (s:Session) WHERE s.status = 'completed' RETURN count(s) as completed`

      const [totalResult, activeResult, completedResult] = await Promise.all([
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(totalQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(activeQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(completedQuery)
      ])

      return {
        total: totalResult[0]?.total || 0,
        active: activeResult[0]?.active || 0,
        completed: completedResult[0]?.completed || 0
      }
    } catch (error) {
      console.error('Failed to calculate sessions metrics:', error)
      return { total: 0, active: 0, completed: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> responses_metrics_calculator
  async calculateResponsesMetrics(): Promise<SystemMetricsData['responses']> {
    try {
      const totalQuery = `MATCH (r:Response) RETURN count(r) as total`
      const processedQuery = `MATCH (r:Response) WHERE r.processed = true RETURN count(r) as processed`
      const avgSpiritQuery = `MATCH (r:Response) WHERE r.spirit_probability IS NOT NULL RETURN avg(r.spirit_probability) as averageSpiritProbability`

      const [totalResult, processedResult, avgSpiritResult] = await Promise.all([
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(totalQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(processedQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(avgSpiritQuery)
      ])

      const total = totalResult[0]?.total || 0
      const processed = processedResult[0]?.processed || 0
      const pending = total - processed
      const averageSpiritProbability = avgSpiritResult[0]?.averageSpiritProbability || 0

      return {
        total,
        processed,
        pending,
        averageSpiritProbability
      }
    } catch (error) {
      console.error('Failed to calculate responses metrics:', error)
      return { total: 0, processed: 0, pending: 0, averageSpiritProbability: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> jobs_metrics_calculator
  async calculateJobsMetrics(): Promise<SystemMetricsData['jobs']> {
    try {
      const totalQuery = `MATCH (j:ImportJob) RETURN count(j) as total`
      const activeQuery = `MATCH (j:ImportJob) WHERE j.status IN ['PENDING', 'RUNNING'] RETURN count(j) as active`
      const completedQuery = `MATCH (j:ImportJob) WHERE j.status = 'COMPLETED' RETURN count(j) as completed`
      const failedQuery = `MATCH (j:ImportJob) WHERE j.status = 'FAILED' RETURN count(j) as failed`

      const [totalResult, activeResult, completedResult, failedResult] = await Promise.all([
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(totalQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(activeQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(completedQuery),
        (this.dbClient as { query: (query: string) => Promise<any[]> }).query(failedQuery)
      ])

      const total = totalResult[0]?.total || 0
      const active = activeResult[0]?.active || 0
      const completed = completedResult[0]?.completed || 0
      const failed = failedResult[0]?.failed || 0

      return {
        total,
        active,
        completed,
        failed
      }
    } catch (error) {
      console.error('Failed to calculate jobs metrics:', error)
      return { total: 0, active: 0, completed: 0, failed: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> performance_metrics_calculator
  async calculatePerformanceMetrics(): Promise<SystemMetricsData['performance']> {
    try {
      // Calculate average response time from recent responses
      const responseTimeQuery = `
        MATCH (r:Response)
        WHERE r.reaction_time_ms IS NOT NULL
        RETURN avg(r.reaction_time_ms) as averageResponseTime
        ORDER BY r.created_at DESC
        LIMIT 100
      `

      const responseTimeResult = await (this.dbClient as { query: (query: string) => Promise<any[]> }).query(responseTimeQuery)
      const averageResponseTime = responseTimeResult[0]?.averageResponseTime || 0

      // Mock performance data (in real implementation, these would come from system monitoring)
      return {
        averageResponseTime,
        databaseConnections: 5, // Mock value
        memoryUsage: Math.random() * 100, // Mock value
        cpuUsage: Math.random() * 100 // Mock value
      }
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error)
      return {
        averageResponseTime: 0,
        databaseConnections: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    }
  }

  // Merkle DAG: system_metrics_api -> health_metrics_calculator
  async calculateHealthMetrics(): Promise<SystemMetricsData['health']> {
    try {
      const services = []
      
      // Check Neo4j health
      const neo4jStartTime = Date.now()
      try {
        await (this.dbClient as { query: (query: string) => Promise<any[]> }).query('RETURN 1 as test')
        services.push({
          name: 'Neo4j',
          status: 'healthy' as const,
          responseTime: Date.now() - neo4jStartTime,
          lastChecked: new Date().toISOString()
        })
      } catch {
        services.push({
          name: 'Neo4j',
          status: 'critical' as const,
          responseTime: Date.now() - neo4jStartTime,
          lastChecked: new Date().toISOString()
        })
      }

      // Check Workflow system health
      const workflowStatus = await this.checkWorkflowConnection()
      services.push(workflowStatus)

      // Check Hume AI health
      const humeStatus = await this.checkHumeAIConnection()
      services.push(humeStatus)

      const overallStatus = services.every(s => s.status === 'healthy') 
        ? 'healthy' 
        : services.some(s => s.status === 'critical') 
          ? 'critical' 
          : 'degraded'

      return {
        overall: overallStatus,
        services
      }
    } catch {
      console.error('Failed to calculate health metrics')
      return {
        overall: 'critical',
        services: []
      }
    }
  }

  // Merkle DAG: system_metrics_api -> workflow_connection_checker
  private async checkWorkflowConnection(): Promise<{
    name: string
    status: 'healthy' | 'degraded' | 'critical'
    responseTime: number
    lastChecked: string
  }> {
    const startTime = Date.now()

    try {
     // Check if Workflow API is running by testing endpoint connectivity
     const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

     // Use fetch to test workflow validation endpoint
     try {
       const response = await fetch(`${apiHost}/api/workflows/validate`, {
         method: 'POST',
          signal: AbortSignal.timeout(5000)
        })
      } catch (fetchError) {
        // Check both the error message and the cause
        const errorMessage = fetchError instanceof Error ? fetchError.message : ''
        const errorCause = (fetchError as Error & { cause?: Error })?.cause
        const causeMessage = errorCause instanceof Error ? errorCause.message : ''
        const causeName = errorCause instanceof Error ? errorCause.name : ''

        // If we get a successful connection, check the response
        const response = await fetch(`${apiHost}/api/workflows/validate`, {
          method: 'POST',
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          const responseTime = Date.now() - startTime
          return {
            name: 'Workflow',
            status: 'healthy',
            responseTime,
            lastChecked: new Date().toISOString()
          }
        } else {
          const responseTime = Date.now() - startTime
          return {
            name: 'Workflow',
            status: 'degraded',
            responseTime,
            lastChecked: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Workflow connection check failed:', error)
      const responseTime = Date.now() - startTime

      return {
        name: 'Workflow',
        status: 'critical',
        responseTime,
        lastChecked: new Date().toISOString()
      }
    }
  }

  // Merkle DAG: system_metrics_api -> hume_ai_connection_checker
  private async checkHumeAIConnection(): Promise<{
    name: string
    status: 'healthy' | 'degraded' | 'critical'
    responseTime: number
    lastChecked: string
  }> {
    const startTime = Date.now()

    try {
      // Check if Hume AI API key is configured
      const apiKey = process.env.HUME_API_KEY

      if (!apiKey) {
        return {
          name: 'Hume AI',
          status: 'critical',
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString()
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
          name: 'Hume AI',
          status: 'healthy',
          responseTime,
          lastChecked: new Date().toISOString()
        }
      } else if (response.status === 401) {
        return {
          name: 'Hume AI',
          status: 'critical',
          responseTime,
          lastChecked: new Date().toISOString()
        }
      } else {
        return {
          name: 'Hume AI',
          status: 'degraded',
          responseTime,
          lastChecked: new Date().toISOString()
        }
      }
    } catch {
      const responseTime = Date.now() - startTime
      return {
        name: 'Hume AI',
        status: 'critical',
        responseTime,
        lastChecked: new Date().toISOString()
      }
    }
  }
}

// Merkle DAG: system_metrics_api -> main_handler
export async function GET() {
  try {
    const dbClient = createNeo4jClient()
    const calculator = new MetricsCalculator(dbClient)

    // Calculate all metrics in parallel
    const [
      participants,
      sessions,
      responses,
      jobs,
      performance,
      health
    ] = await Promise.all([
      calculator.calculateParticipantsMetrics(),
      calculator.calculateSessionsMetrics(),
      calculator.calculateResponsesMetrics(),
      calculator.calculateJobsMetrics(),
      calculator.calculatePerformanceMetrics(),
      calculator.calculateHealthMetrics()
    ])

    const metrics: SystemMetricsData = {
      timestamp: new Date().toISOString(),
      participants,
      sessions,
      responses,
      jobs,
      performance,
      health
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Failed to get system metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get system metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
