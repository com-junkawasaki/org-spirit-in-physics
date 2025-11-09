// Merkle DAG: import_executor_component -> import_execution_ui
// Component to execute data import

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DatasetInfo {
  participantId: string
  files: {
    sessionData: boolean
    consent: boolean
    physiological: string[]
    humeArtifacts: string[]
  }
}

interface ImportExecutorProps {
  datasets: DatasetInfo[]
  onImportStart: (participantId: string) => void
}

export default function ImportExecutor({ datasets, onImportStart }: ImportExecutorProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    if (!selectedParticipantId) {
      setError('データセットを選択してください')
      return
    }

    // Check if dataset has required files
    const dataset = datasets.find(d => d.participantId === selectedParticipantId)
    if (!dataset) {
      setError('データセットが見つかりません')
      return
    }

    if (!dataset.files.sessionData) {
      setError('session_data.jsonが見つかりません')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: selectedParticipantId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'インポートの開始に失敗しました')
      }

      const data = await response.json()
      onImportStart(selectedParticipantId)
      setSelectedParticipantId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Filter datasets that have session data
  const importableDatasets = datasets.filter(d => d.files.sessionData)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="データセットを選択" />
          </SelectTrigger>
          <SelectContent>
            {importableDatasets.map((dataset) => (
              <SelectItem key={dataset.participantId} value={dataset.participantId}>
                {dataset.participantId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleImport} 
          disabled={loading || !selectedParticipantId}
        >
          <Upload className="h-4 w-4 mr-2" />
          {loading ? '実行中...' : 'インポート実行'}
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
}

