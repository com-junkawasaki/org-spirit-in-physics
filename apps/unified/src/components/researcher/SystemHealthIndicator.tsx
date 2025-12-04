'use client'

// Merkle DAG: system_health_indicator -> health_status_component
// Single responsibility: Display system health status with visual indicators
// Open/Closed: Extensible for new health check types
// Liskov Substitution: Implements HealthIndicator interface
// Interface Segregation: Focused on health status display only
// Dependency Inversion: Depends on health interface, not concrete implementation

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Activity,
  // Database,
  Brain,
  Server
} from 'lucide-react'

// Merkle DAG: system_health_indicator -> health_status_interface
export interface HealthStatus {
  service: string
  status: 'healthy' | 'degraded' | 'critical' | 'unknown'
  message: string
  responseTime?: number
  lastChecked?: Date
  details?: Record<string, unknown>
}

// Merkle DAG: system_health_indicator -> health_indicator_props
export interface SystemHealthIndicatorProps {
  healthStatuses: HealthStatus[]
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown'
  isLoading?: boolean
  lastChecked?: Date
  className?: string
}

// Merkle DAG: system_health_indicator -> service_icon_component
function ServiceIcon({ service }: { service: string }) {
  switch (service.toLowerCase()) {
    case 'workflows':
      return <Clock className="h-4 w-4" />
    case 'hume ai':
      return <Brain className="h-4 w-4" />
    default:
      return <Server className="h-4 w-4" />
  }
}

// Merkle DAG: system_health_indicator -> status_icon_component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'degraded':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

// Merkle DAG: system_health_indicator -> status_badge_component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <Badge variant="default" className="bg-green-500">正常</Badge>
    case 'degraded':
      return <Badge variant="secondary" className="bg-yellow-500 text-black">劣化</Badge>
    case 'critical':
      return <Badge variant="destructive">危険</Badge>
    default:
      return <Badge variant="outline">不明</Badge>
  }
}

// Merkle DAG: system_health_indicator -> overall_status_component
function OverallStatus({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'システム正常'
      case 'degraded':
        return 'システム劣化'
      case 'critical':
        return 'システム危険'
      default:
        return 'システム状態不明'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon status={status} />
        <span className="font-semibold">{getStatusText(status)}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        全サービスが正常に動作しています
      </div>
    </div>
  )
}

// Merkle DAG: system_health_indicator -> service_status_component
function ServiceStatus({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <ServiceIcon service={healthStatus.service} />
        <div>
          <div className="font-medium text-sm">{healthStatus.service}</div>
          <div className="text-xs text-muted-foreground">{healthStatus.message}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <StatusBadge status={healthStatus.status} />
        {healthStatus.responseTime && (
          <div className="text-xs text-muted-foreground">
            {healthStatus.responseTime}ms
          </div>
        )}
      </div>
    </div>
  )
}

// Merkle DAG: system_health_indicator -> main_component
export function SystemHealthIndicator({ 
  healthStatuses, 
  overallStatus, 
  isLoading = false, 
  lastChecked, 
  className = '' 
}: SystemHealthIndicatorProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            システムヘルス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">ヘルス状態を確認中...</div>
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
            システムヘルス
          </CardTitle>
          {lastChecked && (
            <div className="text-xs text-muted-foreground">
              最終確認: {lastChecked.toLocaleTimeString('ja-JP')}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OverallStatus status={overallStatus} />
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">サービス別状態</h4>
          <div className="space-y-2">
            {healthStatuses.map((healthStatus) => (
              <ServiceStatus key={healthStatus.service} healthStatus={healthStatus} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
