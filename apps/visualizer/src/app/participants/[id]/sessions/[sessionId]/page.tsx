'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function SessionTimelinePage() {
  const params = useParams<{ id: string; sessionId: string }>()
  const participantId = params.id
  const sessionId = params.sessionId
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 960, height: 540 })
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(true)

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

  // デバッグ情報を取得
  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        setDebugLoading(true)
        const response = await fetch(`/api/participants/${participantId}/timeline/debug?sessionId=${encodeURIComponent(sessionId)}`)
        if (response.ok) {
          const data = await response.json()
          setDebugInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch debug info:', error)
      } finally {
        setDebugLoading(false)
      }
    }
    
    if (participantId && sessionId) {
      fetchDebugInfo()
    }
  }, [participantId, sessionId])

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

      {/* デバッグ情報表示 */}
      {!debugLoading && debugInfo && (
        <Card className="mt-6 border-muted">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              データ信頼性情報
            </CardTitle>
            <CardDescription className="text-xs">
              最終更新: {new Date(debugInfo.timestamp).toLocaleString('ja-JP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 全体の信頼性スコア */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">全体信頼性</span>
              <Badge 
                variant={debugInfo.reliability?.overall >= 0.7 ? 'default' : debugInfo.reliability?.overall >= 0.4 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {(debugInfo.reliability?.overall * 100).toFixed(0)}%
              </Badge>
            </div>

            {/* セッションデータ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {debugInfo.checks?.session?.exists ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  セッションデータ
                </span>
                <span className="text-muted-foreground">
                  {debugInfo.checks?.session?.exists ? '存在' : '不存在'}
                  {debugInfo.checks?.session?.eventsInfo && ` (${debugInfo.checks.session.eventsInfo.total}イベント)`}
                </span>
              </div>
              {debugInfo.checks?.session?.eventsInfo && (
                <div className="pl-5 text-xs text-muted-foreground space-y-1">
                  <div>word_displayed: {debugInfo.checks.session.eventsInfo.wordDisplayed}件</div>
                  <div>speech_detected: {debugInfo.checks.session.eventsInfo.speechDetected}件</div>
                </div>
              )}
            </div>

            {/* 感情データ */}
            <div className="space-y-2">
              <div className="text-xs font-medium">感情データ</div>
              <div className="grid grid-cols-2 gap-2 pl-4">
                {['burst', 'face', 'language', 'prosody'].map((type) => {
                  const check = debugInfo.checks?.[type]
                  const exists = check?.exists || false
                  const count = check?.count || 0
                  return (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {exists ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {type}
                      </span>
                      <span className="text-muted-foreground">{count}件</span>
                    </div>
                  )
                })}
              </div>
              {debugInfo.reliability?.emotions && (
                <div className="pl-4 text-xs text-muted-foreground">
                  感情データ種類: {Object.values(debugInfo.reliability.emotions).filter((v: any) => v > 0).length - 1}/4
                </div>
              )}
            </div>

            {/* 生理データ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {debugInfo.checks?.physiological?.exists ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  生理データ
                </span>
                <span className="text-muted-foreground">
                  {debugInfo.checks?.physiological?.exists ? `存在 (${debugInfo.checks.physiological.count}件)` : '不存在'}
                </span>
              </div>
            </div>

            {/* 詳細情報（折りたたみ可能） */}
            <details className="mt-4">
              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                詳細情報を表示
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}

