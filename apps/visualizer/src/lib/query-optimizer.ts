// Merkle DAG: query_optimizer -> performance_optimization_query
// クエリ最適化システム - Neo4jクエリのパフォーマンス最適化

import { createNeo4jClient } from './neo4j'
import { getCacheManager } from './cache-manager'

interface QueryMetrics {
  query: string
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: number
}

interface OptimizationRule {
  name: string
  pattern: RegExp
  replacement: string
  description: string
}

export class QueryOptimizer {
  private client: ReturnType<typeof createNeo4jClient>
  private cache: ReturnType<typeof getCacheManager>
  private metrics: QueryMetrics[] = []
  private readonly maxMetrics = 1000

  constructor() {
    this.client = createNeo4jClient()
    this.cache = getCacheManager()
  }

  // Merkle DAG: query_optimizer.optimize -> query_optimization
  optimizeQuery(query: string): string {
    let optimizedQuery = query

    // 基本的な最適化ルール
    const rules: OptimizationRule[] = [
      {
        name: 'remove_unnecessary_optional_match',
        pattern: /OPTIONAL MATCH \(([^)]+)\) WHERE \1 IS NOT NULL/g,
        replacement: 'MATCH ($1)',
        description: 'Remove unnecessary OPTIONAL MATCH when followed by IS NOT NULL check'
      },
      {
        name: 'optimize_count_distinct',
        pattern: /count\(DISTINCT ([^)]+)\)/g,
        replacement: 'count(DISTINCT $1)',
        description: 'Optimize count(DISTINCT) usage'
      },
      {
        name: 'add_index_hints',
        pattern: /MATCH \(([^:]+):([^)]+)\) WHERE \1\.id = \$([^)]+)\)/g,
        replacement: 'MATCH ($1:$2) USING INDEX $1:id WHERE $1.id = $$3)',
        description: 'Add index hints for ID lookups'
      },
      {
        name: 'optimize_with_clause',
        pattern: /WITH ([^,]+), count\(([^)]+)\) as ([^,\s]+)/g,
        replacement: 'WITH $1, count($2) as $3',
        description: 'Optimize WITH clause aggregation'
      }
    ]

    // ルールを適用
    rules.forEach(rule => {
      const beforeLength = optimizedQuery.length
      optimizedQuery = optimizedQuery.replace(rule.pattern, rule.replacement)
      
      if (optimizedQuery.length !== beforeLength) {
        console.log(`Applied optimization rule: ${rule.name} - ${rule.description}`)
      }
    })

    return optimizedQuery
  }

  // Merkle DAG: query_optimizer.execute_with_cache -> cached_execution
  async executeWithCache<T>(query: string, params: Record<string, any> = {}, ttl: number = 300000): Promise<T[]> {
    const cacheKey = this.generateCacheKey(query, params)
    
    // キャッシュから取得を試行
    const cachedResult = this.cache.get<T[]>(cacheKey)
    if (cachedResult) {
      this.recordMetrics(query, 0, cachedResult.length, true)
      return cachedResult
    }

    // クエリを最適化
    const optimizedQuery = this.optimizeQuery(query)
    
    // クエリ実行
    const startTime = Date.now()
    const result = await this.client.query(optimizedQuery, params)
    const executionTime = Date.now() - startTime

    // メトリクス記録
    this.recordMetrics(optimizedQuery, executionTime, result.length, false)

    // 結果をキャッシュ
    this.cache.set(cacheKey, result, ttl)

    return result
  }

  // Merkle DAG: query_optimizer.execute_without_cache -> direct_execution
  async executeWithoutCache<T>(query: string, params: Record<string, any> = {}): Promise<T[]> {
    const optimizedQuery = this.optimizeQuery(query)
    
    const startTime = Date.now()
    const result = await this.client.query(optimizedQuery, params)
    const executionTime = Date.now() - startTime

    this.recordMetrics(optimizedQuery, executionTime, result.length, false)

    return result
  }

  // Merkle DAG: query_optimizer.generate_cache_key -> cache_key_generation
  private generateCacheKey(query: string, params: Record<string, any>): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim()
    const paramsString = JSON.stringify(params, Object.keys(params).sort())
    return `query:${Buffer.from(normalizedQuery + paramsString).toString('base64')}`
  }

  // Merkle DAG: query_optimizer.record_metrics -> performance_metrics
  private recordMetrics(query: string, executionTime: number, resultCount: number, cacheHit: boolean): void {
    const metric: QueryMetrics = {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      executionTime,
      resultCount,
      cacheHit,
      timestamp: Date.now()
    }

    this.metrics.push(metric)

    // メトリクスサイズ制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  // Merkle DAG: query_optimizer.get_performance_stats -> performance_analysis
  getPerformanceStats(): {
    totalQueries: number
    averageExecutionTime: number
    cacheHitRate: number
    slowestQueries: QueryMetrics[]
    mostFrequentQueries: Array<{ query: string; count: number; avgTime: number }>
  } {
    const totalQueries = this.metrics.length
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
    const averageExecutionTime = totalQueries > 0 
      ? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0

    // 最も遅いクエリ
    const slowestQueries = [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10)

    // 最も頻繁なクエリ
    const queryFrequency = new Map<string, { count: number; totalTime: number }>()
    this.metrics.forEach(metric => {
      const existing = queryFrequency.get(metric.query) || { count: 0, totalTime: 0 }
      queryFrequency.set(metric.query, {
        count: existing.count + 1,
        totalTime: existing.totalTime + metric.executionTime
      })
    })

    const mostFrequentQueries = Array.from(queryFrequency.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalQueries,
      averageExecutionTime,
      cacheHitRate,
      slowestQueries,
      mostFrequentQueries
    }
  }

  // Merkle DAG: query_optimizer.clear_metrics -> metrics_cleanup
  clearMetrics(): void {
    this.metrics = []
  }

  // Merkle DAG: query_optimizer.analyze_query -> query_analysis
  analyzeQuery(query: string): {
    complexity: 'low' | 'medium' | 'high'
    estimatedCost: number
    recommendations: string[]
  } {
    const recommendations: string[] = []
    let complexity: 'low' | 'medium' | 'high' = 'low'
    let estimatedCost = 0

    // クエリ複雑度分析
    const matchCount = (query.match(/MATCH/g) || []).length
    const optionalMatchCount = (query.match(/OPTIONAL MATCH/g) || []).length
    const withCount = (query.match(/WITH/g) || []).length
    const unwindCount = (query.match(/UNWIND/g) || []).length

    estimatedCost += matchCount * 10
    estimatedCost += optionalMatchCount * 15
    estimatedCost += withCount * 5
    estimatedCost += unwindCount * 20

    // 複雑度判定
    if (estimatedCost > 100) {
      complexity = 'high'
    } else if (estimatedCost > 50) {
      complexity = 'medium'
    }

    // 推奨事項生成
    if (matchCount > 5) {
      recommendations.push('Consider breaking down complex MATCH patterns into smaller queries')
    }

    if (optionalMatchCount > 3) {
      recommendations.push('Review OPTIONAL MATCH usage - consider if all are necessary')
    }

    if (unwindCount > 0) {
      recommendations.push('UNWIND operations are expensive - ensure they are necessary')
    }

    if (query.includes('count(DISTINCT')) {
      recommendations.push('Consider using count() instead of count(DISTINCT) if possible')
    }

    if (!query.includes('LIMIT') && complexity === 'high') {
      recommendations.push('Add LIMIT clause to prevent large result sets')
    }

    return {
      complexity,
      estimatedCost,
      recommendations
    }
  }

  // Merkle DAG: query_optimizer.create_indexes -> index_creation
  async createRecommendedIndexes(): Promise<void> {
    const indexQueries = [
      'CREATE INDEX participant_id IF NOT EXISTS FOR (p:Participant) ON (p.id)',
      'CREATE INDEX experiment_id IF NOT EXISTS FOR (e:Experiment) ON (e.id)',
      'CREATE INDEX session_id IF NOT EXISTS FOR (s:ExperimentSession) ON (s.id)',
      'CREATE INDEX response_participant IF NOT EXISTS FOR (r:Response) ON (r.participant_id)',
      'CREATE INDEX response_experiment IF NOT EXISTS FOR (r:Response) ON (r.experiment_id)',
      'CREATE INDEX response_session IF NOT EXISTS FOR (r:Response) ON (r.session_id)',
      'CREATE INDEX response_timestamp IF NOT EXISTS FOR (r:Response) ON (r.event_ts)',
      'CREATE INDEX session_participant IF NOT EXISTS FOR (s:ExperimentSession) ON (s.participant_id)',
      'CREATE INDEX session_experiment IF NOT EXISTS FOR (s:ExperimentSession) ON (s.experiment_id)',
      'CREATE INDEX session_start_time IF NOT EXISTS FOR (s:ExperimentSession) ON (s.start_ts)'
    ]

    for (const indexQuery of indexQueries) {
      try {
        await this.client.query(indexQuery)
        console.log(`Created index: ${indexQuery}`)
      } catch (error) {
        console.warn(`Failed to create index: ${indexQuery}`, error)
      }
    }
  }
}

// Merkle DAG: query_optimizer_singleton -> unified_query_optimization
// シングルトンインスタンス
let queryOptimizerInstance: QueryOptimizer | null = null

export function getQueryOptimizer(): QueryOptimizer {
  if (!queryOptimizerInstance) {
    queryOptimizerInstance = new QueryOptimizer()
  }
  return queryOptimizerInstance
}
