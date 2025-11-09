// Merkle DAG: dataset_list_component -> dataset_display_ui
// Component to display list of available datasets

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, Database, Loader2 } from 'lucide-react'

interface DatasetInfo {
  participantId: string
  path: string
  files: {
    sessionData: boolean
    consent: boolean
    physiological: string[]
    humeArtifacts: string[]
  }
  lastModified: string
}

interface DatasetListProps {
  datasets: DatasetInfo[]
  loading: boolean
}

export default function DatasetList({ datasets, loading }: DatasetListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">データセットを読み込み中...</span>
      </div>
    )
  }

  if (datasets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        データセットが見つかりません
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {datasets.map((dataset) => (
        <Card key={dataset.participantId} className="p-3">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{dataset.participantId}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dataset.files.sessionData ? (
                    <Badge variant="default" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Session
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      No Session
                    </Badge>
                  )}
                  {dataset.files.consent && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Consent
                    </Badge>
                  )}
                  {dataset.files.physiological.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      CSV ({dataset.files.physiological.length})
                    </Badge>
                  )}
                  {dataset.files.humeArtifacts.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Hume ({dataset.files.humeArtifacts.length})
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(dataset.lastModified).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

