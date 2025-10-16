// Merkle DAG: experiment_detail_page -> experiment_overview_display
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FlaskConical, Users, Activity, BarChart3, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ExperimentDetail {
  id: string
  name: string
  description?: string
  participantCount: number
  sessionCount: number
  averageSpiritProbability: number
  createdAt: string
  updatedAt: string
  status: 'active' | 'completed' | 'draft'
}

// Placeholder data - will be replaced with Neo4j query
async function getExperimentDetail(experimentId: string): Promise<ExperimentDetail | null> {
  // TODO: Implement Neo4j query for experiment detail
  return {
    id: experimentId,
    name: 'Spirit in Physics Study 2024',
    description: 'Main experiment for Spirit in Physics research',
    participantCount: 12,
    sessionCount: 24,
    averageSpiritProbability: 0.724,
    createdAt: '2024-10-01',
    updatedAt: '2024-10-16',
    status: 'active'
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-500'
    case 'completed': return 'bg-blue-500'
    case 'draft': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

function ExperimentOverview({ experiment }: { experiment: ExperimentDetail }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/experiments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              実験一覧に戻る
            </Button>
          </Link>
        </div>
        <Badge className={getStatusColor(experiment.status)}>
          {experiment.status === 'active' ? '進行中' : 
           experiment.status === 'completed' ? '完了' : '下書き'}
        </Badge>
      </div>

      {/* Experiment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {experiment.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {experiment.description && (
            <p className="text-muted-foreground">{experiment.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{experiment.participantCount}</div>
                <div className="text-sm text-muted-foreground">参加者</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{experiment.sessionCount}</div>
                <div className="text-sm text-muted-foreground">セッション</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">
                  {(experiment.averageSpiritProbability * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">平均Spirit確率</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{formatDate(experiment.createdAt)}</div>
                <div className="text-sm text-muted-foreground">作成日</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`/experiments/${experiment.id}/sessions`}>
              <Button variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                セッション管理
              </Button>
            </Link>
            <Link href={`/experiments/${experiment.id}/participants`}>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                参加者管理
              </Button>
            </Link>
            <Link href={`/experiments/${experiment.id}/analysis`}>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                分析結果
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded w-32"></div>
        <div className="h-6 bg-muted rounded w-16"></div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function ExperimentDetailWrapper({ experimentId }: { experimentId: string }) {
  const experiment = await getExperimentDetail(experimentId)
  if (!experiment) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">実験が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          指定された実験IDが存在しないか、アクセス権限がありません。
        </p>
      </div>
    )
  }
  return <ExperimentOverview experiment={experiment} />
}

export default async function ExperimentDetailPage({ 
  params 
}: { 
  params: { experimentId: string } 
}) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ExperimentDetailWrapper experimentId={params.experimentId} />
    </Suspense>
  )
}
