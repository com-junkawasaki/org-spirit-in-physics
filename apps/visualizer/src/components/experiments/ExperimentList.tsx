// Merkle DAG: experiment_list -> experiment_collection_component
// 実験一覧コンポーネント - Reactコンポーネントとの連携

'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SortAsc, 
  SortDesc,
  Plus,
  RefreshCw
} from 'lucide-react'
import { ExperimentCard } from './ExperimentCard'
import { ExperimentData } from '@/lib/data'

interface ExperimentListProps {
  experiments: ExperimentData[]
  isLoading?: boolean
  onRefresh?: () => void
  onCreateNew?: () => void
}

type ViewMode = 'grid' | 'list'
type SortField = 'name' | 'createdAt' | 'participantCount' | 'sessionCount' | 'averageSpiritProbability'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'completed' | 'draft'

export function ExperimentList({ 
  experiments, 
  isLoading = false, 
  onRefresh,
  onCreateNew 
}: ExperimentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // フィルタリングとソート
  const filteredAndSortedExperiments = useMemo(() => {
    let filtered = experiments.filter(experiment => {
      // 検索クエリフィルタ
      const matchesSearch = searchQuery === '' || 
        experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        experiment.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // ステータスフィルタ
      const matchesStatus = statusFilter === 'all' || experiment.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // ソート
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'participantCount':
          aValue = a.participantCount
          bValue = b.participantCount
          break
        case 'sessionCount':
          aValue = a.sessionCount
          bValue = b.sessionCount
          break
        case 'averageSpiritProbability':
          aValue = a.averageSpiritProbability
          bValue = b.averageSpiritProbability
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [experiments, searchQuery, sortField, sortOrder, statusFilter])

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">実験一覧</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedExperiments.length}件の実験が見つかりました
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          )}
          {onCreateNew && (
            <Button size="sm" onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          )}
        </div>
      </div>

      {/* フィルタとソート */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 検索 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="実験名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* ステータスフィルタ */}
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
              </SelectContent>
            </Select>

            {/* ソート */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('name')}
                className="flex items-center gap-1"
              >
                名前 {getSortIcon('name')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('createdAt')}
                className="flex items-center gap-1"
              >
                日付 {getSortIcon('createdAt')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('averageSpiritProbability')}
                className="flex items-center gap-1"
              >
                Spirit {getSortIcon('averageSpiritProbability')}
              </Button>
            </div>

            {/* ビューモード */}
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 実験リスト */}
      {filteredAndSortedExperiments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">実験が見つかりません</h3>
              <p className="text-sm">
                {searchQuery ? '検索条件に一致する実験がありません' : 'まだ実験が作成されていません'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        }>
          {filteredAndSortedExperiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
