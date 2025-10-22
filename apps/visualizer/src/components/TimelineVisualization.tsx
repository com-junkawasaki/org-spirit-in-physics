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
  } = useTimelineData({ participantId })

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

  // 表示モードの状態
  const [activeTab, setActiveTab] = useState<'timeline' | 'force3d' | 'split'>('timeline')

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
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4" aria-label="Tabs">
            {[
              { id: 'timeline', label: '時系列統合', icon: '📈' },
              { id: 'force3d', label: '3D Force', icon: '⚡' },
              { id: 'split', label: '分割表示', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
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

              {/* 3D Force コントロール */}
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

              {/* 3D Force グラフ本体 */}
              {mounted && (() => {
                try {
                  // 実際のデータから3Dグラフを生成
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

                    for (const dpt of data) {
                      const w = dpt.word
                      if (!wordEmotionSum[w]) wordEmotionSum[w] = new Array(EMOTION_KEYS.length).fill(0)
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

                    const normalizedEmotionVec: Record<string, number[]> = {}
                    Object.keys(wordEmotionSum).forEach((w) => {
                      normalizedEmotionVec[w] = normalize(wordEmotionSum[w])
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
                    const topK = 2
                    const minW = 0.25
                    const weightGamma = 1.6

                    // アンカーの位置ベクトルを取得
                    const anchorPos: Array<[number, number, number]> = anchorNodes.map(a => (a.initial as [number, number, number]))

                    for (let wi = 0; wi < nodes.length; wi++) {
                      const wordIndex = baseOffset + wi
                      const label = nodes[wi].label
                      const ei = normalizedEmotionVec[label] || new Array(10).fill(0)

                      // 各アンカーに対する重み
                      const weights: Array<{ ai: number; w: number }> = anchorNodes.map((a, ai) => {
                        const key = anchorToKey[a.label] as typeof EMOTION_KEYS[number] | undefined
                        const kIdx = key ? (EMOTION_KEYS as readonly string[]).indexOf(key) : -1
                        const sim = kIdx >= 0 ? (ei[kIdx] || 0) : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                        const w = Math.pow(Math.max(0, Math.min(1, sim)), weightGamma)
                        return { ai, w }
                      })

                      // Top-K選定
                      weights.sort((a, b) => b.w - a.w)
                      let chosen = weights.filter(x => x.w >= minW).slice(0, topK)
                      if (chosen.length === 0 && weights.length > 0) chosen = weights.slice(0, 1)

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
                          nodes[wi].initial = [ (vx/len) * r * j, (vy/len) * r * j, (vz/len) * r * j ]
                        }
                      }

                      // リンク生成
                      for (const c of chosen) {
                        const w = Math.max(0, Math.min(1, c.w))
                        const L0 = Math.max(20, restLength * (1 - 0.6 * w))
                        const k = springK * (0.3 + 0.7 * w)
                        links.push({ source: c.ai, target: wordIndex, weight: w, mode: 'tension', L0, k })
                      }
                    }

                    return { nodes: allNodes, links }
                  }

                  const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                  const { nodes, links } = generateForce3DGraph()

                  console.log('3Dグラフデータ:', { nodes: nodes.length, links: links.length })

                  return (
                    <div className="border rounded overflow-hidden">
                      <Force3D
                        nodes={nodes}
                        links={links}
                        width={width}
                        height={Math.max(500, height)}
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
                <h4 className="font-medium mb-2 text-sm">3D Force</h4>
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

                        for (const dpt of data) {
                          const w = dpt.word
                          if (!wordEmotionSum[w]) wordEmotionSum[w] = new Array(EMOTION_KEYS.length).fill(0)
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

                        const normalizedEmotionVec: Record<string, number[]> = {}
                        Object.keys(wordEmotionSum).forEach((w) => {
                          normalizedEmotionVec[w] = normalize(wordEmotionSum[w])
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
                            const w = Math.max(0, Math.min(1, c.w))
                            const L0 = Math.max(20, restLength * (1 - 0.6 * w))
                            const k = springK * (0.3 + 0.7 * w)
                            links.push({ source: c.ai, target: wordIndex, weight: w, mode: 'tension', L0, k })
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
                            height={Math.max(300, height - 200)}
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
