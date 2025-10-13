// Merkle DAG: system_metrics_api -> metrics_data_provider
// Single responsibility: Provide system metrics data
// Open/Closed: Extensible for new metric types
// Liskov Substitution: Implements MetricsProvider interface
// Interface Segregation: Focused on metrics data only
// Dependency Inversion: Depends on data interfaces, not concrete implementations

import { NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'

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
      const query = `
        LET total = LENGTH(FOR p IN participants RETURN 1)
        LET active = LENGTH(FOR p IN participants 
          FILTER p.status == 'active' 
          RETURN 1)
        LET completed = LENGTH(FOR p IN participants 
          FILTER p.status == 'completed' 
          RETURN 1)
        RETURN {
          total,
          active,
          completed
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      return result[0] || { total: 0, active: 0, completed: 0 }
    } catch (error) {
      console.error('Failed to calculate participants metrics:', error)
      return { total: 0, active: 0, completed: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> sessions_metrics_calculator
  async calculateSessionsMetrics(): Promise<SystemMetricsData['sessions']> {
    try {
      const query = `
        LET total = LENGTH(FOR s IN participant_experiment_sessions RETURN 1)
        LET active = LENGTH(FOR s IN participant_experiment_sessions 
          FILTER s.status == 'active' 
          RETURN 1)
        LET completed = LENGTH(FOR s IN participant_experiment_sessions 
          FILTER s.status == 'completed' 
          RETURN 1)
        RETURN {
          total,
          active,
          completed
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      return result[0] || { total: 0, active: 0, completed: 0 }
    } catch (error) {
      console.error('Failed to calculate sessions metrics:', error)
      return { total: 0, active: 0, completed: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> responses_metrics_calculator
  async calculateResponsesMetrics(): Promise<SystemMetricsData['responses']> {
    try {
      const query = `
        LET total = LENGTH(FOR r IN participant_response_data RETURN 1)
        LET processed = LENGTH(FOR r IN participant_response_data 
          FILTER r.spirit_probability != null 
          RETURN 1)
        LET pending = total - processed
        LET avgSpirit = (
          FOR r IN participant_response_data 
          FILTER r.spirit_probability != null 
          COLLECT AGGREGATE avg = AVG(r.spirit_probability)
          RETURN avg
        )[0]
        RETURN {
          total,
          processed,
          pending,
          averageSpiritProbability: avgSpirit || 0
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      return result[0] || { total: 0, processed: 0, pending: 0, averageSpiritProbability: 0 }
    } catch (error) {
      console.error('Failed to calculate responses metrics:', error)
      return { total: 0, processed: 0, pending: 0, averageSpiritProbability: 0 }
    }
  }

  // Merkle DAG: system_metrics_api -> jobs_metrics_calculator
  async calculateJobsMetrics(): Promise<SystemMetricsData['jobs']> {
    try {
      const query = `
        LET total = LENGTH(FOR j IN participant_hume_analysis_jobs RETURN 1)
        LET active = LENGTH(FOR j IN participant_hume_analysis_jobs 
          FILTER j.status IN ['PENDING', 'RUNNING'] 
          RETURN 1)
        LET completed = LENGTH(FOR j IN participant_hume_analysis_jobs 
          FILTER j.status == 'COMPLETED' 
          RETURN 1)
        LET failed = LENGTH(FOR j IN participant_hume_analysis_jobs 
          FILTER j.status == 'FAILED' 
          RETURN 1)
        RETURN {
          total,
          active,
          completed,
          failed
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      return result[0] || { total: 0, active: 0, completed: 0, failed: 0 }
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
        LET recentResponses = (
          FOR r IN participant_response_data 
          FILTER r.response_time != null 
          SORT r.created_at DESC 
          LIMIT 100 
          RETURN r.response_time
        )
        LET avgResponseTime = (
          FOR rt IN recentResponses 
          COLLECT AGGREGATE avg = AVG(rt)
          RETURN avg
        )[0]
        RETURN avgResponseTime || 0
      `
      
      const responseTimeResult = await (this.dbClient as any).query(responseTimeQuery)
      const averageResponseTime = responseTimeResult[0] || 0

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
      
      // Check ArangoDB health
      const arangoStartTime = Date.now()
      try {
        await (this.dbClient as any).query('RETURN 1')
        services.push({
          name: 'ArangoDB',
          status: 'healthy' as const,
          responseTime: Date.now() - arangoStartTime,
          lastChecked: new Date().toISOString()
        })
      } catch {
        services.push({
          name: 'ArangoDB',
          status: 'critical' as const,
          responseTime: Date.now() - arangoStartTime,
          lastChecked: new Date().toISOString()
        })
      }

      // Check Temporal health (mock)
      services.push({
        name: 'Temporal',
        status: 'healthy' as const,
        responseTime: 50,
        lastChecked: new Date().toISOString()
      })

      // Check Hume AI health (mock)
      services.push({
        name: 'Hume AI',
        status: 'healthy' as const,
        responseTime: 200,
        lastChecked: new Date().toISOString()
      })

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
}

// Merkle DAG: system_metrics_api -> main_handler
export async function GET() {
  try {
    const dbClient = createArangoDBClient()
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
