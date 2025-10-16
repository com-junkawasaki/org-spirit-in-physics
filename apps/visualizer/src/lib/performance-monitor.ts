// Merkle DAG: performance_monitor -> performance_optimization_monitoring
// パフォーマンス監視システム - システム全体のパフォーマンス最適化

import { getQueryOptimizer } from './query-optimizer'
import { getCacheManager } from './cache-manager'
import { getWebSocketManager } from './websocket-manager'

interface PerformanceMetrics {
  timestamp: number
  queryPerformance: {
    totalQueries: number
    averageExecutionTime: number
    cacheHitRate: number
    slowestQuery: string
    slowestQueryTime: number
  }
  cachePerformance: {
    size: number
    maxSize: number
    hitRate: number
    strategy: string
  }
  websocketPerformance: {
    connectionCount: number
    averagePingTime: number
    messageThroughput: number
  }
  systemPerformance: {
    memoryUsage: number
    cpuUsage: number
    responseTime: number
  }
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetrics = 1000
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly monitoringIntervalMs = 60000 // 1分間隔

  constructor() {
    this.startMonitoring()
  }

  // Merkle DAG: performance_monitor.start_monitoring -> monitoring_start
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.monitoringIntervalMs)

    console.log('Performance monitoring started')
  }

  // Merkle DAG: performance_monitor.stop_monitoring -> monitoring_stop
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('Performance monitoring stopped')
    }
  }

  // Merkle DAG: performance_monitor.collect_metrics -> metrics_collection
  private async collectMetrics(): Promise<void> {
    try {
      const queryOptimizer = getQueryOptimizer()
      const cacheManager = getCacheManager()
      const websocketManager = getWebSocketManager()

      const queryStats = queryOptimizer.getPerformanceStats()
      const cacheStats = cacheManager.getStats()
      const websocketConnections = websocketManager.getConnections()

      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        queryPerformance: {
          totalQueries: queryStats.totalQueries,
          averageExecutionTime: queryStats.averageExecutionTime,
          cacheHitRate: queryStats.cacheHitRate,
          slowestQuery: queryStats.slowestQueries[0]?.query || 'N/A',
          slowestQueryTime: queryStats.slowestQueries[0]?.executionTime || 0
        },
        cachePerformance: {
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          hitRate: cacheStats.hitRate,
          strategy: cacheStats.strategy
        },
        websocketPerformance: {
          connectionCount: websocketConnections.length,
          averagePingTime: this.calculateAveragePingTime(websocketConnections),
          messageThroughput: 0 // TODO: 実装
        },
        systemPerformance: {
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: await this.getCpuUsage(),
          responseTime: await this.measureResponseTime()
        }
      }

      this.metrics.push(metrics)

      // メトリクスサイズ制限
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics)
      }

      // パフォーマンス警告チェック
      this.checkPerformanceWarnings(metrics)

    } catch (error) {
      console.error('Failed to collect performance metrics:', error)
    }
  }

  // Merkle DAG: performance_monitor.calculate_average_ping_time -> ping_time_calculation
  private calculateAveragePingTime(connections: any[]): number {
    if (connections.length === 0) {
      return 0
    }

    const totalPingTime = connections.reduce((sum, conn) => {
      return sum + (Date.now() - conn.lastPing)
    }, 0)

    return totalPingTime / connections.length
  }

  // Merkle DAG: performance_monitor.get_cpu_usage -> cpu_usage_measurement
  private async getCpuUsage(): Promise<number> {
    try {
      const startUsage = process.cpuUsage()
      await new Promise(resolve => setTimeout(resolve, 100))
      const endUsage = process.cpuUsage(startUsage)

      const totalTime = (endUsage.user + endUsage.system) / 1000000 // マイクロ秒から秒に変換
      return totalTime * 100 // パーセンテージとして返す
    } catch (error) {
      console.error('Failed to measure CPU usage:', error)
      return 0
    }
  }

  // Merkle DAG: performance_monitor.measure_response_time -> response_time_measurement
  private async measureResponseTime(): Promise<number> {
    try {
      const startTime = Date.now()
      
      // 簡単なヘルスチェッククエリを実行
      const queryOptimizer = getQueryOptimizer()
      await queryOptimizer.executeWithoutCache('RETURN 1 as test')
      
      return Date.now() - startTime
    } catch (error) {
      console.error('Failed to measure response time:', error)
      return 0
    }
  }

  // Merkle DAG: performance_monitor.check_performance_warnings -> performance_alerts
  private checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    const warnings: string[] = []

    // クエリパフォーマンス警告
    if (metrics.queryPerformance.averageExecutionTime > 1000) {
      warnings.push(`High average query execution time: ${metrics.queryPerformance.averageExecutionTime}ms`)
    }

    if (metrics.queryPerformance.cacheHitRate < 50) {
      warnings.push(`Low cache hit rate: ${metrics.queryPerformance.cacheHitRate.toFixed(1)}%`)
    }

    if (metrics.queryPerformance.slowestQueryTime > 5000) {
      warnings.push(`Very slow query detected: ${metrics.queryPerformance.slowestQueryTime}ms`)
    }

    // キャッシュパフォーマンス警告
    if (metrics.cachePerformance.size > metrics.cachePerformance.maxSize * 0.9) {
      warnings.push(`Cache near capacity: ${metrics.cachePerformance.size}/${metrics.cachePerformance.maxSize}`)
    }

    // WebSocketパフォーマンス警告
    if (metrics.websocketPerformance.averagePingTime > 30000) {
      warnings.push(`High WebSocket ping time: ${metrics.websocketPerformance.averagePingTime}ms`)
    }

    // システムパフォーマンス警告
    if (metrics.systemPerformance.memoryUsage > 1024 * 1024 * 1024) { // 1GB
      warnings.push(`High memory usage: ${(metrics.systemPerformance.memoryUsage / 1024 / 1024).toFixed(1)}MB`)
    }

    if (metrics.systemPerformance.responseTime > 1000) {
      warnings.push(`High response time: ${metrics.systemPerformance.responseTime}ms`)
    }

    // 警告をログ出力
    if (warnings.length > 0) {
      console.warn('Performance warnings:', warnings)
    }
  }

  // Merkle DAG: performance_monitor.get_metrics -> metrics_retrieval
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  // Merkle DAG: performance_monitor.get_latest_metrics -> latest_metrics
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  // Merkle DAG: performance_monitor.get_performance_summary -> performance_summary
  getPerformanceSummary(): {
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
    trends: {
      queryPerformance: 'improving' | 'stable' | 'degrading'
      cachePerformance: 'improving' | 'stable' | 'degrading'
      systemPerformance: 'improving' | 'stable' | 'degrading'
    }
  } {
    const latest = this.getLatestMetrics()
    if (!latest) {
      return {
        overallHealth: 'warning',
        issues: ['No performance data available'],
        recommendations: ['Start performance monitoring'],
        trends: {
          queryPerformance: 'stable',
          cachePerformance: 'stable',
          systemPerformance: 'stable'
        }
      }
    }

    const issues: string[] = []
    const recommendations: string[] = []
    let healthScore = 100

    // クエリパフォーマンス評価
    if (latest.queryPerformance.averageExecutionTime > 1000) {
      issues.push('Slow query performance')
      healthScore -= 20
      recommendations.push('Optimize slow queries')
    }

    if (latest.queryPerformance.cacheHitRate < 50) {
      issues.push('Low cache hit rate')
      healthScore -= 15
      recommendations.push('Review cache strategy')
    }

    // キャッシュパフォーマンス評価
    if (latest.cachePerformance.size > latest.cachePerformance.maxSize * 0.9) {
      issues.push('Cache near capacity')
      healthScore -= 10
      recommendations.push('Increase cache size or optimize eviction strategy')
    }

    // システムパフォーマンス評価
    if (latest.systemPerformance.memoryUsage > 1024 * 1024 * 1024) {
      issues.push('High memory usage')
      healthScore -= 25
      recommendations.push('Monitor memory leaks')
    }

    if (latest.systemPerformance.responseTime > 1000) {
      issues.push('High response time')
      healthScore -= 20
      recommendations.push('Optimize system performance')
    }

    // 全体ヘルス判定
    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical'
    if (healthScore >= 90) {
      overallHealth = 'excellent'
    } else if (healthScore >= 70) {
      overallHealth = 'good'
    } else if (healthScore >= 50) {
      overallHealth = 'warning'
    } else {
      overallHealth = 'critical'
    }

    // トレンド分析（簡易版）
    const trends = {
      queryPerformance: 'stable' as const,
      cachePerformance: 'stable' as const,
      systemPerformance: 'stable' as const
    }

    return {
      overallHealth,
      issues,
      recommendations,
      trends
    }
  }

  // Merkle DAG: performance_monitor.clear_metrics -> metrics_cleanup
  clearMetrics(): void {
    this.metrics = []
  }

  // Merkle DAG: performance_monitor.export_metrics -> metrics_export
  exportMetrics(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2)
    } else {
      const headers = [
        'timestamp',
        'totalQueries',
        'averageExecutionTime',
        'cacheHitRate',
        'slowestQueryTime',
        'cacheSize',
        'cacheMaxSize',
        'connectionCount',
        'averagePingTime',
        'memoryUsage',
        'cpuUsage',
        'responseTime'
      ]

      const rows = this.metrics.map(metric => [
        new Date(metric.timestamp).toISOString(),
        metric.queryPerformance.totalQueries,
        metric.queryPerformance.averageExecutionTime,
        metric.queryPerformance.cacheHitRate,
        metric.queryPerformance.slowestQueryTime,
        metric.cachePerformance.size,
        metric.cachePerformance.maxSize,
        metric.websocketPerformance.connectionCount,
        metric.websocketPerformance.averagePingTime,
        metric.systemPerformance.memoryUsage,
        metric.systemPerformance.cpuUsage,
        metric.systemPerformance.responseTime
      ])

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }
  }
}

// Merkle DAG: performance_monitor_singleton -> unified_performance_monitoring
// シングルトンインスタンス
let performanceMonitorInstance: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor()
  }
  return performanceMonitorInstance
}
