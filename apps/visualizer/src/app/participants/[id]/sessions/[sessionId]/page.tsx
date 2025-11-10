'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'

export default function SessionTimelinePage() {
  const params = useParams<{ id: string; sessionId: string }>()
  const participantId = params.id
  const sessionId = params.sessionId
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 960, height: 540 })

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

  // ハッシュが#timelineの場合、スクロールする
  useEffect(() => {
    if (window.location.hash === '#timeline') {
      setTimeout(() => {
        const timelineElement = document.getElementById('timeline')
        if (timelineElement) {
          timelineElement.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [])

  return (
    <DashboardLayout
      header={{
        title: `セッション ${sessionId.slice(0, 8)}...`,
        backHref: `/participants/${participantId}/sessions`,
        backLabel: 'セッション一覧へ'
      }}
      compact
    >
      <div ref={containerRef} className="mb-3 md:mb-4" />

      <div id="timeline" className="scroll-mt-20">
        <TimelineVisualization
          participantId={participantId}
          sessionId={sessionId}
          width={viewport.width}
          height={viewport.height}
          hideFilters
        />
      </div>
    </DashboardLayout>
  )
}

