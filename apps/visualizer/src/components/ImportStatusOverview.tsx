'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'

interface ImportStatus {
  participant_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' | 'imported'
  import_type: string
  imported_at?: string
  last_updated: string
  data_sources: string[]
  records_count: {
    sessions: number
    responses: number
    hume_data: number
    physiological_data: number
  }
  error_message?: string
  metadata: Record<string, any>
}

interface ImportSummary {
  total_participants: number
  by_status: Record<string, number>
}

export function ImportStatusOverview() {
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchImportStatuses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch import statuses
      const statusResponse = await fetch('/api/import-status')
      if (!statusResponse.ok) {
        throw new Error('Failed to fetch import statuses')
      }
      const statusData = await statusResponse.json()
      setImportStatuses(statusData.statuses || [])
      
      // Fetch summary
      const summaryResponse = await fetch('/api/import-status/summary')
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch import summary')
      }
      const summaryData = await summaryResponse.json()
      setSummary(summaryData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImportStatuses()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'imported':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'imported':
        return 'インポート済み'
      case 'in_progress':
        return '進行中'
      case 'failed':
        return '失敗'
      case 'partial':
        return '部分的'
      case 'pending':
        return '待機中'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading import status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span className="ml-2 text-red-600">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total_participants}</div>
                <div className="text-sm text-muted-foreground">総参加者数</div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(summary.by_status).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{getStatusLabel(status)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Status Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import Status Details</CardTitle>
            <Button onClick={fetchImportStatuses} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {importStatuses.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                インポート状況が見つかりません
              </div>
            ) : (
              importStatuses.map((status) => (
                <div key={status.participant_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.status)}
                      <div>
                        <div className="font-medium">{status.participant_id}</div>
                        <div className="text-sm text-muted-foreground">
                          {status.import_type} • {status.data_sources.join(', ')}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(status.status)}>
                      {getStatusLabel(status.status)}
                    </Badge>
                  </div>
                  
                  {status.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {status.error_message}
                    </div>
                  )}
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Sessions</div>
                      <div className="text-muted-foreground">{status.records_count.sessions}</div>
                    </div>
                    <div>
                      <div className="font-medium">Responses</div>
                      <div className="text-muted-foreground">{status.records_count.responses}</div>
                    </div>
                    <div>
                      <div className="font-medium">Hume Data</div>
                      <div className="text-muted-foreground">{status.records_count.hume_data}</div>
                    </div>
                    <div>
                      <div className="font-medium">Physiological</div>
                      <div className="text-muted-foreground">{status.records_count.physiological_data}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last updated: {new Date(status.last_updated).toLocaleString()}
                    {status.imported_at && (
                      <span> • Imported: {new Date(status.imported_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
