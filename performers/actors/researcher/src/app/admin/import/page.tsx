// Merkle DAG: admin_import_page -> data_import_management
// Admin page for managing data imports and batch processing

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Upload, Play, Database } from 'lucide-react'
import DatasetList from '@/components/admin/DatasetList'
import ImportExecutor from '@/components/admin/ImportExecutor'
import ImportProgress from '@/components/admin/ImportProgress'
import BatchExecutor from '@/components/admin/BatchExecutor'
import BatchProgress from '@/components/admin/BatchProgress'

export default function AdminImportPage() {
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImport, setActiveImport] = useState<string | null>(null)
  const [activeBatch, setActiveBatch] = useState<string | null>(null)

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/import/datasets')
      if (!response.ok) {
        throw new Error('Failed to fetch datasets')
      }
      const data = await response.json()
      setDatasets(data.datasets || [])
    } catch (error) {
      console.error('Error fetching datasets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">データインポート管理</h1>
          <p className="text-muted-foreground mt-2">
            データセットのインポートとバッチ処理を管理します
          </p>
        </div>
        <Button onClick={fetchDatasets} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              データインポート
            </CardTitle>
            <CardDescription>
              データセットをデータベースにインポートします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatasetList datasets={datasets} loading={loading} />
            <ImportExecutor 
              datasets={datasets}
              onImportStart={(participantId) => setActiveImport(participantId)}
            />
            {activeImport && (
              <ImportProgress 
                participantId={activeImport}
                onComplete={() => {
                  setActiveImport(null)
                  fetchDatasets()
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Batch Processing Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              バッチ処理
            </CardTitle>
            <CardDescription>
              タイムラインデータの事前計算を実行します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BatchExecutor
              datasets={datasets}
              onBatchStart={(participantId) => setActiveBatch(participantId)}
            />
            {activeBatch && (
              <BatchProgress
                participantId={activeBatch}
                onComplete={() => {
                  setActiveBatch(null)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

