'use client'

import React, { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTimelineData } from './timeline/useTimelineData'
import TimelineChart from './timeline/TimelineChart'
import KPICards from './timeline/KPICards'
import Force3DControls from './timeline/Force3DControls'
import type {
  TimelineVisualizationProps,
  ForcePreset,
  WordNode,
  WordLink
} from './timeline/types'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'

// Merkle DAG: components.timeline_visualization
// 時系列統合可視化コンポーネント
// 依存関係: React, timeline modules
// BPMN: TimelineVisualizationComponent

export default function TimelineVisualization({ 
  participantId,
  sessionId,
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
    refetchData
  } = useTimelineData({ participantId, sessionId })

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
  const [physicsMode, setPhysicsMode] = useState<'all' | 'emotion' | 'physio' | 'reactionSpeed'>('all')
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
    )
  }

  return (
    <div className="space-y-4">
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
                try {
                  // 実際のデータから3Dグラフを生成
                  const generateForce3DGraph = (): { nodes: WordNode[]; links: WordLink[] } => {
                  const jungWords = JUNG_STIMULUS_WORDS // 全てのデータを表示

                  // セグメント選択に応じてデータを抽出
                  const sessionData = (() => {
                    if (segment === 'first100') return data.slice(0, 100)
                    if (segment === 'next100') return data.slice(100, 200)
                    return data
                  })()

                  // 集約（ノード指標）。全語を初期化し、セッション実データで加算
                  const accum: Record<string, { count: number; sumReactionValue: number; sumReactionTime: number; sumPhysAbs: number }> = {}
                  jungWords.forEach(({ japanese }) => { accum[japanese] = { count: 0, sumReactionValue: 0, sumReactionTime: 0, sumPhysAbs: 0 } })
                    const physBySeries: Record<string, number[]> = {}
                    const rtBySeries: Record<string, number[]> = {}
                    for (const d of sessionData) {
                      if (!accum[d.word]) continue // セッション語がユング語に無い場合は無視
                      accum[d.word].count += 1
                      accum[d.word].sumReactionValue += d.reactionValue
                      accum[d.word].sumReactionTime += d.reactionTime
                      const phys = getPhysStat(d.physiological, 'average')
                      if (Number.isFinite(phys)) {
                        if (!('sumPhysAbs' in accum[d.word])) (accum[d.word] as any).sumPhysAbs = 0
                        ;(accum[d.word] as any).sumPhysAbs += Math.abs(phys as number)
                        if (!physBySeries[d.word]) physBySeries[d.word] = []
                        physBySeries[d.word].push(phys as number)
                      }
                      if (!rtBySeries[d.word]) rtBySeries[d.word] = []
                      rtBySeries[d.word].push(d.reactionTime)
                    }

                    // 生スケール: 平均反応値 × log(1+回数)
                    const nodeEntries = jungWords.map(({ japanese }) => {
                      const g = accum[japanese]
                      const avgRV = g.count > 0 ? g.sumReactionValue / g.count : 0
                      const raw = avgRV * Math.log1p(g.count)
                      return { japanese, count: g.count, avgReactionValue: avgRV, raw }
                    })

                    const rawMin = Math.min(...nodeEntries.map(n => n.raw))
                    const rawMax = Math.max(...nodeEntries.map(n => n.raw))
                    const denom = rawMax - rawMin || 1

                    const nodes: WordNode[] = nodeEntries.map((n, idx) => ({
                      id: String(idx),
                      label: n.japanese,
                      // 0.5〜6.0程度に正規化（視認性のため）
                      scale: Math.max(0.5, 0.5 + 5.5 * ((n.raw - rawMin) / denom)),
                      nodeType: 'word'
                    }))

                    // 感情ベクトル（10カテゴリに射影）を単語ごとに集約して正規化
                    const emotionIndex: Record<string, number> = Object.fromEntries(EMOTION_KEYS.map((k, i) => [k, i]))
                    const wordEmotionSum: Record<string, number[]> = {}
                    
                    // 全てのjungWordsの単語で事前に初期化（sessionDataに含まれていない単語も含める）
                    jungWords.forEach(({ japanese }) => {
                      wordEmotionSum[japanese] = new Array(EMOTION_KEYS.length).fill(0)
                    })

                    for (const dpt of sessionData) {
                      const w = dpt.word
                      // sessionDataに含まれていない単語はスキップ（既に初期化済み）
                      if (!wordEmotionSum[w]) continue
                      if (Array.isArray(dpt.emotions)) {
                        for (const e of dpt.emotions) {
                          const key = (e.name || 'unknown').toLowerCase()
                          const idx = emotionIndex[key]
                          // モダリティフィルタ
                          const ft = String((e as any).fileType || '')
                          const ftLow = ft.toLowerCase()
                          const mod: typeof MOD_KEYS[number] | undefined = ftLow.includes('prosody') ? 'prosody' : ftLow.includes('burst') ? 'burst' : ftLow.includes('face') ? 'face' : ftLow.includes('language') ? 'language' : undefined
                          if (idx !== undefined && (!mod || selectedModalities.has(mod))) {
                            wordEmotionSum[w][idx] += Number.isFinite(e.score) ? (e.score as number) : 0
                          }
                        }
                      }
                    }

                    const normalize = (vec: number[]): number[] => {
                      const norm = Math.hypot(...vec)
                      if (!Number.isFinite(norm) || norm === 0) return vec.map(() => 0)
                      return vec.map((x) => x / norm)
                    }

                    // 全てのjungWordsの単語に対して正規化ベクトルを計算
                    const normalizedEmotionVec: Record<string, number[]> = {}
                    jungWords.forEach(({ japanese }) => {
                      normalizedEmotionVec[japanese] = normalize(wordEmotionSum[japanese] || new Array(EMOTION_KEYS.length).fill(0))
                    })

                    // 力学モードの係数を単語別に算出（強度+変動）
                    const physValues: number[] = []
                    const physStdValues: number[] = []
                    const speedValues: number[] = []
                    const physByWord: Record<string, number> = {}
                    const physStdByWord: Record<string, number> = {}
                    const speedByWord: Record<string, number> = {}
                    for (const { japanese } of jungWords) {
                      const g = accum[japanese]
                      const c = g?.count || 0
                      const physAvg = c > 0 ? ((g as any).sumPhysAbs || 0) / c : 0
                      const series = physBySeries[japanese] || []
                      const mean = series.length ? series.reduce((s, x) => s + x, 0) / series.length : 0
                      const variance = series.length ? series.reduce((s, x) => s + (x - mean) * (x - mean), 0) / series.length : 0
                      const physStd = Math.sqrt(Math.max(0, variance))
                      const speed = c > 0 ? (1 / Math.max(1, g.sumReactionTime / c)) : 0
                      physByWord[japanese] = physAvg
                      physStdByWord[japanese] = physStd
                      speedByWord[japanese] = speed
                      physValues.push(physAvg)
                      physStdValues.push(physStd)
                      speedValues.push(speed)
                    }
                    const minMax = (arr: number[]) => ({ min: Math.min(...arr, 0), max: Math.max(...arr, 1e-6) })
                    const pm = minMax(physValues)
                    const psm = minMax(physStdValues)
                    const sm = minMax(speedValues)
                    const norm01 = (x: number, mm: { min: number; max: number }) => (mm.max - mm.min === 0 ? 0 : (x - mm.min) / (mm.max - mm.min))

                    // ノード視覚スケールを強度・変動に応じて補正
                    for (const node of nodes) {
                      const w = node.label
                      const strength = norm01(physByWord[w] || 0, pm)
                      const change = norm01(physStdByWord[w] || 0, psm)
                      const m = 0.6 * strength + 0.4 * change
                      if (physicsMode !== 'emotion') {
                        node.scale = Math.max(0.5, Math.min(10, node.scale * (0.7 + 1.3 * m)))
                      }
                    }

                    // 感情アンカー（2Dマップを球面へ射影）
                    const anchor2d: Array<{ name: string; x: number; y: number; color: string }> = [
                      { name: 'Joy', x: 0.15, y: 0.85, color: '#f59e0b' },
                      { name: 'Sadness', x: 0.70, y: 0.45, color: '#1f2937' },
                      { name: 'Anger', x: 0.82, y: 0.25, color: '#ef4444' },
                      { name: 'Fear', x: 0.92, y: 0.10, color: '#a78bfa' },
                      { name: 'Disgust', x: 0.78, y: 0.52, color: '#10b981' },
                      { name: 'Calmness', x: 0.28, y: 0.70, color: '#93c5fd' },
                      { name: 'Interest', x: 0.35, y: 0.55, color: '#60a5fa' },
                      { name: 'Surprise', x: 0.40, y: 0.20, color: '#22c55e' },
                      { name: 'Confusion', x: 0.48, y: 0.35, color: '#64748b' },
                      { name: 'Determination', x: 0.22, y: 0.85, color: '#f97316' },
                    ]

                    const anchorToKey: Record<string, typeof EMOTION_KEYS[number]> = {
                      Joy: 'joy',
                      Sadness: 'sadness',
                      Anger: 'anger',
                      Fear: 'fear',
                      Disgust: 'disgust',
                      Calmness: 'calm',
                      Interest: 'focus',
                      Surprise: 'surprise',
                      Confusion: 'confusion',
                      Determination: 'focus',
                    }

                    const emotionColor: Record<typeof EMOTION_KEYS[number], string> = {
                      joy: '#f59e0b',
                      sadness: '#1f2937',
                      anger: '#ef4444',
                      fear: '#a78bfa',
                      surprise: '#a78bfa',
                      disgust: '#10b981',
                      calm: '#93c5fd',
                      focus: '#60a5fa',
                      excitement: '#22d3ee',
                      confusion: '#64748b',
                    }

                    const anchorRadius = shellRadius // 球殻上に配置
                    const toSphere = (x01: number, y01: number): [number, number, number] => {
                      const u = (x01 - 0.5) * Math.PI * 1.6 // 横回転
                      const v = (y01 - 0.5) * Math.PI // 縦
                      const cx = Math.cos(v) * Math.cos(u)
                      const cy = Math.cos(v) * Math.sin(u)
                      const cz = Math.sin(v)
                      return [anchorRadius * cx, anchorRadius * cy, anchorRadius * cz]
                    }

                    const anchorNodes: WordNode[] = anchor2d.map((a, idx) => {
                      const [x, y, z] = toSphere(a.x, a.y)
                      return {
                        id: `A${idx}`,
                        label: a.name,
                        scale: 6,
                        fixed: true,
                        nodeType: 'anchor',
                        initial: [x, y, z],
                        color: a.color,
                      }
                    })

                    // アンカー追加と接続
                    const baseOffset = nodes.length
                    const allNodes = [...anchorNodes, ...nodes]

                    // 感情結合に基づくリンク生成（Shannon: Top-Kで疎化し、初期位置をアンカー側へ）
                    const links: WordLink[] = []

                    // アンカーの位置ベクトルを取得
                    const anchorPos: Array<[number, number, number]> = anchorNodes.map(a => (a.initial as [number, number, number]))

                    for (let wi = 0; wi < nodes.length; wi++) {
                      const wordIndex = baseOffset + wi
                      const label = nodes[wi].label
                      const ei = normalizedEmotionVec[label] || new Array(10).fill(0)

                      // 各アンカーに対する重み
                      const weights: Array<{ ai: number; w: number }> = anchorNodes.map((a, ai) => {
                        const key = anchorToKey[a.label] as typeof EMOTION_KEYS[number] | undefined
                        // 感情フィルター: 未選択のアンカーは重み0
                        if (key && !selectedEmotions.has(key)) return { ai, w: 0 }
                        const kIdx = key ? (EMOTION_KEYS as readonly string[]).indexOf(key) : -1
                        const sim = kIdx >= 0 ? (ei[kIdx] || 0) : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                        const w = Math.pow(Math.max(0, Math.min(1, sim)), weightGamma)
                        return { ai, w }
                      })

                      // Top-K選定
                      weights.sort((a, b) => b.w - a.w)
                      let chosen = weights.filter(x => x.w >= minW).slice(0, topK)
                      if (chosen.length === 0 && weights.length > 0) chosen = weights.slice(0, 1)

                      // 力学モード: 単語係数
                      const factor = physicsMode === 'all'
                        ? (0.5 * (ei.reduce((s, x) => s + x, 0) / Math.max(1, ei.length)) + 0.3 * norm01(physByWord[label] || 0, pm) + 0.2 * norm01(speedByWord[label] || 0, sm))
                        : physicsMode === 'emotion'
                          ? 1
                          : physicsMode === 'physio'
                            ? norm01(physByWord[label] || 0, pm)
                            : norm01(speedByWord[label] || 0, sm)

                      // 初期位置をアンカー側に寄せる
                      if (chosen.length > 0) {
                        let vx = 0, vy = 0, vz = 0, sw = 0
                        for (const c of chosen) {
                          const p = anchorPos[c.ai]
                          vx += p[0] * c.w
                          vy += p[1] * c.w
                          vz += p[2] * c.w
                          sw += c.w
                        }
                        if (sw > 0) {
                          vx /= sw; vy /= sw; vz /= sw
                          const len = Math.hypot(vx, vy, vz) || 1
                          const r = shellRadius * 0.65
                          const j = 1 + (Math.random() - 0.5) * 0.1 // わずかな揺らぎ
                          let init: [number, number, number] = [ (vx/len) * r * j, (vy/len) * r * j, (vz/len) * r * j ]
                          if (animateTransitions) {
                            const prev = lastInitialsRef.current.get(label)
                            if (prev) init = [ prev[0] * 0.8 + init[0] * 0.2, prev[1] * 0.8 + init[1] * 0.2, prev[2] * 0.8 + init[2] * 0.2 ]
                          }
                          nodes[wi].initial = init
                          lastInitialsRef.current.set(label, init)
                        }
                      }

                      // リンク生成（感情色を付与）
                      for (const c of chosen) {
                        const a = anchorNodes[c.ai]
                        const key = anchorToKey[a.label]
                        const base = key ? emotionColor[key] : undefined
                        const w = Math.max(0, Math.min(1, c.w * Math.max(0.1, factor)))
                        const L0 = Math.max(20, restLength * (1 - 0.6 * w))
                        const k = springK * (0.3 + 0.7 * w)
                        const alpha = Math.max(0.12, Math.min(0.95, 0.12 + 0.88 * w))
                        const color = base ? `rgba(${parseInt(base.slice(1,3),16)}, ${parseInt(base.slice(3,5),16)}, ${parseInt(base.slice(5,7),16)}, ${alpha.toFixed(3)})` : `rgba(30, 64, 175, ${alpha.toFixed(3)})`
                        links.push({ source: c.ai, target: wordIndex, weight: w, mode: 'tension', L0, k, color })
                      }
                    }

                    return { nodes: allNodes, links }
                  }

                  const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                    const { nodes, links } = generateForce3DGraph()

                    // 選択語を中心へ（固定）し目立たせる
                    if (selectedWord) {
                      const idx = nodes.findIndex(n => n.label === selectedWord)
                      if (idx >= 0) {
                        nodes[idx].fixed = true
                        nodes[idx].initial = [0, 0, 0]
                        nodes[idx].scale = Math.max(nodes[idx].scale, 6)
                        nodes[idx].color = '#111827'
                      }
                    }

                  console.log('3Dグラフデータ:', { nodes: nodes.length, links: links.length })

                  return (
                    <div className="border rounded overflow-hidden">
                      <Force3D
                        nodes={nodes}
                        links={links}
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
                  console.error('3Dグラフ生成エラー:', error)
                  return (
                    <div className="border rounded overflow-hidden p-4 text-red-600">
                      3Dグラフの生成に失敗しました: {error instanceof Error ? error.message : 'Unknown error'}
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
                    try {
                      const generateForce3DGraph = (): { nodes: WordNode[]; links: WordLink[] } => {
                      const jungWords = JUNG_STIMULUS_WORDS // 全てのデータを表示

                      // 集約（ノード指標）。全語を初期化し、セッション実データで加算
                      const accum: Record<string, { count: number; sumReactionValue: number; sumReactionTime: number }> = {}
                      jungWords.forEach(({ japanese }) => { accum[japanese] = { count: 0, sumReactionValue: 0, sumReactionTime: 0 } })
                        for (const d of data) {
                          if (!accum[d.word]) continue // セッション語がユング語に無い場合は無視
                          accum[d.word].count += 1
                          accum[d.word].sumReactionValue += d.reactionValue
                          accum[d.word].sumReactionTime += d.reactionTime
                        }

                        // 生スケール: 平均反応値 × log(1+回数)
                        const nodeEntries = jungWords.map(({ japanese }) => {
                          const g = accum[japanese]
                          const avgRV = g.count > 0 ? g.sumReactionValue / g.count : 0
                          const raw = avgRV * Math.log1p(g.count)
                          return { japanese, count: g.count, avgReactionValue: avgRV, raw }
                        })

                        const rawMin = Math.min(...nodeEntries.map(n => n.raw))
                        const rawMax = Math.max(...nodeEntries.map(n => n.raw))
                        const denom = rawMax - rawMin || 1

                        const nodes: WordNode[] = nodeEntries.map((n, idx) => ({
                          id: String(idx),
                          label: n.japanese,
                          // 0.5〜6.0程度に正規化（視認性のため）
                          scale: Math.max(0.5, 0.5 + 5.5 * ((n.raw - rawMin) / denom)),
                          nodeType: 'word'
                        }))

                        // 感情ベクトル（10カテゴリに射影）を単語ごとに集約して正規化
                        const EMOTION_KEYS = ['joy','sadness','anger','fear','surprise','disgust','calm','focus','excitement','confusion'] as const
                        const emotionIndex: Record<string, number> = Object.fromEntries(EMOTION_KEYS.map((k, i) => [k, i]))
                        const wordEmotionSum: Record<string, number[]> = {}
                        
                        // 全てのjungWordsの単語で事前に初期化（dataに含まれていない単語も含める）
                        jungWords.forEach(({ japanese }) => {
                          wordEmotionSum[japanese] = new Array(EMOTION_KEYS.length).fill(0)
                        })

                        for (const dpt of data) {
                          const w = dpt.word
                          // dataに含まれていない単語はスキップ（既に初期化済み）
                          if (!wordEmotionSum[w]) continue
                          if (Array.isArray(dpt.emotions)) {
                            for (const e of dpt.emotions) {
                              const key = (e.name || 'unknown').toLowerCase()
                              const idx = emotionIndex[key]
                              if (idx !== undefined) {
                                wordEmotionSum[w][idx] += Number.isFinite(e.score) ? (e.score as number) : 0
                              }
                            }
                          }
                        }

                        const normalize = (vec: number[]): number[] => {
                          const norm = Math.hypot(...vec)
                          if (!Number.isFinite(norm) || norm === 0) return vec.map(() => 0)
                          return vec.map((x) => x / norm)
                        }

                        // 全てのjungWordsの単語に対して正規化ベクトルを計算
                        const normalizedEmotionVec: Record<string, number[]> = {}
                        jungWords.forEach(({ japanese }) => {
                          normalizedEmotionVec[japanese] = normalize(wordEmotionSum[japanese] || new Array(EMOTION_KEYS.length).fill(0))
                        })

                        // 感情アンカー（2Dマップを球面へ射影）
                        const anchor2d: Array<{ name: string; x: number; y: number; color: string }> = [
                          { name: 'Joy', x: 0.15, y: 0.85, color: '#f59e0b' },
                          { name: 'Sadness', x: 0.70, y: 0.45, color: '#1f2937' },
                          { name: 'Anger', x: 0.82, y: 0.25, color: '#ef4444' },
                          { name: 'Fear', x: 0.92, y: 0.10, color: '#a78bfa' },
                          { name: 'Disgust', x: 0.78, y: 0.52, color: '#10b981' },
                          { name: 'Calmness', x: 0.28, y: 0.70, color: '#93c5fd' },
                          { name: 'Interest', x: 0.35, y: 0.55, color: '#60a5fa' },
                          { name: 'Surprise', x: 0.40, y: 0.20, color: '#22c55e' },
                          { name: 'Confusion', x: 0.48, y: 0.35, color: '#64748b' },
                          { name: 'Determination', x: 0.22, y: 0.85, color: '#f97316' },
                        ]

                        const anchorToKey: Record<string, typeof EMOTION_KEYS[number]> = {
                          Joy: 'joy',
                          Sadness: 'sadness',
                          Anger: 'anger',
                          Fear: 'fear',
                          Disgust: 'disgust',
                          Calmness: 'calm',
                          Interest: 'focus',
                          Surprise: 'surprise',
                          Confusion: 'confusion',
                          Determination: 'focus',
                        }

                        const emotionColor: Record<typeof EMOTION_KEYS[number], string> = {
                          joy: '#f59e0b',
                          sadness: '#1f2937',
                          anger: '#ef4444',
                          fear: '#a78bfa',
                          surprise: '#a78bfa',
                          disgust: '#10b981',
                          calm: '#93c5fd',
                          focus: '#60a5fa',
                          excitement: '#22d3ee',
                          confusion: '#64748b',
                        }

                        const anchorRadius = shellRadius // 球殻上に配置
                        const toSphere = (x01: number, y01: number): [number, number, number] => {
                          const u = (x01 - 0.5) * Math.PI * 1.6 // 横回転
                          const v = (y01 - 0.5) * Math.PI // 縦
                          const cx = Math.cos(v) * Math.cos(u)
                          const cy = Math.cos(v) * Math.sin(u)
                          const cz = Math.sin(v)
                          return [anchorRadius * cx, anchorRadius * cy, anchorRadius * cz]
                        }

                        const anchorNodes: WordNode[] = anchor2d.map((a, idx) => {
                          const [x, y, z] = toSphere(a.x, a.y)
                          return {
                            id: `A${idx}`,
                            label: a.name,
                            scale: 6,
                            fixed: true,
                            nodeType: 'anchor',
                            initial: [x, y, z],
                            color: a.color,
                          }
                        })

                        // アンカー追加と接続
                        const baseOffset = nodes.length
                        const allNodes = [...anchorNodes, ...nodes]

                        // 感情結合に基づくリンク生成（Shannon: Top-K疎化 + 初期位置寄せ）
                        const links: WordLink[] = []
                        const topK = 2
                        const minW = 0.25
                        const weightGamma = 1.6

                        const anchorPos: Array<[number, number, number]> = anchorNodes.map(a => (a.initial as [number, number, number]))

                        for (let wi = 0; wi < nodes.length; wi++) {
                          const wordIndex = baseOffset + wi
                          const label = nodes[wi].label
                          const ei = normalizedEmotionVec[label] || new Array(10).fill(0)

                          const weights: Array<{ ai: number; w: number }> = anchorNodes.map((a, ai) => {
                            const key = anchorToKey[a.label] as typeof EMOTION_KEYS[number] | undefined
                            const kIdx = key ? (EMOTION_KEYS as readonly string[]).indexOf(key) : -1
                            const sim = kIdx >= 0 ? (ei[kIdx] || 0) : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                            const w = Math.pow(Math.max(0, Math.min(1, sim)), weightGamma)
                            return { ai, w }
                          })

                          weights.sort((a, b) => b.w - a.w)
                          let chosen = weights.filter(x => x.w >= minW).slice(0, topK)
                          if (chosen.length === 0 && weights.length > 0) chosen = weights.slice(0, 1)

                          if (chosen.length > 0) {
                            let vx = 0, vy = 0, vz = 0, sw = 0
                            for (const c of chosen) {
                              const p = anchorPos[c.ai]
                              vx += p[0] * c.w
                              vy += p[1] * c.w
                              vz += p[2] * c.w
                              sw += c.w
                            }
                            if (sw > 0) {
                              vx /= sw; vy /= sw; vz /= sw
                              const len = Math.hypot(vx, vy, vz) || 1
                              const r = shellRadius * 0.65
                              const j = 1 + (Math.random() - 0.5) * 0.1
                              nodes[wi].initial = [ (vx/len) * r * j, (vy/len) * r * j, (vz/len) * r * j ]
                            }
                          }

                          for (const c of chosen) {
                            const a = anchorNodes[c.ai]
                            const key = anchorToKey[a.label]
                            const color = key ? emotionColor[key] : undefined
                            const w = Math.max(0, Math.min(1, c.w))
                            const L0 = Math.max(20, restLength * (1 - 0.6 * w))
                            const k = springK * (0.3 + 0.7 * w)
                            links.push({ source: c.ai, target: wordIndex, weight: w, mode: 'tension', L0, k, color })
                          }
                        }

                        return { nodes: allNodes, links }
                      }

                      const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                      const { nodes, links } = generateForce3DGraph()

                      return (
                        <div className="border rounded overflow-hidden">
                            <Force3D
                            nodes={nodes}
                            links={links}
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
                      console.error('3Dグラフ生成エラー:', error)
                      return (
                        <div className="border rounded overflow-hidden p-4 text-red-600">
                          3Dグラフの生成に失敗しました: {error instanceof Error ? error.message : 'Unknown error'}
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
    </div>
  )
}

// Merkle DAG: components.timeline_visualization -> refactored_complete
// 時系列統合可視化コンポーネントのモジュール化完了
