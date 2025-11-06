// Merkle DAG: admin_import_page -> data_import_ui
// 参加者データインポート管理ページ

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ImportResult {
  participantId: string
  success: boolean
  message: string
  sessionEvents?: number
  emotionRecords?: number
  physiologicalSamples?: number
  error?: string
}

interface ImportResponse {
  success: boolean
  message: string
  results?: ImportResult[]
  summary?: {
    total: number
    succeeded: number
    failed: number
  }
  error?: string
}

export default function ImportPage() {
  const router = useRouter()
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    setIsImporting(true)
    setError(null)
    setImportResult(null)

    try {
      const response = await fetch('/api/admin/import/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data: ImportResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'インポートに失敗しました')
      }

      setImportResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      console.error('Import error:', err)
    } finally {
      setIsImporting(false)
    }
  }

  const handleGoToParticipants = () => {
    router.push('/spirits')
    router.refresh()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link href="/spirits">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            参加者一覧に戻る
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">データインポート</h1>
        <p className="text-gray-600">
          ローカルの参加者データセットをSupabaseに一括インポートします
        </p>
      </div>

      {/* インポート実行カード */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            インポート実行
          </CardTitle>
          <CardDescription>
            `public/dataset/participants/` 配下の参加者データをスキャンしてインポートします
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleImport}
                disabled={isImporting}
                size="lg"
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    インポート中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    インポートを実行
                  </>
                )}
              </Button>
              {importResult && (
                <Button
                  onClick={handleGoToParticipants}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  参加者一覧を確認
                </Button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">エラー</span>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* インポート結果 */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  インポート完了
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  インポート結果
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* サマリー */}
            {importResult.summary && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {importResult.summary.total}
                  </div>
                  <div className="text-sm text-gray-600">総数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.summary.succeeded}
                  </div>
                  <div className="text-sm text-gray-600">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.summary.failed}
                  </div>
                  <div className="text-sm text-gray-600">失敗</div>
                </div>
              </div>
            )}

            {/* メッセージ */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{importResult.message}</p>
            </div>

            {/* 詳細結果 */}
            {importResult.results && importResult.results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">詳細結果</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importResult.results.map((result, index) => (
                    <div
                      key={result.participantId || index}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {result.success ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">
                              {result.participantId.slice(0, 12)}...
                            </span>
                            <Badge variant={result.success ? 'default' : 'destructive'}>
                              {result.success ? '成功' : '失敗'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{result.message}</p>
                          {result.success && (
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              {result.sessionEvents !== undefined && (
                                <span>セッション: {result.sessionEvents}件</span>
                              )}
                              {result.emotionRecords !== undefined && (
                                <span>感情データ: {result.emotionRecords}件</span>
                              )}
                              {result.physiologicalSamples !== undefined && (
                                <span>生理データ: {result.physiologicalSamples}件</span>
                              )}
                            </div>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-600 mt-1">エラー: {result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 情報カード */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">インポートについて</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              • インポート対象: <code className="bg-gray-100 px-1 rounded">public/dataset/participants/</code> 配下の各参加者ディレクトリ
            </li>
            <li>
              • インポートされるデータ: 参加者情報、同意情報、セッションデータ、感情データ、生理データ
            </li>
            <li>
              • 既存データは更新されます（upsert）
            </li>
            <li>
              • Docker環境では <code className="bg-gray-100 px-1 rounded">/app/public/dataset</code> を参照します
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

