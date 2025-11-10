'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTimelineData } from './timeline/useTimelineData'
import TimelineChart from './timeline/TimelineChart'
import KPICards from './timeline/KPICards'
import Force3DControls from './timeline/Force3DControls'
import { createGraphQLClient } from '@/lib/graphql-client'
import type {
  TimelineVisualizationProps,
  ForcePreset,
  WordNode,
  WordLink,
  DebugInfo
} from './timeline/types'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'
// Force3D component dynamic import (moved outside component)
const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })

// Merkle DAG: components.timeline_visualization
// 時系列統合可視化コンポーネント
// 依存関係: React, timeline modules
// BPMN: TimelineVisualizationComponent

export default function TimelineVisualization({ 
  participantId, 
  width = 800, 
  height = 400,
  hideFilters = false,
}: Omit<TimelineVisualizationProps, 'forceMode' | 'useDemo'>) {
  // 3D Force パラメータ
  const [springK, setSpringK] = useState(2.0)
  const [repulsionK, setRepulsionK] = useState(2000.0)
  const [restLength, setRestLength] = useState(80)
  const [damping, setDamping] = useState(0.92)
  const [emotionGain, setEmotionGain] = useState(1.5)
  const [shellRadius, setShellRadius] = useState(300)
  const [shellK, setShellK] = useState(1.5)
  // Shannon: 中央集約を抑える外向きラジアル力（既定を有効化）
  const [radialOutK, setRadialOutK] = useState(120)
  const [constraintIters] = useState(2)
  const [constraintStiffness] = useState(0.5)
  // Shannon: 近接重なりを抑えるため既定を強めに
  const [minSep, setMinSep] = useState(80)
  const [sepK, setSepK] = useState(8000)

  // Kawasaki model hyperparameters
  const [alpha, setAlpha] = useState(1.0)  // 反応時間の指数 α
  const [gamma, setGamma] = useState(1.0)  // ΔSP の係数 γ
  const [lambda, setLambda] = useState(1.0) // ΔSP のスケール λ
  const [eta, setEta] = useState(1.0)    // 感情スコア係数 η

  // データ管理フックを使用
  const {
    mounted,
    data,
    loading,
    error,
    selectedDataPoint,
    setSelectedDataPoint,
    timeRange,
    filters,
    setFilters,
    getPhysStat,
    refetchData,
    debugInfo
  } = useTimelineData({ participantId })

  // Force3D graph data state (computed by backend)
  const [force3DGraphData, setForce3DGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null)
  const [force3DGraphLoading, setForce3DGraphLoading] = useState(false)
  const [force3DGraphError, setForce3DGraphError] = useState<string | null>(null)

  // 3D Force プリセット
  const forcePresets: readonly ForcePreset[] = [
    { id: 'balanced', label: 'Balanced', springK: 2.0, repulsionK: 2000, restLength: 80, damping: 0.92, emoWeak: 0.6, emoStrong: 1.6, emoGain: 1.5 },
    { id: 'tight', label: 'Tight clusters', springK: 3.0, repulsionK: 3000, restLength: 60, damping: 0.90, emoWeak: 0.6, emoStrong: 1.8, emoGain: 2.5 },
    { id: 'loose', label: 'Loose clusters', springK: 1.5, repulsionK: 1500, restLength: 100, damping: 0.94, emoWeak: 0.7, emoStrong: 1.4, emoGain: 1.0 },
    { id: 'slow', label: 'Slow precise', springK: 2.0, repulsionK: 2500, restLength: 80, damping: 0.96, emoWeak: 0.6, emoStrong: 1.6, emoGain: 2.0 },
  ]
  const [forcePresetId, setForcePresetId] = useState<ForcePreset['id']>('balanced')

  const applyForcePreset = useCallback((id: ForcePreset['id']) => {
    const p = forcePresets.find(x => x.id === id)
    if (!p) return
    setForcePresetId(id)
    setSpringK(p.springK)
    setRepulsionK(p.repulsionK)
    setRestLength(p.restLength)
    setDamping(p.damping)
    setEmotionGain(p.emoGain)
  }, [forcePresets])
  
  const tooltipRef = useRef<HTMLDivElement>(null)
  const lastInitialsRef = useRef<Map<string, [number, number, number]>>(new Map())

  // 表示モードの状態
  const [activeTab, setActiveTab] = useState<'timeline' | 'force3d' | 'words'>('timeline')
  // 単語選択（上位100をUIに表示）
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  // 感情フィルターと力学モード、データセグメント
  const EMOTION_KEYS = ['joy','sadness','anger','fear','surprise','disgust','calm','focus','excitement','confusion'] as const
  const [selectedEmotions, setSelectedEmotions] = useState<Set<typeof EMOTION_KEYS[number]>>(new Set(EMOTION_KEYS))
  const [physicsMode, setPhysicsMode] = useState<'all' | 'emotion' | 'physio' | 'reactionSpeed'>('emotion')
  const [segment, setSegment] = useState<'all' | 'first100' | 'next100'>('all')
  // モダリティ（Hume: prosody/burst/face/language）
  const MOD_KEYS = ['prosody','face','language','burst'] as const
  const [selectedModalities, setSelectedModalities] = useState<Set<typeof MOD_KEYS[number]>>(new Set(MOD_KEYS))
  // トポロジ調整パラメータ（UIで調整可能）
  const [topK, setTopK] = useState<number>(2)
  const [minW, setMinW] = useState<number>(0.25)
  const [weightGamma, setWeightGamma] = useState<number>(1.6)
  const [animateTransitions, setAnimateTransitions] = useState<boolean>(true)
  // 画面内収まり: 詳細コントロールは折りたたみ（初期非表示）
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false)
  // 単語テーブルの並び順
  const [wordsSortKey, setWordsSortKey] = useState<'count' | 'rv_o' | 'rt_o' | 'ph_o'>('count')
  const [wordsSortDir, setWordsSortDir] = useState<'asc' | 'desc'>('desc')

  // Memoize Set to Array conversion to prevent unnecessary re-renders
  const selectedEmotionsArray = useMemo(() => Array.from(selectedEmotions), [selectedEmotions])
  const selectedModalitiesArray = useMemo(() => Array.from(selectedModalities), [selectedModalities])

  // Progressive loading state
  const [progressiveLoadEnabled, setProgressiveLoadEnabled] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Fetch Force3D graph data from backend when parameters change (with debounce)
  useEffect(() => {
    if (!mounted || !participantId || activeTab !== 'force3d') return
    
    // Reset progressive loading state when parameters change
    setInitialLoadComplete(false)
    
    // Debounce timer to prevent excessive API calls
    const timeoutId = setTimeout(() => {
      const fetchForce3DGraphData = async (loadCount?: number) => {
        const forceGraphStart = performance.now()
        setForce3DGraphLoading(true)
        setForce3DGraphError(null)
        try {
          const client = createGraphQLClient()
          const result = await client.getParticipantForce3DGraph(participantId, {
            selectedEmotions: selectedEmotionsArray,
            selectedModalities: selectedModalitiesArray,
            physicsMode,
            segment,
            topK,
            minW,
            weightGamma,
            shellRadius,
            restLength,
            springK,
            selectedWord: selectedWord || undefined,
            initialLoadCount: loadCount,  // Progressive loading: initial load with top 50 nodes
          })
          if (result) {
            const conversionMs = Math.round(performance.now() - forceGraphStart)
            const isProgressive = loadCount !== undefined && loadCount > 0
            console.log(`[Performance] Force3DGraph: totalMs=${conversionMs}, nodes=${result.nodes.length}, links=${result.links.length}, progressive=${isProgressive}`)
            setForce3DGraphData({ nodes: result.nodes, links: result.links })
            
            // If progressive loading and initial load is complete, load remaining nodes after a delay
            if (isProgressive && !initialLoadComplete && progressiveLoadEnabled) {
              setInitialLoadComplete(true)
              // Load remaining nodes after 1 second
              setTimeout(() => {
                fetchForce3DGraphData(undefined)  // Load all nodes
              }, 1000)
            }
          } else {
            const totalMs = Math.round(performance.now() - forceGraphStart)
            console.log('[Performance] Force3DGraph: totalMs=' + totalMs + ', result=not_available')
            setForce3DGraphError('Force3D graph data not available')
          }
        } catch (err) {
          const totalMs = Math.round(performance.now() - forceGraphStart)
          console.log('[Performance] Force3DGraph: totalMs=' + totalMs + ', result=error')
          console.error('Error fetching Force3D graph data:', err)
          setForce3DGraphError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
          setForce3DGraphLoading(false)
        }
      }
      
      // Initial load: use progressive loading if enabled (load top 50 nodes first)
      if (progressiveLoadEnabled && !initialLoadComplete) {
        fetchForce3DGraphData(50)
      } else {
        fetchForce3DGraphData(undefined)  // Load all nodes
      }
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [mounted, participantId, activeTab, selectedEmotionsArray, selectedModalitiesArray, physicsMode, segment, topK, minW, weightGamma, shellRadius, restLength, springK, selectedWord, progressiveLoadEnabled, initialLoadComplete])

  // Memoize data conversion to prevent unnecessary re-computation
  const convertedGraphData = useMemo(() => {
    if (!force3DGraphData) return null
    
    const nodes: WordNode[] = force3DGraphData.nodes.map((node: any) => ({
      id: node.id,
      label: node.label,
      scale: node.scale || 1.0,
      nodeType: (node.nodeType || 'word') as 'word' | 'anchor',
      initial: node.initial ? (node.initial as [number, number, number]) : undefined,
      fixed: node.fixed || false,
      color: node.color,
    }))

    const links: WordLink[] = force3DGraphData.links.map((link: any) => ({
      source: typeof link.source === 'number' ? link.source : parseInt(link.source),
      target: typeof link.target === 'number' ? link.target : parseInt(link.target),
      weight: link.weight || 0,
      mode: (link.mode || 'tension') as 'tension' | 'compression',
      L0: link.L0 || link.l0 || restLength,
      k: link.k || springK,
      color: link.color || `rgba(30, 64, 175, 0.5)`,
    }))
    
    return { nodes, links }
  }, [force3DGraphData, restLength, springK])

  // ローディング状態
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">時系列データを読み込み中...</span>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center text-red-600 p-4">
          <p>エラー: {error}</p>
          <button 
            type="button"
            onClick={refetchData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
        {/* Debug Area */}
        <DebugArea debugInfo={debugInfo} />
      </div>
    )
  }

  // データが空の場合のメッセージ
  const hasData = data.length > 0
  const isEmptyState = !loading && !error && !hasData

  return (
    <div className="space-y-4">
      {isEmptyState && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">データがありません</p>
          <p className="text-yellow-700 text-sm mb-4">時系列データを読み込めませんでした。APIがデータを返していない可能性があります。</p>
          <button 
            type="button"
            onClick={refetchData}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            再読み込み
          </button>
        </div>
      )}
      {/* フィルターコントロール */}
      {!hideFilters && (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">フィルター設定</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.emotions}
              onChange={(e) => setFilters(prev => ({ ...prev, emotions: e.target.checked }))}
            />
            <span className="text-sm">感情データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.physiological}
              onChange={(e) => setFilters(prev => ({ ...prev, physiological: e.target.checked }))}
            />
            <span className="text-sm">生理データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.reactionValues}
              onChange={(e) => setFilters(prev => ({ ...prev, reactionValues: e.target.checked }))}
            />
            <span className="text-sm">反応値</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.wordDisplay}
              onChange={(e) => setFilters(prev => ({ ...prev, wordDisplay: e.target.checked }))}
            />
            <span className="text-sm">単語表示</span>
          </label>
        </div>
      </div>
      )}

      {/* 表示モード切り替えタブ */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Top Toolbar (iPad friendly) */}
        <div className="border-b border-gray-200 sticky top-0 z-10 bg-white/90 backdrop-blur px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <nav className="inline-flex rounded-md shadow-sm" role="tablist" aria-label="View Tabs">
              {[
                { id: 'timeline', label: '時系列統合', icon: '📈' },
                { id: 'force3d', label: '3D Force', icon: '⚡' },
                { id: 'words', label: '単語一覧', icon: '📝' },
              ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                className={`portrait:px-2 portrait:py-1.5 landscape:px-3 landscape:py-2 portrait:text-xs landscape:text-sm first:rounded-l-md last:rounded-r-md border ${
                  activeTab === tab.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                }`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                <span className="mr-1">{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
              </nav>
            </div>
            {/* Segmented controls: mode & segment */}
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Mode">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'emotion', label: 'Emotion' },
                  { id: 'physio', label: 'Physio' },
                  { id: 'reactionSpeed', label: 'Speed' },
                ].map(o => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={physicsMode === o.id}
                    className={`portrait:px-2 portrait:py-1.5 landscape:px-3 landscape:py-2 portrait:text-xs landscape:text-sm first:rounded-l-md last:rounded-r-md border ${physicsMode === o.id ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => setPhysicsMode(o.id as typeof physicsMode)}
                  >{o.label}</button>
                ))}
              </div>
              <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Segment">
                {[
                  { id: 'all', label: 'All 200' },
                  { id: 'first100', label: 'First 100' },
                  { id: 'next100', label: 'Next 100' },
                ].map(o => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={segment === o.id}
                    className={`portrait:px-2 portrait:py-1.5 landscape:px-3 landscape:py-2 portrait:text-xs landscape:text-sm first:rounded-l-md last:rounded-r-md border ${segment === o.id ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => setSegment(o.id as typeof segment)}
                  >{o.label}</button>
                ))}
              </div>
              <button type="button" className="portrait:px-2 portrait:py-1.5 landscape:px-3 landscape:py-2 portrait:text-xs landscape:text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => {
                setSelectedEmotions(new Set(EMOTION_KEYS)); setTopK(2); setMinW(0.25); setWeightGamma(1.6); setAnimateTransitions(true)
              }}>Reset</button>
            </div>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="p-4">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">時系列統合可視化</h3>
              <TimelineChart
                data={data}
                filters={filters}
                width={width}
                height={height}
                timeRange={timeRange}
                onDataPointSelect={setSelectedDataPoint}
                onTooltipShow={(event, point) => {
                  if (!tooltipRef.current) return
                  const tooltip = tooltipRef.current
                  tooltip.style.display = 'block'
                  tooltip.style.left = `${event.pageX + 10}px`
                  tooltip.style.top = `${event.pageY - 10}px`

                  // 感情データの詳細表示
                  const emotionDetails = point.emotions.length > 0
                    ? point.emotions.map(emotion =>
                        `<div class="text-xs">
                          <span class="font-medium">${emotion.name || 'unknown'}</span>:
                          <span class="text-blue-600">${(emotion.score || 0).toFixed(2)}</span>
                          <span class="text-gray-500">(${emotion.fileType || 'unknown'})</span>
                        </div>`
                      ).join('')
                    : '<div class="text-xs text-gray-500">感情データなし</div>'

                  tooltip.innerHTML = `
                    <div class="bg-white border border-gray-300 rounded-lg p-3 shadow-lg text-sm">
                      <div class="font-semibold text-gray-900 mb-2">${point.word}</div>
                      <div class="text-gray-600 mb-2">時間: ${new Date(point.timestamp).toLocaleTimeString()}</div>
                      <div class="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>反応値: <span class="font-medium">${point.reactionValue.toFixed(2)}</span></div>
                        <div>反応時間: <span class="font-medium">${point.reactionTime}ms</span></div>
                      </div>
                      <div class="border-t pt-2">
                        <div class="text-xs font-medium text-gray-700 mb-1">感情データ:</div>
                        ${emotionDetails}
                      </div>
                    </div>
                  `
                }}
                onTooltipHide={() => {
                  if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'none'
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'force3d' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">3D Force 可視化</h3>

              {/* 単語選択: 上位100語 */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 order-2 lg:order-1">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedControls(v => !v)}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >{showAdvancedControls ? 'Hide Advanced' : 'Show Advanced'}</button>
                  </div>
                  {showAdvancedControls && (
                    <Force3DControls
                      forcePresets={forcePresets}
                      forcePresetId={forcePresetId}
                      onPresetChange={applyForcePreset}
                      springK={springK}
                      onSpringKChange={setSpringK}
                      repulsionK={repulsionK}
                      onRepulsionKChange={setRepulsionK}
                      restLength={restLength}
                      onRestLengthChange={setRestLength}
                      minSep={minSep}
                      onMinSepChange={setMinSep}
                      sepK={sepK}
                      onSepKChange={setSepK}
                      shellRadius={shellRadius}
                      onShellRadiusChange={setShellRadius}
                      shellK={shellK}
                      onShellKChange={setShellK}
                      radialOutK={radialOutK}
                      onRadialOutKChange={setRadialOutK}
                      damping={damping}
                      onDampingChange={setDamping}
                      alpha={alpha}
                      onAlphaChange={setAlpha}
                      gamma={gamma}
                      onGammaChange={setGamma}
                      lambda={lambda}
                      onLambdaChange={setLambda}
                      eta={eta}
                      onEtaChange={setEta}
                    />
                  )}

                  {/* 3D Force グラフ本体 */}
                  {mounted && (() => {
                    // Loading state
                    if (force3DGraphLoading) {
                      return (
                        <div className="flex items-center justify-center h-96">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                          <span className="ml-4 text-gray-700">3Dグラフデータを計算中...</span>
                        </div>
                      )
                    }

                    // Error state
                    if (force3DGraphError) {
                      return (
                        <div className="border rounded overflow-hidden p-4 text-red-600">
                          エラー: {force3DGraphError}
                        </div>
                      )
                    }

                    // No data state
                    if (!force3DGraphData) {
                      return (
                        <div className="border rounded overflow-hidden p-4 text-gray-500">
                          データがありません
                        </div>
                      )
                    }

                    try {
                      if (!convertedGraphData) {
                        return (
                          <div className="border rounded overflow-hidden p-4 text-gray-500">
                            データがありません
                          </div>
                        )
                      }

                      console.log('3Dグラフデータ:', { nodes: convertedGraphData.nodes.length, links: convertedGraphData.links.length })

                      return (
                        <div className="border rounded overflow-hidden">
                          <Force3D
                            nodes={convertedGraphData.nodes}
                            links={convertedGraphData.links}
                            width={width}
                            height={Math.min(460, Math.max(360, height))}
                            physics={{
                              springK,
                              repulsionK,
                              damping,
                              restLength,
                              maxSpeed: 200,
                              shellRadius,
                              shellK,
                              radialOutK: radialOutK,
                              constraintIters: constraintIters,
                              constraintStiffness: constraintStiffness,
                              minSep,
                              sepK
                            }}
                          />
                        </div>
                      )
                    } catch (error) {
                      console.error('3Dグラフレンダリングエラー:', error)
                      return (
                        <div className="border rounded overflow-hidden p-4 text-red-600">
                          3Dグラフの表示に失敗しました: {error instanceof Error ? error.message : 'Unknown error'}
                        </div>
                      )
                    }
                  })()}
                </div>
                {/* Control Panel - iPad sticky and touch-friendly */}
                <div className="lg:col-span-1 order-1 lg:order-2 sticky top-4 self-start max-h-[78vh] overflow-auto pr-1">
                  <h4 className="font-medium mb-2 text-sm">単語選択（上位100）</h4>
                  <div className="border rounded max-h-[38vh] overflow-auto p-2 text-sm">
                    {(() => {
                      // データから出現回数順に上位100語
                      const counts: Record<string, number> = {}
                      for (const dpt of data) counts[dpt.word] = (counts[dpt.word] ?? 0) + 1
                      const top = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 100)
                        .map(([w]) => w)
                      return top.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSelectedWord(prev => prev === w ? null : w)}
                          className={`w-full text-left px-2 py-1 rounded ${selectedWord === w ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                        >
                          {w}
                        </button>
                      ))
                    })()}
                  </div>
                  <h4 className="font-medium mt-4 mb-2 text-sm">感情フィルター</h4>
                  <div className="border rounded max-h-[20vh] overflow-auto p-2 text-sm grid grid-cols-2 gap-1">
                    {EMOTION_KEYS.map((k) => (
                      <label key={k} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={selectedEmotions.has(k)}
                          onChange={(e) => {
                            setSelectedEmotions(prev => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(k); else next.delete(k)
                              return next
                            })
                          }}
                        />
                        <span>{k}</span>
                      </label>
                    ))}
                  </div>

                  <h4 className="font-medium mt-4 mb-2 text-sm">モダリティ（感情抽出元）</h4>
                  <div className="flex flex-wrap gap-2">
                    {MOD_KEYS.map((m) => (
                      <label key={m} className="flex items-center gap-1 text-sm border rounded px-2 py-1 bg-white">
                        <input
                          type="checkbox"
                          checked={selectedModalities.has(m)}
                          onChange={(e) => setSelectedModalities(prev => { const next = new Set(prev); if (e.target.checked) next.add(m); else next.delete(m); return next })}
                        />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>

                  <h4 className="font-medium mt-4 mb-2 text-sm">力学モード</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'emotion', label: 'Emotion' },
                      { id: 'physio', label: 'Physio' },
                      { id: 'reactionSpeed', label: 'Speed' },
                    ].map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setPhysicsMode(o.id as typeof physicsMode)}
                        className={`px-2 py-1 rounded text-sm ${physicsMode === o.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                      >{o.label}</button>
                    ))}
                  </div>

                  <h4 className="font-medium mt-4 mb-2 text-sm">Top-K / 閾値 / ガンマ</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20">Top-K</span>
                      <input type="range" min="1" max="5" step="1" value={topK} onChange={(e)=>setTopK(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs w-8 text-right">{topK}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20">Min W</span>
                      <input type="range" min="0" max="0.6" step="0.05" value={minW} onChange={(e)=>setMinW(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs w-8 text-right">{minW.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20">Gamma</span>
                      <input type="range" min="1.0" max="3.0" step="0.1" value={weightGamma} onChange={(e)=>setWeightGamma(Number(e.target.value))} className="flex-1" />
                      <span className="text-xs w-8 text-right">{weightGamma.toFixed(1)}</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={animateTransitions} onChange={(e)=>setAnimateTransitions(e.target.checked)} />
                      スナップショット補間（形状変化を滑らかに）
                    </label>
                  </div>

                  <h4 className="font-medium mt-4 mb-2 text-sm">データ範囲</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'All 200' },
                      { id: 'first100', label: 'First 100' },
                      { id: 'next100', label: 'Next 100' },
                    ].map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSegment(o.id as typeof segment)}
                        className={`px-2 py-1 rounded text-sm ${segment === o.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                      >{o.label}</button>
                    ))}
                  </div>

                  {/* 単語詳細テーブル: overall / first / second */}
                  {selectedWord && (() => {
                    const occurrences = data.filter(d => d.word === selectedWord)
                    const split = [occurrences[0] ? [occurrences[0]] : [], occurrences.slice(1)] as const
                    const sections = {
                      overall: occurrences,
                      first: split[0],
                      second: split[1]
                    }
                    const getAvg = (arr: typeof occurrences, f: (d: typeof occurrences[number]) => number) => arr.length ? arr.reduce((s, d) => s + f(d), 0) / arr.length : 0
                    const avgObj = (arr: typeof occurrences) => ({
                      reactionTimeAvg: getAvg(arr, d => d.reactionTime || 0),
                      physioAvg: getAvg(arr, d => getPhysStat(d.physiological, 'average')),
                      reactionValueAvg: getAvg(arr, d => d.reactionValue || 0),
                      prosodyAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('prosody'))?.score) || 0),
                      burstAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('burst'))?.score) || 0),
                      faceAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('face'))?.score) || 0),
                      languageAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('language'))?.score) || 0),
                    })
                    const overall = avgObj(sections.overall)
                    const first = avgObj(sections.first)
                    const second = avgObj(sections.second)
                    const cell = (v: number, digits = 2) => Number.isFinite(v) ? v.toFixed(digits) : '-'
                    return (
                      <div className="mt-4 border rounded bg-white/60 overflow-auto">
                        <div className="text-sm font-medium p-3 pb-0">単語詳細: {selectedWord}</div>
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left px-3 py-2">区分</th>
                              <th className="text-right px-3 py-2">反応時間(ms)</th>
                              <th className="text-right px-3 py-2">生理</th>
                              <th className="text-right px-3 py-2">反応値</th>
                              <th className="text-right px-3 py-2">Prosody</th>
                              <th className="text-right px-3 py-2">Burst</th>
                              <th className="text-right px-3 py-2">Face</th>
                              <th className="text-right px-3 py-2">Language</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-2 text-gray-700">全体</td>
                              <td className="px-3 py-2 text-right">{Math.round(overall.reactionTimeAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.physioAvg, 3)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.reactionValueAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.prosodyAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.burstAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.faceAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(overall.languageAvg)}</td>
                            </tr>
                            <tr className="bg-gray-50/70">
                              <td className="px-3 py-2 text-gray-700">1回目</td>
                              <td className="px-3 py-2 text-right">{Math.round(first.reactionTimeAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.physioAvg, 3)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.reactionValueAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.prosodyAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.burstAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.faceAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(first.languageAvg)}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-gray-700">2回目以降</td>
                              <td className="px-3 py-2 text-right">{Math.round(second.reactionTimeAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.physioAvg, 3)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.reactionValueAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.prosodyAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.burstAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.faceAvg)}</td>
                              <td className="px-3 py-2 text-right">{cell(second.languageAvg)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'words' && (
              <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">単語一覧</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Tap to center and show details</span>
                  <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Sort">
                    {[
                      { id: 'count', label: 'Count' },
                      { id: 'rv_o', label: 'RV' },
                      { id: 'rt_o', label: 'RT' },
                      { id: 'ph_o', label: 'Phys' },
                    ].map(o => (
                      <button key={o.id} type="button" aria-pressed={wordsSortKey === o.id}
                        className={`px-2 py-1 rounded-md border ${wordsSortKey === (o.id as any) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700'}`}
                        onClick={() => setWordsSortKey(o.id as typeof wordsSortKey)}>{o.label}</button>
                    ))}
                    <button type="button" className="px-2 py-1 rounded-md border bg-white border-gray-200 text-gray-700" onClick={() => setWordsSortDir(d => d === 'asc' ? 'desc' : 'asc')}>{wordsSortDir === 'asc' ? '▲' : '▼'}</button>
                  </div>
                </div>
              </div>
              {/* 選択語の詳細テーブル（一覧タブにも表示） */}
              {selectedWord && (() => {
                const occurrences = data.filter(d => d.word === selectedWord)
                const split = [occurrences[0] ? [occurrences[0]] : [], occurrences.slice(1)] as const
                const sections = { overall: occurrences, first: split[0], second: split[1] }
                const getAvg = (arr: typeof occurrences, f: (d: typeof occurrences[number]) => number) => arr.length ? arr.reduce((s, d) => s + f(d), 0) / arr.length : 0
                const avgObj = (arr: typeof occurrences) => ({
                  reactionTimeAvg: getAvg(arr, d => d.reactionTime || 0),
                  physioAvg: getAvg(arr, d => getPhysStat(d.physiological, 'average')),
                  reactionValueAvg: getAvg(arr, d => d.reactionValue || 0),
                  prosodyAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('prosody'))?.score) || 0),
                  burstAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('burst'))?.score) || 0),
                  faceAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('face'))?.score) || 0),
                  languageAvg: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('language'))?.score) || 0),
                })
                const overall = avgObj(sections.overall)
                const first = avgObj(sections.first)
                const second = avgObj(sections.second)
                const cell = (v: number, digits = 2) => Number.isFinite(v) ? v.toFixed(digits) : '-'
                return (
                  <div className="mb-4 border rounded bg-white/60 overflow-auto">
                    <div className="text-sm font-medium p-3 pb-0">単語詳細: {selectedWord}</div>
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left px-3 py-2">区分</th>
                          <th className="text-right px-3 py-2">反応時間(ms)</th>
                          <th className="text-right px-3 py-2">生理</th>
                          <th className="text-right px-3 py-2">反応値</th>
                          <th className="text-right px-3 py-2">Prosody</th>
                          <th className="text-right px-3 py-2">Burst</th>
                          <th className="text-right px-3 py-2">Face</th>
                          <th className="text-right px-3 py-2">Language</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 text-gray-700">全体</td>
                          <td className="px-3 py-2 text-right">{Math.round(overall.reactionTimeAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.physioAvg, 3)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.reactionValueAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.prosodyAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.burstAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.faceAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(overall.languageAvg)}</td>
                        </tr>
                        <tr className="bg-gray-50/70">
                          <td className="px-3 py-2 text-gray-700">1回目</td>
                          <td className="px-3 py-2 text-right">{Math.round(first.reactionTimeAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.physioAvg, 3)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.reactionValueAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.prosodyAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.burstAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.faceAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(first.languageAvg)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-700">2回目以降</td>
                          <td className="px-3 py-2 text-right">{Math.round(second.reactionTimeAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.physioAvg, 3)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.reactionValueAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.prosodyAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.burstAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.faceAvg)}</td>
                          <td className="px-3 py-2 text-right">{cell(second.languageAvg)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })()}
              <div className="border rounded overflow-auto">
                {(() => {
                  type Row = {
                    word: string
                    id: number
                    count: number
                    rt_o: number; rt_1: number; rt_2: number
                    ph_o: number; ph_1: number; ph_2: number
                    rv_o: number; rv_1: number; rv_2: number
                    p_o: number; p_1: number; p_2: number
                    b_o: number; b_1: number; b_2: number
                    f_o: number; f_1: number; f_2: number
                    l_o: number; l_1: number; l_2: number
                  }

                  const words = Array.from(new Set(data.map(d => d.word)))
                  let stats: Row[] = words.map(w => {
                    const occ = data.filter(d => d.word === w)
                    const first = occ[0] ? [occ[0]] : []
                    const second = occ.slice(1)
                    const getAvg = (arr: typeof occ, f: (d: typeof occ[number]) => number) => arr.length ? arr.reduce((s, d) => s + f(d), 0) / arr.length : 0
                    const avg = (arr: typeof occ) => ({
                      rt: getAvg(arr, d => d.reactionTime || 0),
                      ph: getAvg(arr, d => getPhysStat(d.physiological, 'average')),
                      rv: getAvg(arr, d => d.reactionValue || 0),
                      p: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('prosody'))?.score) || 0),
                      b: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('burst'))?.score) || 0),
                      f: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('face'))?.score) || 0),
                      l: getAvg(arr, d => (d.emotions.find(e => String(e.fileType||'').toLowerCase().includes('language'))?.score) || 0),
                    })
                    const o = avg(occ), a = avg(first), s = avg(second)
                    const jungIndex = JUNG_STIMULUS_WORDS.findIndex(j => j.japanese === w)
                    return {
                      word: w,
                      id: jungIndex >= 0 ? jungIndex : -1,
                      count: occ.length,
                      rt_o: o.rt, rt_1: a.rt, rt_2: s.rt,
                      ph_o: o.ph, ph_1: a.ph, ph_2: s.ph,
                      rv_o: o.rv, rv_1: a.rv, rv_2: s.rv,
                      p_o: o.p, p_1: a.p, p_2: s.p,
                      b_o: o.b, b_1: a.b, b_2: s.b,
                      f_o: o.f, f_1: a.f, f_2: s.f,
                      l_o: o.l, l_1: a.l, l_2: s.l,
                    }
                  })
                  stats = stats.sort((a, b) => {
                    const key = wordsSortKey
                    const av = a[key] as number
                    const bv = b[key] as number
                    return (wordsSortDir === 'asc' ? (av - bv) : (bv - av))
                  })

                  const cell = (v: number, d = 2) => Number.isFinite(v) ? v.toFixed(d) : '-'
                  const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
                  const hexToRgb = (hex: string): [number, number, number] => [
                    parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)
                  ]
                  const mix = (a: [number,number,number], b: [number,number,number], t: number): string => {
                    const r = Math.round(a[0] + (b[0]-a[0]) * t)
                    const g = Math.round(a[1] + (b[1]-a[1]) * t)
                    const b2 = Math.round(a[2] + (b[2]-a[2]) * t)
                    return `rgb(${r}, ${g}, ${b2})`
                  }
                  // 0s→Green(#10b981), 10s→Red(#ef4444). 2.5s以上は赤寄り
                  const RT_GREEN: [number,number,number] = hexToRgb('#10b981')
                  const RT_RED: [number,number,number] = hexToRgb('#ef4444')
                  const rtBg = (ms: number) => {
                    const sec = (ms || 0) / 1000
                    const t = clamp01(sec / 10)
                    const color = mix(RT_GREEN, RT_RED, t)
                    const alpha = 0.12 + 0.28 * clamp01((sec - 0) / 10)
                    return `${color.replace('rgb', 'rgba').replace(')', `, ${alpha.toFixed(2)})`)}`
                  }
                  // Modality color scales（base色×強度）
                  const P = hexToRgb('#06b6d4') // cyan-500
                  const B = hexToRgb('#f43f5e') // rose-500
                  const F = hexToRgb('#8b5cf6') // violet-500
                  const Lc = hexToRgb('#f59e0b') // amber-500
                  const modBg = (hexRgb: [number,number,number], v: number) => {
                    const alpha = 0.08 + 0.40 * clamp01(v || 0)
                    return `rgba(${hexRgb[0]}, ${hexRgb[1]}, ${hexRgb[2]}, ${alpha.toFixed(2)})`
                  }
                  return (
                    <table className="min-w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-3 py-2 text-left">単語ID</th>
                          <th className="px-3 py-2 text-left">単語</th>
                          <th className="px-3 py-2 text-right">Count</th>
                          <th className="px-3 py-2 text-right">RT(o)</th>
                          <th className="px-3 py-2 text-right">RT(1)</th>
                          <th className="px-3 py-2 text-right">RT(2)</th>
                          <th className="px-3 py-2 text-right">Phys(o)</th>
                          <th className="px-3 py-2 text-right">Phys(1)</th>
                          <th className="px-3 py-2 text-right">Phys(2)</th>
                          <th className="px-3 py-2 text-right">RV(o)</th>
                          <th className="px-3 py-2 text-right">RV(1)</th>
                          <th className="px-3 py-2 text-right">RV(2)</th>
                          <th className="px-3 py-2 text-right">P(o)</th>
                          <th className="px-3 py-2 text-right">P(1)</th>
                          <th className="px-3 py-2 text-right">P(2)</th>
                          <th className="px-3 py-2 text-right">B(o)</th>
                          <th className="px-3 py-2 text-right">B(1)</th>
                          <th className="px-3 py-2 text-right">B(2)</th>
                          <th className="px-3 py-2 text-right">F(o)</th>
                          <th className="px-3 py-2 text-right">F(1)</th>
                          <th className="px-3 py-2 text-right">F(2)</th>
                          <th className="px-3 py-2 text-right">L(o)</th>
                          <th className="px-3 py-2 text-right">L(1)</th>
                          <th className="px-3 py-2 text-right">L(2)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map(row => (
                          <tr key={row.word} className={selectedWord === row.word ? 'ring-1 ring-blue-300' : ''} style={{ background: rtBg(row.rt_o) }}>
                            <td className="px-3 py-2 text-gray-700">{row.id}</td>
                            <td className="px-3 py-2 text-blue-700 cursor-pointer" onClick={() => setSelectedWord(prev => prev === row.word ? null : row.word)}>{row.word}</td>
                            <td className="px-3 py-2 text-right">{row.count}</td>
                            <td className="px-3 py-2 text-right" style={{ background: rtBg(row.rt_o) }}>{Math.round(row.rt_o)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: rtBg(row.rt_1) }}>{Math.round(row.rt_1)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: rtBg(row.rt_2) }}>{Math.round(row.rt_2)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.ph_o,3)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.ph_1,3)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.ph_2,3)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.rv_o)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.rv_1)}</td>
                            <td className="px-3 py-2 text-right">{cell(row.rv_2)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(P, row.p_o) }}>{cell(row.p_o)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(P, row.p_1) }}>{cell(row.p_1)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(P, row.p_2) }}>{cell(row.p_2)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(B, row.b_o) }}>{cell(row.b_o)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(B, row.b_1) }}>{cell(row.b_1)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(B, row.b_2) }}>{cell(row.b_2)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(F, row.f_o) }}>{cell(row.f_o)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(F, row.f_1) }}>{cell(row.f_1)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(F, row.f_2) }}>{cell(row.f_2)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(Lc, row.l_o) }}>{cell(row.l_o)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(Lc, row.l_1) }}>{cell(row.l_1)}</td>
                            <td className="px-3 py-2 text-right" style={{ background: modBg(Lc, row.l_2) }}>{cell(row.l_2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            </div>
          )}

          {activeTab === 'split' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 時系列チャート（分割表示） */}
              <div className="bg-gray-50 border rounded-lg p-3">
                <h4 className="font-medium mb-2 text-sm">時系列統合</h4>
                <div className="overflow-auto max-h-96">
                  <TimelineChart
                    data={data}
                    filters={filters}
                    width={Math.min(width / 2 - 40, 600)}
                    height={Math.min(height, 400)}
                    timeRange={timeRange}
                    onDataPointSelect={setSelectedDataPoint}
                    onTooltipShow={() => {}}
                    onTooltipHide={() => {}}
                  />
                </div>
              </div>

              {/* 3D Force グラフ（分割表示） */}
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">3D Force</h4>
                  {/* ミニコントロール（トップバーと同値） */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Mode mini">
                      {[
                        { id: 'all', label: 'A' },
                        { id: 'emotion', label: 'E' },
                        { id: 'physio', label: 'P' },
                        { id: 'reactionSpeed', label: 'S' },
                      ].map(o => (
                        <button key={o.id} type="button" aria-pressed={physicsMode === o.id} className={`px-2 py-1 text-xs first:rounded-l-md last:rounded-r-md border ${physicsMode === o.id ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-200'}`} onClick={() => setPhysicsMode(o.id as typeof physicsMode)}>{o.label}</button>
                      ))}
                    </div>
                    <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Segment mini">
                      {[
                        { id: 'all', label: 'A' },
                        { id: 'first100', label: 'F' },
                        { id: 'next100', label: 'N' },
                      ].map(o => (
                        <button key={o.id} type="button" aria-pressed={segment === o.id} className={`px-2 py-1 text-xs first:rounded-l-md last:rounded-r-md border ${segment === o.id ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-200'}`} onClick={() => setSegment(o.id as typeof segment)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="overflow-auto max-h-96">
                  {mounted && (() => {
                    // Loading state
                    if (force3DGraphLoading) {
                      return (
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                          <span className="ml-2 text-gray-700 text-sm">3Dグラフデータを計算中...</span>
                        </div>
                      )
                    }

                    // Error state
                    if (force3DGraphError) {
                      return (
                        <div className="border rounded overflow-hidden p-4 text-red-600 text-sm">
                          エラー: {force3DGraphError}
                        </div>
                      )
                    }

                    // No data state
                    if (!force3DGraphData) {
                      return (
                        <div className="border rounded overflow-hidden p-4 text-gray-500 text-sm">
                          データがありません
                        </div>
                      )
                    }

                    try {
                      if (!convertedGraphData) {
                        return (
                          <div className="border rounded overflow-hidden p-4 text-gray-500 text-sm">
                            データがありません
                          </div>
                        )
                      }

                      return (
                        <div className="border rounded overflow-hidden">
                          <Force3D
                            nodes={convertedGraphData.nodes}
                            links={convertedGraphData.links}
                            width={Math.min(width / 2 - 40, 600)}
                            height={Math.min(360, Math.max(280, height - 240))}
                            physics={{
                              springK,
                              repulsionK,
                              damping,
                              restLength,
                              maxSpeed: 200,
                              shellRadius,
                              shellK,
                              radialOutK: radialOutK,
                              constraintIters: constraintIters,
                              constraintStiffness: constraintStiffness,
                              minSep,
                              sepK
                            }}
                          />
                        </div>
                      )
                    } catch (error) {
                      console.error('3Dグラフレンダリングエラー:', error)
                      return (
                        <div className="border rounded overflow-hidden p-4 text-red-600 text-sm">
                          3Dグラフの表示に失敗しました: {error instanceof Error ? error.message : 'Unknown error'}
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
          
      {/* KPIカード */}
      <KPICards data={data} />
      
      {/* Debug Area */}
      <DebugArea debugInfo={debugInfo} />
    </div>
  )
}

// Merkle DAG: components.timeline_visualization.debug_area
// デバッグ情報表示コンポーネント
function DebugArea({ debugInfo }: { debugInfo: DebugInfo }) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'not_available': return 'text-gray-500 bg-gray-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const statusBadge = (status: string) => {
    const colors = statusColor(status)
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors}`}>
        {status === 'success' ? '✓' : status === 'error' ? '✗' : status === 'not_available' ? '—' : '…'} {status}
      </span>
    )
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-200">Debug Area</h4>
        {debugInfo.lastUpdateTime && (
          <span className="text-gray-400">
            {new Date(debugInfo.lastUpdateTime).toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* API Status */}
        <div className="space-y-1">
          <div className="text-gray-400">API Status</div>
          <div className="flex items-center gap-2">
            {statusBadge(debugInfo.apiStatus)}
          </div>
          {debugInfo.apiUrl && (
            <div className="text-gray-500 text-xs mt-1 break-all">{debugInfo.apiUrl}</div>
          )}
        </div>

        {/* Data Points */}
        <div className="space-y-1">
          <div className="text-gray-400">Data Points</div>
          <div className="text-gray-200 font-semibold">{debugInfo.dataPointCount}</div>
          <div className="flex items-center gap-2">
            {statusBadge(debugInfo.dataConversionStatus)}
          </div>
        </div>

        {/* Session Data */}
        <div className="space-y-1">
          <div className="text-gray-400">Session Data</div>
          <div className="flex items-center gap-2">
            {statusBadge(debugInfo.sessionDataStatus)}
          </div>
          {debugInfo.sessionEventsCount !== undefined && (
            <div className="text-gray-300 text-xs">Events: {debugInfo.sessionEventsCount}</div>
          )}
        </div>

        {/* Emotion Data */}
        <div className="space-y-1">
          <div className="text-gray-400">Emotion Data</div>
          <div className="flex items-center gap-2">
            {statusBadge(debugInfo.emotionDataStatus)}
          </div>
          {debugInfo.emotionEntriesCount !== undefined && (
            <div className="text-gray-300 text-xs">Entries: {debugInfo.emotionEntriesCount}</div>
          )}
        </div>

        {/* Physiological Data */}
        <div className="space-y-1">
          <div className="text-gray-400">Physiological Data</div>
          <div className="flex items-center gap-2">
            {statusBadge(debugInfo.physiologicalDataStatus)}
          </div>
          {debugInfo.physiologicalEntriesCount !== undefined && (
            <div className="text-gray-300 text-xs">Entries: {debugInfo.physiologicalEntriesCount}</div>
          )}
        </div>

        {/* API Response */}
        <div className="space-y-1">
          <div className="text-gray-400">API Response</div>
          <div className="flex items-center gap-2">
            {debugInfo.apiResponseReceived ? (
              <span className="text-green-400">✓ Received</span>
            ) : (
              <span className="text-gray-500">— Not received</span>
            )}
          </div>
        </div>
      </div>

      {/* Errors */}
      {debugInfo.errors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-red-400 font-semibold mb-2">Errors:</div>
          <div className="space-y-1">
            {debugInfo.errors.map((err, idx) => (
              <div key={`error-${idx}-${err.slice(0, 20)}`} className="text-red-300 text-xs break-words">
                • {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Metadata */}
      {debugInfo.responseMetadata && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-gray-400 font-semibold mb-2">Response Metadata:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {debugInfo.responseMetadata.sessionEvents !== undefined && (
              <div className="text-gray-300">
                Session Events: <span className="text-gray-100">{debugInfo.responseMetadata.sessionEvents}</span>
              </div>
            )}
            {debugInfo.responseMetadata.emotionEntries !== undefined && (
              <div className="text-gray-300">
                Emotion Entries: <span className="text-gray-100">{debugInfo.responseMetadata.emotionEntries}</span>
              </div>
            )}
            {debugInfo.responseMetadata.physiologicalEntries !== undefined && (
              <div className="text-gray-300">
                Physiological Entries: <span className="text-gray-100">{debugInfo.responseMetadata.physiologicalEntries}</span>
              </div>
            )}
            {debugInfo.responseMetadata.totalDataPoints !== undefined && (
              <div className="text-gray-300">
                Total Data Points: <span className="text-gray-100">{debugInfo.responseMetadata.totalDataPoints}</span>
              </div>
            )}
            {debugInfo.responseMetadata.dataSource && (
              <div className="text-gray-300">
                Data Source: <span className="text-gray-100">{debugInfo.responseMetadata.dataSource}</span>
              </div>
            )}
            {debugInfo.responseMetadata.truncated && (
              <div className="text-yellow-400">
                ⚠ Truncated (Original: {debugInfo.responseMetadata.originalSize || 'N/A'})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {debugInfo.performance && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-blue-400 font-semibold mb-2">Performance Metrics:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {debugInfo.performance.apiRequestMs !== undefined && (
              <div className="text-gray-300">
                API Request: <span className="text-blue-300 font-semibold">{debugInfo.performance.apiRequestMs}ms</span>
              </div>
            )}
            {debugInfo.performance.dataConversionMs !== undefined && (
              <div className="text-gray-300">
                Data Conversion: <span className="text-blue-300 font-semibold">{debugInfo.performance.dataConversionMs}ms</span>
              </div>
            )}
            {debugInfo.performance.totalMs !== undefined && (
              <div className="text-gray-300">
                Total Time: <span className="text-blue-300 font-semibold">{debugInfo.performance.totalMs}ms</span>
              </div>
            )}
            {debugInfo.performance.responseSizeKb !== undefined && (
              <div className="text-gray-300">
                Response Size: <span className="text-blue-300 font-semibold">{debugInfo.performance.responseSizeKb}KB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Merkle DAG: components.timeline_visualization -> refactored_complete
// 時系列統合可視化コンポーネントのモジュール化完了
