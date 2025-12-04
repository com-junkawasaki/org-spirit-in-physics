'use client'

import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react'

type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'connected'
  | 'disconnected'

interface StatusBadgeProps {
  status: StatusType
  text?: string
  showIcon?: boolean
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ReactNode
  color: string
}> = {
  success: {
    label: '成功',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-green-600 bg-green-100'
  },
  error: {
    label: 'エラー',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-red-600 bg-red-100'
  },
  failed: {
    label: '失敗',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-red-600 bg-red-100'
  },
  warning: {
    label: '警告',
    variant: 'outline',
    icon: <AlertCircle className="h-3 w-3" />,
    color: 'text-yellow-600 bg-yellow-100'
  },
  info: {
    label: '情報',
    variant: 'secondary',
    icon: <AlertCircle className="h-3 w-3" />,
    color: 'text-blue-600 bg-blue-100'
  },
  pending: {
    label: '待機中',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
    color: 'text-gray-600 bg-gray-100'
  },
  running: {
    label: '実行中',
    variant: 'default',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: 'text-blue-600 bg-blue-100'
  },
  completed: {
    label: '完了',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-green-600 bg-green-100'
  },
  cancelled: {
    label: 'キャンセル',
    variant: 'outline',
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-gray-600 bg-gray-100'
  },
  paused: {
    label: '一時停止',
    variant: 'outline',
    icon: <Pause className="h-3 w-3" />,
    color: 'text-yellow-600 bg-yellow-100'
  },
  connected: {
    label: '接続済み',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
    color: 'text-green-600 bg-green-100'
  },
  disconnected: {
    label: '未接続',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    color: 'text-red-600 bg-red-100'
  }
}

export function StatusBadge({ status, text, showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.info
  const displayText = text || config.label

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1 font-medium",
        className
      )}
    >
      {showIcon && config.icon}
      {displayText}
    </Badge>
  )
}

// 実験タイプのバッジ
interface ExperimentTypeBadgeProps {
  type: 'physiological' | 'online' | 'unified'
  className?: string
}

export function ExperimentTypeBadge({ type, className }: ExperimentTypeBadgeProps) {
  const typeConfig = {
    physiological: {
      label: '生理実験',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '🫀'
    },
    online: {
      label: 'オンライン実験',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '💻'
    },
    unified: {
      label: '統合実験',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '🔄'
    }
  }

  const config = typeConfig[type]

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 font-medium",
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  )
}
