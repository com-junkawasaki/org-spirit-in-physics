// Merkle DAG: import_progress_component -> import_progress_display_ui
// Component to display import progress

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface ImportProgressProps {
  participantId: string
  onComplete: () => void
}

export default function ImportProgress({ participantId, onComplete }: ImportProgressProps) {
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed' | 'unknown'>('pending')
  const [logs, setLogs] = useState<string[]>([])
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/admin/import/status?participantId=${participantId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data.status)
          setLogs(data.logs || [])
          setLastChecked(data.lastChecked)
          
          if (data.status === 'completed' || data.status === 'failed') {
            setTimeout(() => {
              onComplete()
            }, 3000) // Wait 3 seconds before calling onComplete
          }
        }
      } catch (error) {
        console.error('Error checking import status:', error)
      }
    }

    // Check immediately
    checkStatus()

    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [participantId, onComplete])

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'failed':
        return '失敗'
      case 'in_progress':
        return '進行中'
      case 'pending':
        return '待機中'
      default:
        return '不明'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">インポート進捗: {participantId}</span>
            </div>
            <Badge className={getStatusColor()}>
              {getStatusLabel()}
            </Badge>
          </div>
          
          {status === 'in_progress' && (
            <Progress value={50} className="h-2" />
          )}
          
          {logs.length > 0 && (
            <div className="bg-muted p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-muted-foreground">
                  {log}
                </div>
              ))}
            </div>
          )}
          
          {lastChecked && (
            <div className="text-xs text-muted-foreground">
              最終確認: {new Date(lastChecked).toLocaleString('ja-JP')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

