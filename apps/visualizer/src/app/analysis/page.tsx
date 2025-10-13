'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Run = {
  _key: string
  participant_id: string
  status: string
  progress?: number
  created_at: string
  updated_at?: string
}

export default function AnalysisPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [temporalMsg, setTemporalMsg] = useState<string | null>(null)

  async function fetchRuns() {
    setLoading(true)
    try {
      const res = await fetch('/api/analysis/runs', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setRuns(json)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">分析管理</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setTemporalMsg(null)
              const res = await fetch('/api/temporal/worker/start', { method: 'POST' })
              setTemporalMsg(res.ok ? 'Temporal worker started' : 'Temporal worker failed')
            }}
          >
            Worker起動
          </Button>
          <Button onClick={fetchRuns} variant="secondary">更新</Button>
          <Button
            onClick={async () => {
              setCreating(true)
              try {
                // グローバル実行（未処理を対象）。必要に応じてparticipantIdを選ばせるUIに拡張可
                const res = await fetch('/api/analysis/runs', { method: 'POST' })
                if (res.ok) {
                  await fetchRuns()
                }
              } finally {
                setCreating(false)
              }
            }}
            disabled={creating}
          >
            {creating ? '起動中…' : '新規解析を起動'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>解析実行一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {temporalMsg && (
            <div className="mb-2 text-xs text-muted-foreground">{temporalMsg}</div>
          )}
          {loading ? (
            <div className="text-sm text-muted-foreground">読み込み中…</div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-muted-foreground">実行履歴がありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Run ID</th>
                    <th className="py-2 pr-4">Participant</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Progress</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r._key} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{r._key}</td>
                      <td className="py-2 pr-4">
                        <Link className="text-primary underline" href={`/participants/${r.participant_id}/results`}>
                          {r.participant_id}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.status === 'completed' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{typeof r.progress === 'number' ? `${r.progress}%` : '-'}</td>
                      <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString('ja-JP')}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await fetch(`/api/analysis/runs/${r._key}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) })
                              await fetchRuns()
                            }}
                          >
                            キャンセル
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await fetch(`/api/participants/${r.participant_id}/analyze`, { method: 'POST' })
                            }}
                          >
                            再実行
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              await fetch('/api/temporal/visualizations/start', { method: 'POST', body: JSON.stringify({ runId: r._key }) })
                            }}
                          >
                            可視化WF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


