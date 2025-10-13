'use client'

// Merkle DAG: system_status_card -> connection_monitoring_ui
// System status card component for displaying connection status

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

interface ConnectionStatus {
  service: string
  status: 'connected' | 'disconnected' | 'error'
  message: string
  responseTime?: number
  details?: Record<string, unknown>
}

interface SystemStatus {
  timestamp: string
  totalResponseTime: number
  services: ConnectionStatus[]
  overallStatus: 'healthy' | 'degraded' | 'error'
}

interface SystemStatusCardProps {
  className?: string
}

export function SystemStatusCard({ className = '' }: SystemStatusCardProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkSystemStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/system-status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setLastChecked(new Date())
      } else {
        console.error('Failed to fetch system status')
      }
    } catch (error) {
      console.error('Error checking system status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSystemStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [checkSystemStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>
      case 'error':
        return <Badge variant="secondary" className="bg-yellow-500 text-black">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getOverallStatusColor = (overallStatus: string) => {
    switch (overallStatus) {
      case 'healthy':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading system status...</p>
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
            <AlertCircle className="h-5 w-5" />
            System Status
            <span className={`text-sm font-normal ${getOverallStatusColor(status.overallStatus)}`}>
              ({status.overallStatus})
            </span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastChecked && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {status.services.map((service) => (
            <div key={service.service} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <h4 className="font-medium">{service.service}</h4>
                  <p className="text-sm text-muted-foreground">{service.message}</p>
                  {service.responseTime && (
                    <p className="text-xs text-muted-foreground">
                      Response time: {service.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(service.status)}
                {service.details && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {service.service === 'ArangoDB' && service.details.database && (
                      <p>DB: {String(service.details.database)}</p>
                    )}
                    {service.service === 'Temporal' && service.details.server && (
                      <p>Server: {String(service.details.server)}</p>
                    )}
                    {service.service === 'Hume AI' && service.details.endpoint && (
                      <p>Endpoint: {String(service.details.endpoint)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total response time:</span>
              <span className="font-medium">{status.totalResponseTime}ms</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Check timestamp:</span>
              <span className="font-medium">{new Date(status.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
