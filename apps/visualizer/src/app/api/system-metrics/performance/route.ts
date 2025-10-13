// Merkle DAG: performance_metrics_api -> performance_data_provider
// Single responsibility: Provide performance metrics data for charts
// Open/Closed: Extensible for new performance metric types
// Liskov Substitution: Implements PerformanceDataProvider interface
// Interface Segregation: Focused on performance data only
// Dependency Inversion: Depends on performance interfaces, not concrete implementations

import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'

// Merkle DAG: performance_metrics_api -> performance_data_interface
interface PerformanceDataPoint {
  timestamp: string
  value: number
  label?: string
}

interface PerformanceMetric {
  id: string
  name: string
  data: PerformanceDataPoint[]
  unit: string
  color: string
  trend?: 'up' | 'down' | 'stable'
  average?: number
  min?: number
  max?: number
}

interface PerformanceMetricsResponse {
  timestamp: string
  metrics: PerformanceMetric[]
  timeRange: string
}

// Merkle DAG: performance_metrics_api -> performance_data_generator
class PerformanceDataGenerator {
  private dbClient: unknown

  constructor(dbClient: unknown) {
    this.dbClient = dbClient
  }

  // Merkle DAG: performance_metrics_api -> response_time_data_generator
  async generateResponseTimeData(timeRange: string): Promise<PerformanceMetric> {
    try {
      const hours = this.getHoursFromTimeRange(timeRange)
      const query = `
        FOR r IN participant_response_data
        FILTER r.response_time != null
        FILTER r.created_at >= DATE_SUBTRACT(NOW(), ${hours}, 'hours')
        SORT r.created_at ASC
        RETURN {
          timestamp: r.created_at,
          value: r.response_time
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      const data = result.map((item: any) => ({
        timestamp: new Date(item.timestamp).toISOString(),
        value: item.value
      }))

      const values = data.map((d: any) => d.value)
      const average = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
      const min = values.length > 0 ? Math.min(...values) : 0
      const max = values.length > 0 ? Math.max(...values) : 0

      return {
        id: 'response-time',
        name: '応答時間',
        data,
        unit: 'ms',
        color: 'bg-blue-500',
        trend: this.calculateTrend(values),
        average,
        min,
        max
      }
    } catch (error) {
      console.error('Failed to generate response time data:', error)
      return {
        id: 'response-time',
        name: '応答時間',
        data: [],
        unit: 'ms',
        color: 'bg-blue-500',
        trend: 'stable',
        average: 0,
        min: 0,
        max: 0
      }
    }
  }

  // Merkle DAG: performance_metrics_api -> spirit_probability_data_generator
  async generateSpiritProbabilityData(timeRange: string): Promise<PerformanceMetric> {
    try {
      const hours = this.getHoursFromTimeRange(timeRange)
      const query = `
        FOR r IN participant_response_data
        FILTER r.spirit_probability != null
        FILTER r.created_at >= DATE_SUBTRACT(NOW(), ${hours}, 'hours')
        SORT r.created_at ASC
        RETURN {
          timestamp: r.created_at,
          value: r.spirit_probability
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      const data = result.map((item: any) => ({
        timestamp: new Date(item.timestamp).toISOString(),
        value: item.value
      }))

      const values = data.map((d: any) => d.value)
      const average = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
      const min = values.length > 0 ? Math.min(...values) : 0
      const max = values.length > 0 ? Math.max(...values) : 0

      return {
        id: 'spirit-probability',
        name: 'Spirit確率',
        data,
        unit: '',
        color: 'bg-purple-500',
        trend: this.calculateTrend(values),
        average,
        min,
        max
      }
    } catch (error) {
      console.error('Failed to generate spirit probability data:', error)
      return {
        id: 'spirit-probability',
        name: 'Spirit確率',
        data: [],
        unit: '',
        color: 'bg-purple-500',
        trend: 'stable',
        average: 0,
        min: 0,
        max: 0
      }
    }
  }

  // Merkle DAG: performance_metrics_api -> job_processing_data_generator
  async generateJobProcessingData(timeRange: string): Promise<PerformanceMetric> {
    try {
      const hours = this.getHoursFromTimeRange(timeRange)
      const query = `
        FOR j IN participant_hume_analysis_jobs
        FILTER j.created_at >= DATE_SUBTRACT(NOW(), ${hours}, 'hours')
        SORT j.created_at ASC
        RETURN {
          timestamp: j.created_at,
          value: j.processing_time || 0
        }
      `
      
      const result = await (this.dbClient as any).query(query)
      const data = result.map((item: any) => ({
        timestamp: new Date(item.timestamp).toISOString(),
        value: item.value
      }))

      const values = data.map((d: any) => d.value)
      const average = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
      const min = values.length > 0 ? Math.min(...values) : 0
      const max = values.length > 0 ? Math.max(...values) : 0

      return {
        id: 'job-processing',
        name: 'ジョブ処理時間',
        data,
        unit: 's',
        color: 'bg-green-500',
        trend: this.calculateTrend(values),
        average,
        min,
        max
      }
    } catch (error) {
      console.error('Failed to generate job processing data:', error)
      return {
        id: 'job-processing',
        name: 'ジョブ処理時間',
        data: [],
        unit: 's',
        color: 'bg-green-500',
        trend: 'stable',
        average: 0,
        min: 0,
        max: 0
      }
    }
  }

  // Merkle DAG: performance_metrics_api -> helper_methods
  private getHoursFromTimeRange(timeRange: string): number {
    switch (timeRange) {
      case '1h':
        return 1
      case '24h':
        return 24
      case '7d':
        return 24 * 7
      case '30d':
        return 24 * 30
      default:
        return 24
    }
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable'
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    const diff = secondAvg - firstAvg
    const threshold = firstAvg * 0.05 // 5% threshold
    
    if (diff > threshold) return 'up'
    if (diff < -threshold) return 'down'
    return 'stable'
  }
}

// Merkle DAG: performance_metrics_api -> main_handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'

    const dbClient = createArangoDBClient()
    const generator = new PerformanceDataGenerator(dbClient)

    // Generate all performance metrics in parallel
    const [responseTime, spiritProbability, jobProcessing] = await Promise.all([
      generator.generateResponseTimeData(timeRange),
      generator.generateSpiritProbabilityData(timeRange),
      generator.generateJobProcessingData(timeRange)
    ])

    const response: PerformanceMetricsResponse = {
      timestamp: new Date().toISOString(),
      metrics: [responseTime, spiritProbability, jobProcessing],
      timeRange
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get performance metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get performance metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
