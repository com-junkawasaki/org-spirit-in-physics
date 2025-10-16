// Merkle DAG: experiment_card -> experiment_display_component
// 実験カードコンポーネント - Reactコンポーネントとの連携

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FlaskConical, 
  Users, 
  Activity, 
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { ExperimentData } from '@/lib/data'
import { getSpiritProbabilityColor } from '@/components/SpiritProbabilityBadge'

interface ExperimentCardProps {
  experiment: ExperimentData
  showActions?: boolean
  compact?: boolean
}

export function ExperimentCard({ experiment, showActions = true, compact = false }: ExperimentCardProps) {
  const spiritProbabilityPercentage = (experiment.averageSpiritProbability * 100).toFixed(1)
  const statusColor = experiment.status === 'active' ? 'bg-green-100 text-green-800' : 
                     experiment.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                     'bg-gray-100 text-gray-800'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm truncate">{experiment.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {experiment.participantCount}名 • {experiment.sessionCount}セッション
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getSpiritProbabilityColor(experiment.averageSpiritProbability)}>
                {spiritProbabilityPercentage}%
              </Badge>
              {showActions && (
                <Link href={`/experiments/${experiment.id}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {experiment.name}
            </CardTitle>
            {experiment.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {experiment.description}
              </p>
            )}
          </div>
          <Badge className={statusColor}>
            {experiment.status === 'active' ? '進行中' : 
             experiment.status === 'completed' ? '完了' : '下書き'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 統計情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{experiment.participantCount}</p>
              <p className="text-xs text-muted-foreground">参加者</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{experiment.sessionCount}</p>
              <p className="text-xs text-muted-foreground">セッション</p>
            </div>
          </div>
        </div>

        {/* Spirit確率 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">平均Spirit確率</span>
            <Badge className={getSpiritProbabilityColor(experiment.averageSpiritProbability)}>
              {spiritProbabilityPercentage}%
            </Badge>
          </div>
          <Progress 
            value={experiment.averageSpiritProbability * 100} 
            className="h-2"
          />
        </div>

        {/* 日付情報 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>開始: {formatDate(experiment.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>更新: {formatDate(experiment.updatedAt)}</span>
          </div>
        </div>

        {/* アクションボタン */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Link href={`/experiments/${experiment.id}`} className="flex-1">
              <Button className="w-full" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                詳細を見る
              </Button>
            </Link>
            <Link href={`/experiments/${experiment.id}/analysis`}>
              <Button variant="outline" size="sm">
                分析
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
