'use client'

// Merkle DAG: performance_chart -> performance_visualization_component
// Single responsibility: Display performance metrics in chart format
// Open/Closed: Extensible for new chart types and data sources
// Liskov Substitution: Implements ChartComponent interface
// Interface Segregation: Focused on performance visualization only
// Dependency Inversion: Depends on chart interface, not concrete implementation

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus
} from 'lucide-react'

// Merkle DAG: performance_chart -> performance_data_interface
export interface PerformanceDataPoint {
  timestamp: Date
  value: number
  label?: string
}

// Merkle DAG: performance_chart -> performance_metric_interface
export interface PerformanceMetric {
  id: string
  name: string
  data: PerformanceDataPoint[]
  unit: string
  color: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  average?: number
  min?: number
  max?: number
}

// Merkle DAG: performance_chart -> chart_props_interface
export interface PerformanceChartProps {
  title: string
  metrics: PerformanceMetric[]
  isLoading?: boolean
  timeRange?: '1h' | '24h' | '7d' | '30d'
  className?: string
}

// Merkle DAG: performance_chart -> trend_icon_component
function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case 'down':
      return <TrendingDown className="h-3 w-3 text-red-500" />
    case 'stable':
      return <Minus className="h-3 w-3 text-gray-500" />
    default:
      return null
  }
}

// Merkle DAG: performance_chart -> metric_summary_component
function MetricSummary({ metric }: { metric: PerformanceMetric }) {
  return (
    <div className="p-3 bg-card rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {metric.icon}
          <span className="text-sm font-medium">{metric.name}</span>
        </div>
        <TrendIcon trend={metric.trend} />
      </div>
      
      <div className="space-y-1">
        <div className="text-lg font-bold">
          {metric.average?.toFixed(2) || 'N/A'} {metric.unit}
        </div>
        <div className="text-xs text-muted-foreground">
          範囲: {metric.min?.toFixed(2) || 'N/A'} - {metric.max?.toFixed(2) || 'N/A'} {metric.unit}
        </div>
        <div className="text-xs text-muted-foreground">
          データポイント: {metric.data.length}件
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: performance_chart -> simple_chart_component
function SimpleChart({ data, color }: { data: PerformanceDataPoint[], color: string }) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        データがありません
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className="h-32 flex items-end gap-1 p-2">
      {data.slice(-20).map((point, index) => {
        const height = ((point.value - minValue) / range) * 100
        return (
          <div
            key={`${point.timestamp.getTime()}-${index}`}
            className={`flex-1 ${color} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(height, 2)}%` }}
            title={`${point.timestamp.toLocaleTimeString()}: ${point.value.toFixed(2)}`}
          />
        )
      })}
    </div>
  )
}

// Merkle DAG: performance_chart -> chart_legend_component
function ChartLegend({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      {metrics.map((metric) => (
        <div key={metric.id} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded ${metric.color}`} />
          <span>{metric.name}</span>
        </div>
      ))}
    </div>
  )
}

// Merkle DAG: performance_chart -> main_component
export function PerformanceChart({ 
  title, 
  metrics, 
  isLoading = false, 
  timeRange = '24h', 
  className = '' 
}: PerformanceChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">パフォーマンスデータを読み込み中...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (metrics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">パフォーマンスデータがありません</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            期間: {timeRange}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricSummary key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Charts */}
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={`chart-${metric.id}`} className="space-y-2">
              <div className="flex items-center gap-2">
                {metric.icon}
                <span className="text-sm font-medium">{metric.name}</span>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <SimpleChart data={metric.data} color={metric.color} />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <ChartLegend metrics={metrics} />
      </CardContent>
    </Card>
  )
}
