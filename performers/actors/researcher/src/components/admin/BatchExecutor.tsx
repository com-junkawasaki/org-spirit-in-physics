// Merkle DAG: batch_executor_component -> batch_execution_ui
// Component to execute timeline batch processing

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Database, AlertCircle, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DatasetInfo {
  participantId: string
}

interface BatchExecutorProps {
  datasets: DatasetInfo[]
  onBatchStart: (participantId: string) => void
}

export default function BatchExecutor({ datasets, onBatchStart }: BatchExecutorProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('')
  const [incremental, setIncremental] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generatingDisplayData, setGeneratingDisplayData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBatch = async () => {
    if (!selectedParticipantId) {
      setError('参加者IDを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/batch/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participantId: selectedParticipantId,
          incremental 
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'バッチ処理の開始に失敗しました')
      }

      const data = await response.json()
      onBatchStart(selectedParticipantId)
      setSelectedParticipantId('')
      setIncremental(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
          <SelectTrigger>
            <SelectValue placeholder="参加者IDを選択" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((dataset) => (
              <SelectItem key={dataset.participantId} value={dataset.participantId}>
                {dataset.participantId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="incremental" 
            checked={incremental}
            onCheckedChange={(checked) => setIncremental(checked === true)}
          />
          <Label htmlFor="incremental" className="text-sm">
            増分更新（新しいデータのみ処理）
          </Label>
        </div>
      </div>
      
      <Button 
        onClick={handleBatch} 
        disabled={loading || !selectedParticipantId}
        className="w-full"
      >
        <Database className="h-4 w-4 mr-2" />
        {loading ? '実行中...' : incremental ? '増分バッチ実行' : '全量バッチ実行'}
      </Button>
      
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-2">表示用データ生成</h3>
        <p className="text-xs text-muted-foreground mb-3">
          単語区間・1秒単位集約、集計データ、サンプリング済みタイムライン、3D Forceグラフデータを生成します
        </p>
        <Button 
          onClick={handleGenerateDisplayData} 
          disabled={generatingDisplayData || !selectedParticipantId}
          className="w-full"
          variant="outline"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {generatingDisplayData ? '生成中...' : '表示用データ生成'}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  const handleGenerateDisplayData = async () => {
    if (!selectedParticipantId) {
      setError('参加者IDを選択してください')
      return
    }

    setGeneratingDisplayData(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/batch/generate-display-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: selectedParticipantId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '表示用データ生成の開始に失敗しました')
      }

      const data = await response.json()
      onBatchStart(selectedParticipantId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGeneratingDisplayData(false)
    }
  }
}

