'use client'

// Merkle DAG: system_metrics_card -> metrics_display_component
// Single responsibility: Display system metrics in card format
// Open/Closed: Extensible for new metric types
// Liskov Substitution: Implements MetricsDisplay interface
// Interface Segregation: Focused on metrics display only
// Dependency Inversion: Depends on metrics interface, not concrete implementation

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Activity, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

// Merkle DAG: system_metrics_card -> metrics_interface
export interface SystemMetric {
  id: string
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  status?: 'healthy' | 'warning' | 'critical'
  description?: string
  icon: React.ReactNode
  color: string
}

// Merkle DAG: system_metrics_card -> metrics_props_interface
export interface SystemMetricsCardProps {
  title: string
  metrics: SystemMetric[]
  isLoading?: boolean
  lastUpdated?: Date
  className?: string
}

// Merkle DAG: system_metrics_card -> trend_icon_component
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

// Merkle DAG: system_metrics_card -> status_badge_component
function StatusBadge({ status }: { status?: 'healthy' | 'warning' | 'critical' }) {
  switch (status) {
    case 'healthy':
      return <Badge variant="default" className="bg-green-500">正常</Badge>
    case 'warning':
      return <Badge variant="secondary" className="bg-yellow-500 text-black">注意</Badge>
    case 'critical':
      return <Badge variant="destructive">危険</Badge>
    default:
      return null
  }
}

// Merkle DAG: system_metrics_card -> metric_item_component
function MetricItem({ metric }: { metric: SystemMetric }) {
  return (
    <div className={`p-4 rounded-lg ${metric.color} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {metric.icon}
          <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon trend={metric.trend} />
          <StatusBadge status={metric.status} />
        </div>
      </div>
      
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
        {metric.unit && <span className="text-sm text-gray-600 ml-1">{metric.unit}</span>}
      </div>
      
      {metric.description && (
        <div className="text-xs text-gray-600">{metric.description}</div>
      )}
    </div>
  )
}

// Merkle DAG: system_metrics_card -> main_component
export function SystemMetricsCard({ 
  title, 
  metrics, 
  isLoading = false, 
  lastUpdated, 
  className = '' 
}: SystemMetricsCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">メトリクスを読み込み中...</div>
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
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricItem key={metric.id} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
