// Merkle DAG: experiments_list_page -> experiment_overview_table
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FlaskConical, Activity, Users, ArrowRight } from 'lucide-react'

interface Experiment {
  id: string
  name: string
  description?: string
  participantCount: number
  sessionCount: number
  averageSpiritProbability: number
  createdAt: string
  status: 'active' | 'completed' | 'draft'
}

// Placeholder data - will be replaced with Neo4j query
async function getAllExperiments(): Promise<Experiment[]> {
  // TODO: Implement Neo4j query for experiments
  return [
    {
      id: 'exp-001',
      name: 'Spirit in Physics Study 2024',
      description: 'Main experiment for Spirit in Physics research',
      participantCount: 12,
      sessionCount: 24,
      averageSpiritProbability: 0.724,
      createdAt: '2024-10-01',
      status: 'active'
    }
  ]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
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

function ExperimentsTable({ experiments }: { experiments: Experiment[] }) {
  if (experiments.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">実験が見つかりません</h3>
        <p className="text-sm text-muted-foreground mt-2">
          新しい実験を作成するか、データをインポートしてください。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>実験名</TableHead>
            <TableHead>参加者数</TableHead>
            <TableHead>セッション数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="w-[100px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((experiment) => (
            <TableRow key={experiment.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{experiment.name}</div>
                  {experiment.description && (
                    <div className="text-sm text-muted-foreground">
                      {experiment.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{experiment.participantCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>{experiment.sessionCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {(experiment.averageSpiritProbability * 100).toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(experiment.status)}>
                  {experiment.status === 'active' ? '進行中' : 
                   experiment.status === 'completed' ? '完了' : '下書き'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(experiment.createdAt)}
              </TableCell>
              <TableCell>
                <Link href={`/experiments/${experiment.id}`}>
                  <Button variant="outline" size="sm">
                    詳細
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LoadingSkeleton() {
  const skeletonKeys = ['sk-1', 'sk-2', 'sk-3']
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>実験名</TableHead>
            <TableHead>参加者数</TableHead>
            <TableHead>セッション数</TableHead>
            <TableHead>平均Spirit確率</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="w-[100px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonKeys.map((key) => (
            <TableRow key={key} className="animate-pulse">
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-8"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-8"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-muted rounded w-12"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-muted rounded w-16"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded w-20"></div>
              </TableCell>
              <TableCell>
                <div className="h-8 bg-muted rounded w-16"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

async function ExperimentsTableWrapper() {
  const experiments = await getAllExperiments()
  if (!experiments || experiments.length === 0) {
    return <LoadingSkeleton />
  }
  return <ExperimentsTable experiments={experiments} />
}

export default async function ExperimentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              実験一覧
            </h1>
            <p className="text-muted-foreground">
              Spirit in Physics実験の管理と分析結果の確認
            </p>
          </div>
          <Button variant="outline">
            <FlaskConical className="h-4 w-4 mr-2" />
            新しい実験
          </Button>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ExperimentsTableWrapper />
      </Suspense>
    </div>
  )
}
