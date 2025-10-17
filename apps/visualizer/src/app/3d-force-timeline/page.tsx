'use client'

import { useEffect, useId, useState } from 'react'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'

export default function ForceTimelinePage() {
  const [participantId, setParticipantId] = useState<string>('2a0d7a69-f953-4c29-87a5-8a8e4e8bd413')
  const [useTypeGPU, setUseTypeGPU] = useState<boolean>(false)
  const inputId = useId()
  const typeGPUId = useId()
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/participants', { cache: 'no-store' })
        const data = await res.json()
        if (!Array.isArray(data)) return
        const opts = (data as Array<{ id: string; name?: string }>).map((p) => ({ id: p.id, label: p.name || (p.id ?? '').slice(0, 8) }))
        if (!cancelled) {
          setOptions(opts)
          // デフォルトが一覧にない場合は先頭を採用
          // 既存の participantId は維持し、未設定時のみ先頭を選ぶ
          if (!participantId && opts.length > 0) setParticipantId(opts[0].id)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [participantId])

  return (
    <DashboardLayout
      header={{
        title: '3D Force Timeline',
        description: '感情類似度をフォースに統合した時系列×3D可視化の専用ページ',
        backHref: '/participants',
        backLabel: '参加者一覧へ'
      }}
    >
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor={inputId}>Participant</label>
          <select
            id={inputId}
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="border rounded px-2 py-1 min-w-[320px]"
            disabled={loading}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label} — {o.id}</option>
            ))}
            {options.length === 0 && (
              <option value={participantId}>{participantId}</option>
            )}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor={typeGPUId} className="text-sm">GPU Acceleration</label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={typeGPUId}
              checked={useTypeGPU}
              onChange={(e) => setUseTypeGPU(e.target.checked)}
              className="rounded"
            />
            <label htmlFor={typeGPUId} className="text-sm cursor-pointer">TypeGPU (GPU.js)</label>
          </div>
        </div>
      </div>

      <TimelineVisualization
        participantId={participantId}
        width={1000}
        height={560}
        forceMode={useTypeGPU ? "force-3d-typegpu" : "force-3d"}
        hideFilters
        useDemo
      />
    </DashboardLayout>
  )
}


