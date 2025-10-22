'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'

export default function ForceTimelinePage() {
  const { id } = useParams<{ id: string }>()
  const [participantId, setParticipantId] = useState<string>(id || '')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 960, height: 540 })

  // ルートパラメータと状態を同期
  useEffect(() => {
    if (id && id !== participantId) setParticipantId(id)
  }, [id])

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
      <div ref={containerRef} className="mb-3 md:mb-4" />

      <TimelineVisualization
        participantId={participantId}
        width={viewport.width}
        height={viewport.height}
        hideFilters
      />
    </DashboardLayout>
  )
}


