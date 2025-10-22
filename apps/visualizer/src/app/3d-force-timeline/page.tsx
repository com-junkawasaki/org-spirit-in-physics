'use client'

import { useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'

export default function ForceTimelinePage() {
  const [participantId, setParticipantId] = useState<string>('144b325f-5966-4d59-a629-f2ca421388cc')
  const inputId = 'participant-select'
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 960, height: 540 })

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

  // iPad向け: コンテナにフィットするキャンバスサイズを算出（1画面に収める）
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const compute = () => {
      const rect = el.getBoundingClientRect()
      const safeTop = (window as any).visualViewport?.offsetTop || 0
      const safeBottomInset = 0 // bodyにenv(safe-area-inset-bottom)を適用済
      const headerReserved = 56 // compact header 高さ相当
      const controlsReserved = 48 // コントロール行の高さ相当
      const verticalPadding = 16 // container-ipad の余白相当

      const height = Math.max(320, Math.floor((window.innerHeight - safeTop - safeBottomInset - headerReserved - controlsReserved - verticalPadding * 2)))
      const width = Math.max(600, Math.floor(rect.width))
      setViewport({ width, height })
    }

    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    window.addEventListener('orientationchange', compute)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', compute)
      window.removeEventListener('resize', compute)
    }
  }, [])

  return (
    <DashboardLayout
      header={{
        title: '3D Force Timeline',
        // compact header により説明は省略し冗長さを削減
        backHref: '/participants',
        backLabel: '参加者一覧へ'
      }}
      compact
    >
      <div ref={containerRef} className="mb-3 md:mb-4 flex flex-wrap items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <label className="subtitle-ipad md:text-sm" htmlFor={inputId}>Participant</label>
          <select
            id={inputId}
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="border rounded px-2 py-1 min-w-[240px] md:min-w-[320px]"
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
        {/* 追加のコントロールが増えてもwrapで1行に収まる */}
      </div>

      <TimelineVisualization
        participantId={participantId}
        width={viewport.width}
        height={viewport.height}
        hideFilters
      />
    </DashboardLayout>
  )
}


