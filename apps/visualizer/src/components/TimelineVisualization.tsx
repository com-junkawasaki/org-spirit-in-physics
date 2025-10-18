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
  const [radialOutK] = useState(0)
  const [constraintIters] = useState(2)
  const [constraintStiffness] = useState(0.5)
  const [minSep, setMinSep] = useState(40)
  const [sepK, setSepK] = useState(3000)

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
  const [activeTab, setActiveTab] = useState<'timeline' | 'force3d' | 'split' | 'compare'>('timeline')

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
              { id: 'compare', label: '前後比較', icon: '⚖️' },
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

        {/* タブコンテンツ（ダミーの欠落を修正）*/}
        <div className="p-4">
          {activeTab === 'timeline' && (
            <div />
          )}
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

                    // 感情の色空間配置（感情ベクトルに基づく3D配置）
                    const emotionColors: Record<string, string> = {
                      joy: '#f59e0b',
                      sadness: '#1f2937',
                      anger: '#ef4444',
                      fear: '#a78bfa',
                      surprise: '#10b981',
                      disgust: '#6b7280',
                      calm: '#84cc16',
                      focus: '#f59e0b',
                      excitement: '#ec4899',
                      confusion: '#6366f1'
                    }

                    // 感情空間の主成分分析で配置を決定
                    const emotionPCA = () => {
                      const wordsWithVec = nodes.map(n => ({ n, v: normalizedEmotionVec[n.label] || new Array(10).fill(0) }))
                      const dim = 10
                      if (wordsWithVec.length === 0) return wordsWithVec.map(({ n }) => ({ n, vec: [0, 0, 0] as [number, number, number] }))

                      // 行列 X: rows=語, cols=10感情（平均0へ中心化）
                      const means = new Array(dim).fill(0)
                      for (const { v } of wordsWithVec) for (let j = 0; j < dim; j++) means[j] += (v[j] || 0)
                      for (let j = 0; j < dim; j++) means[j] /= Math.max(1, wordsWithVec.length)
                      const X = wordsWithVec.map(({ v }) => means.map((m, j) => (v[j] || 0) - m))

                      // 共分散 C = (X^T X) / (n-1)
                      const C = Array.from({ length: dim }, () => new Array(dim).fill(0))
                      for (let i = 0; i < dim; i++) {
                        for (let j = i; j < dim; j++) {
                          let s = 0
                          for (let r = 0; r < X.length; r++) s += X[r][i] * X[r][j]
                          const val = s / Math.max(1, X.length - 1)
                          C[i][j] = val
                          C[j][i] = val
                        }
                      }

                      // パワー反復で上位3固有ベクトル（簡易）
                      const powerIter = (A: number[][], iters = 32): number[] => {
                        let v = Array.from({ length: dim }, () => Math.random())
                        const normv = () => {
                          const nrm = Math.hypot(...v)
                          if (nrm > 0) v = v.map(x => x / nrm)
                        }
                        normv()
                        for (let t = 0; t < iters; t++) {
                          const Av = new Array(dim).fill(0)
                          for (let i = 0; i < dim; i++) {
                            let s = 0
                            for (let j = 0; j < dim; j++) s += A[i][j] * v[j]
                            Av[i] = s
                          }
                          v = Av
                          normv()
                        }
                        return v
                      }

                      const dotv = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
                      const v1 = powerIter(C)
                      const C2 = Array.from({ length: dim }, (_, i) => C[i].slice())
                      for (let i = 0; i < dim; i++) {
                        for (let j = 0; j < dim; j++) {
                          C2[i][j] -= v1[i] * v1[j] * dotv(v1, C.map(row => row[j]))
                        }
                      }
                      const v2 = powerIter(C2)
                      const C3 = Array.from({ length: dim }, (_, i) => C2[i].slice())
                      for (let i = 0; i < dim; i++) {
                        for (let j = 0; j < dim; j++) {
                          C3[i][j] -= v2[i] * v2[j] * dotv(v2, C2.map(row => row[j]))
                        }
                      }
                      const v3 = powerIter(C3)

                      // スコア = X * [v1,v2,v3]
                      const embed3 = wordsWithVec.map(({ n: node }, r) => {
                        const x = X[r]
                        const s1 = dotv(x, v1)
                        const s2 = dotv(x, v2)
                        const s3 = dotv(x, v3)
                        return { node, vec: [s1, s2, s3] as [number, number, number] }
                      })

                      // スケール調整と正規化
                      const scale = shellRadius * 0.6
                      return embed3.map(({ node, vec }) => {
                        const norm = Math.hypot(vec[0], vec[1], vec[2])
                        if (norm > 0) node.initial = [vec[0] / norm * scale, vec[1] / norm * scale, vec[2] / norm * scale]
                        return { node, vec }
                      })
                    }

                    // 感情の色に基づく配置（感情空間の中心に配置）
                    const emotionAnchors = emotionPCA()
                    const anchorNodes: WordNode[] = emotionAnchors.map(({ node }, idx) => ({
                      ...node,
                      scale: 8,
                      fixed: true,
                      nodeType: 'anchor',
                      color: emotionColors[EMOTION_KEYS[idx]] || '#999999',
                    }))

                    // アンカー追加と接続
                    const baseOffset = nodes.length
                    const allNodes = [...anchorNodes, ...nodes]

                    // 感情結合に基づくリンク生成（感情アンカー → 単語ノード）
                    const emotionLinks: WordLink[] = []
                    for (let ai = 0; ai < anchorNodes.length; ai++) {
                      const anchor = anchorNodes[ai]
                      const anchorIndex = ai
                      const key = EMOTION_KEYS[ai] // インデックスから感情キーを取得
                      const kIdx = emotionIndex[key]

                      for (let wi = 0; wi < nodes.length; wi++) {
                        const wordIndex = baseOffset + wi
                        const ei = normalizedEmotionVec[nodes[wi].label] || new Array(10).fill(0)
                        const sim = kIdx >= 0 ? ei[kIdx] || 0 : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                        const w = Math.max(0, Math.min(1, sim))
                        if (w < 0.15) continue // 極弱リンクをスキップ
                        const L0 = Math.max(10, restLength * (1 - 0.6 * w))
                        const k = springK * (0.3 + 0.7 * w)
                        emotionLinks.push({ source: anchorIndex, target: wordIndex, weight: w, mode: 'tension', L0, k })
                      }
                    }

                    // 単語間の関係性に基づくリンク生成（単語ノード → 単語ノード）
                    const wordLinks: WordLink[] = []
                    const wordNodes = nodes
                    const wordToIndex = Object.fromEntries(wordNodes.map((n, i) => [n.label, baseOffset + i]))

                    // 単語間の感情ベクトル類似度を計算
                    for (let i = 0; i < wordNodes.length; i++) {
                      for (let j = i + 1; j < wordNodes.length; j++) {
                        const wordI = wordNodes[i].label
                        const wordJ = wordNodes[j].label

                        const vecI = normalizedEmotionVec[wordI] || new Array(10).fill(0)
                        const vecJ = normalizedEmotionVec[wordJ] || new Array(10).fill(0)

                        // コサイン類似度を計算
                        const dot = vecI.reduce((sum, v, idx) => sum + v * (vecJ[idx] || 0), 0)
                        const normI = Math.hypot(...vecI)
                        const normJ = Math.hypot(...vecJ)
                        const sim = (normI * normJ > 0) ? dot / (normI * normJ) : 0

                        const w = Math.max(0, Math.min(1, (sim + 1) / 2)) // -1〜1を0〜1に正規化
                        if (w < 0.1) continue // 弱い関連性はスキップ

                        const L0 = Math.max(10, restLength * (1 + 0.8 * (1 - w))) // 類似度が高いほど近い距離
                        const k = springK * (0.2 + 0.6 * w)
                        wordLinks.push({
                          source: wordToIndex[wordI],
                          target: wordToIndex[wordJ],
                          weight: w,
                          mode: 'tension',
                          L0,
                          k
                        })
                      }
                    }

                    const links = [...emotionLinks, ...wordLinks]
                    return { nodes: allNodes, links }
                  }

                  const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                  const { nodes, links } = generateForce3DGraph()

                  // 感情空間に基づく背景色の計算
                  const calculateBackgroundColor = () => {
                    const avgEmotionVec = new Array(10).fill(0)

                    // 全単語の感情ベクトルの平均を計算
                    const wordNodes = nodes.filter(n => n.nodeType === 'word')
                    for (const node of wordNodes) {
                      const vec = normalizedEmotionVec[node.label]
                      if (vec) {
                        for (let i = 0; i < 10; i++) {
                          avgEmotionVec[i] += vec[i] || 0
                        }
                      }
                    }

                    // 平均を計算
                    for (let i = 0; i < 10; i++) {
                      avgEmotionVec[i] /= Math.max(1, wordNodes.length)
                    }

                    // 感情の色を混合して背景色を決定
                    const emotionColors: Record<string, [number, number, number]> = {
                      joy: [245, 158, 11],      // #f59e0b
                      sadness: [31, 41, 55],    // #1f2937
                      anger: [239, 68, 68],     // #ef4444
                      fear: [167, 139, 250],    // #a78bfa
                      surprise: [16, 163, 74],  // #10b981
                      disgust: [107, 114, 128], // #6b7280
                      calm: [132, 204, 22],     // #84cc16
                      focus: [245, 158, 11],    // #f59e0b
                      excitement: [236, 72, 153], // #ec4899
                      confusion: [99, 102, 241] // #6366f1
                    }

                    // 感情ベクトルに基づいて色を混合
                    let r = 0, g = 0, b = 0
                    let totalWeight = 0

                    for (let i = 0; i < EMOTION_KEYS.length; i++) {
                      const emotion = EMOTION_KEYS[i]
                      const weight = Math.max(0, avgEmotionVec[i] || 0)
                      const [cr, cg, cb] = emotionColors[emotion]

                      r += cr * weight
                      g += cg * weight
                      b += cb * weight
                      totalWeight += weight
                    }

                    if (totalWeight > 0) {
                      r = Math.round(r / totalWeight)
                      g = Math.round(g / totalWeight)
                      b = Math.round(b / totalWeight)
                    } else {
                      // デフォルトの背景色（中間色）
                      r = 240, g = 240, b = 240
                    }

                    return `rgb(${r}, ${g}, ${b})`
                  }

                  const backgroundColor = calculateBackgroundColor()
                  console.log('3Dグラフデータ:', { nodes: nodes.length, links: links.length, backgroundColor })

                  return (
                    <div className="border rounded overflow-hidden">
                      <Force3D
                        nodes={nodes}
                        links={links}
                        width={width}
                        height={Math.max(500, height)}
                        background={backgroundColor}
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

                        // 感情の色空間配置（感情ベクトルに基づく3D配置）
                        const emotionColors: Record<string, string> = {
                          joy: '#f59e0b',
                          sadness: '#1f2937',
                          anger: '#ef4444',
                          fear: '#a78bfa',
                          surprise: '#10b981',
                          disgust: '#6b7280',
                          calm: '#84cc16',
                          focus: '#f59e0b',
                          excitement: '#ec4899',
                          confusion: '#6366f1'
                        }

                        // 感情空間の主成分分析で配置を決定
                        const emotionPCA = () => {
                          const wordsWithVec = nodes.map(n => ({ n, v: normalizedEmotionVec[n.label] || new Array(10).fill(0) }))
                          const dim = 10
                          if (wordsWithVec.length === 0) return wordsWithVec.map(({ n }) => ({ n, vec: [0, 0, 0] as [number, number, number] }))

                          // 行列 X: rows=語, cols=10感情（平均0へ中心化）
                          const means = new Array(dim).fill(0)
                          for (const { v } of wordsWithVec) for (let j = 0; j < dim; j++) means[j] += (v[j] || 0)
                          for (let j = 0; j < dim; j++) means[j] /= Math.max(1, wordsWithVec.length)
                          const X = wordsWithVec.map(({ v }) => means.map((m, j) => (v[j] || 0) - m))

                          // 共分散 C = (X^T X) / (n-1)
                          const C = Array.from({ length: dim }, () => new Array(dim).fill(0))
                          for (let i = 0; i < dim; i++) {
                            for (let j = i; j < dim; j++) {
                              let s = 0
                              for (let r = 0; r < X.length; r++) s += X[r][i] * X[r][j]
                              const val = s / Math.max(1, X.length - 1)
                              C[i][j] = val
                              C[j][i] = val
                            }
                          }

                          // パワー反復で上位3固有ベクトル（簡易）
                          const powerIter = (A: number[][], iters = 32): number[] => {
                            let v = Array.from({ length: dim }, () => Math.random())
                            const normv = () => {
                              const nrm = Math.hypot(...v)
                              if (nrm > 0) v = v.map(x => x / nrm)
                            }
                            normv()
                            for (let t = 0; t < iters; t++) {
                              const Av = new Array(dim).fill(0)
                              for (let i = 0; i < dim; i++) {
                                let s = 0
                                for (let j = 0; j < dim; j++) s += A[i][j] * v[j]
                                Av[i] = s
                              }
                              v = Av
                              normv()
                            }
                            return v
                          }

                          const dotv = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
                          const v1 = powerIter(C)
                          const C2 = Array.from({ length: dim }, (_, i) => C[i].slice())
                          for (let i = 0; i < dim; i++) {
                            for (let j = 0; j < dim; j++) {
                              C2[i][j] -= v1[i] * v1[j] * dotv(v1, C.map(row => row[j]))
                            }
                          }
                          const v2 = powerIter(C2)
                          const C3 = Array.from({ length: dim }, (_, i) => C2[i].slice())
                          for (let i = 0; i < dim; i++) {
                            for (let j = 0; j < dim; j++) {
                              C3[i][j] -= v2[i] * v2[j] * dotv(v2, C2.map(row => row[j]))
                            }
                          }
                          const v3 = powerIter(C3)

                          // スコア = X * [v1,v2,v3]
                          const embed3 = wordsWithVec.map(({ n: node }, r) => {
                            const x = X[r]
                            const s1 = dotv(x, v1)
                            const s2 = dotv(x, v2)
                            const s3 = dotv(x, v3)
                            return { node, vec: [s1, s2, s3] as [number, number, number] }
                          })

                          // スケール調整と正規化
                          const scale = shellRadius * 0.4
                          return embed3.map(({ node, vec }) => {
                            const norm = Math.hypot(vec[0], vec[1], vec[2])
                            if (norm > 0) node.initial = [vec[0] / norm * scale, vec[1] / norm * scale, vec[2] / norm * scale]
                            return { node, vec }
                          })
                        }

                        // 感情の色に基づく配置（感情空間の中心に配置）
                        const emotionAnchors = emotionPCA()
                        const anchorNodes: WordNode[] = emotionAnchors.map(({ node }, idx) => ({
                          ...node,
                          scale: 6,
                          fixed: true,
                          nodeType: 'anchor',
                          color: emotionColors[EMOTION_KEYS[idx]] || '#999999',
                        }))

                        // アンカー追加と接続
                        const baseOffset = nodes.length
                        const allNodes = [...anchorNodes, ...nodes]

                        // 感情結合に基づくリンク生成（感情アンカー → 単語ノード）
                        const emotionLinks: WordLink[] = []
                        for (let ai = 0; ai < anchorNodes.length; ai++) {
                          const anchor = anchorNodes[ai]
                          const anchorIndex = ai
                          const key = EMOTION_KEYS[ai] // インデックスから感情キーを取得
                          const kIdx = emotionIndex[key]

                          for (let wi = 0; wi < nodes.length; wi++) {
                            const wordIndex = baseOffset + wi
                            const ei = normalizedEmotionVec[nodes[wi].label] || new Array(10).fill(0)
                            const sim = kIdx >= 0 ? ei[kIdx] || 0 : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                            const w = Math.max(0, Math.min(1, sim))
                            if (w < 0.15) continue // 極弱リンクをスキップ
                            const L0 = Math.max(10, restLength * (1 - 0.6 * w))
                            const k = springK * (0.3 + 0.7 * w)
                            emotionLinks.push({ source: anchorIndex, target: wordIndex, weight: w, mode: 'tension', L0, k })
                          }
                        }

                        // 単語間の関係性に基づくリンク生成（単語ノード → 単語ノード）
                        const wordLinks: WordLink[] = []
                        const wordNodes = nodes
                        const wordToIndex = Object.fromEntries(wordNodes.map((n, i) => [n.label, baseOffset + i]))

                        // 単語間の感情ベクトル類似度を計算
                        for (let i = 0; i < wordNodes.length; i++) {
                          for (let j = i + 1; j < wordNodes.length; j++) {
                            const wordI = wordNodes[i].label
                            const wordJ = wordNodes[j].label

                            const vecI = normalizedEmotionVec[wordI] || new Array(10).fill(0)
                            const vecJ = normalizedEmotionVec[wordJ] || new Array(10).fill(0)

                            // コサイン類似度を計算
                            const dot = vecI.reduce((sum, v, idx) => sum + v * (vecJ[idx] || 0), 0)
                            const normI = Math.hypot(...vecI)
                            const normJ = Math.hypot(...vecJ)
                            const sim = (normI * normJ > 0) ? dot / (normI * normJ) : 0

                            const w = Math.max(0, Math.min(1, (sim + 1) / 2)) // -1〜1を0〜1に正規化
                            if (w < 0.1) continue // 弱い関連性はスキップ

                            const L0 = Math.max(10, restLength * (1 + 0.8 * (1 - w))) // 類似度が高いほど近い距離
                            const k = springK * (0.2 + 0.6 * w)
                            wordLinks.push({
                              source: wordToIndex[wordI],
                              target: wordToIndex[wordJ],
                              weight: w,
                              mode: 'tension',
                              L0,
                              k
                            })
                          }
                        }

                        const links = [...emotionLinks, ...wordLinks]
                        return { nodes: allNodes, links }
                      }

                      const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                      const { nodes, links } = generateForce3DGraph()

                      // 感情空間に基づく背景色の計算（分割表示用）
                      const calculateBackgroundColorSplit = () => {
                        const avgEmotionVec = new Array(10).fill(0)

                        // 全単語の感情ベクトルの平均を計算
                        const wordNodes = nodes.filter(n => n.nodeType === 'word')
                        for (const node of wordNodes) {
                          const vec = normalizedEmotionVec[node.label]
                          if (vec) {
                            for (let i = 0; i < 10; i++) {
                              avgEmotionVec[i] += vec[i] || 0
                            }
                          }
                        }

                        // 平均を計算
                        for (let i = 0; i < 10; i++) {
                          avgEmotionVec[i] /= Math.max(1, wordNodes.length)
                        }

                        // 感情の色を混合して背景色を決定
                        const emotionColors: Record<string, [number, number, number]> = {
                          joy: [245, 158, 11],      // #f59e0b
                          sadness: [31, 41, 55],    // #1f2937
                          anger: [239, 68, 68],     // #ef4444
                          fear: [167, 139, 250],    // #a78bfa
                          surprise: [16, 163, 74],  // #10b981
                          disgust: [107, 114, 128], // #6b7280
                          calm: [132, 204, 22],     // #84cc16
                          focus: [245, 158, 11],    // #f59e0b
                          excitement: [236, 72, 153], // #ec4899
                          confusion: [99, 102, 241] // #6366f1
                        }

                        // 感情ベクトルに基づいて色を混合
                        let r = 0, g = 0, b = 0
                        let totalWeight = 0

                        for (let i = 0; i < EMOTION_KEYS.length; i++) {
                          const emotion = EMOTION_KEYS[i]
                          const weight = Math.max(0, avgEmotionVec[i] || 0)
                          const [cr, cg, cb] = emotionColors[emotion]

                          r += cr * weight
                          g += cg * weight
                          b += cb * weight
                          totalWeight += weight
                        }

                        if (totalWeight > 0) {
                          r = Math.round(r / totalWeight)
                          g = Math.round(g / totalWeight)
                          b = Math.round(b / totalWeight)
                        } else {
                          // デフォルトの背景色（中間色）
                          r = 240, g = 240, b = 240
                        }

                        return `rgb(${r}, ${g}, ${b})`
                      }

                      const backgroundColor = calculateBackgroundColorSplit()

                      return (
                        <div className="border rounded overflow-hidden">
                          <Force3D
                            nodes={nodes}
                            links={links}
                            width={Math.min(width / 2 - 40, 600)}
                            height={Math.max(300, height - 200)}
                            background={backgroundColor}
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

          {activeTab === 'compare' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">前半（最初の100語）</h3>
                {mounted && (() => {
                  try {
                    const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                    const half = Math.floor(data.length / 2)
                    const firstData = data.slice(0, Math.max(1, Math.min(100, half)))
                    // 部分データからグラフを構築（dataを書き換えない）
                    const buildFrom = (input: typeof data): { nodes: WordNode[]; links: WordLink[] } => {
                      const jungWords = JUNG_STIMULUS_WORDS
                      const accum: Record<string, { count: number; sumReactionValue: number; sumReactionTime: number }> = {}
                      jungWords.forEach(({ japanese }) => { accum[japanese] = { count: 0, sumReactionValue: 0, sumReactionTime: 0 } })
                      for (const d of input) {
                        if (!accum[d.word]) continue
                        accum[d.word].count += 1
                        accum[d.word].sumReactionValue += d.reactionValue
                        accum[d.word].sumReactionTime += d.reactionTime
                      }
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
                        scale: Math.max(0.5, 0.5 + 5.5 * ((n.raw - rawMin) / denom)),
                        nodeType: 'word'
                      }))
                      const EMOTION_KEYS = ['joy','sadness','anger','fear','surprise','disgust','calm','focus','excitement','confusion'] as const
                      const emotionIndex: Record<string, number> = Object.fromEntries(EMOTION_KEYS.map((k, i) => [k, i]))
                      const wordEmotionSum: Record<string, number[]> = {}
                      for (const dpt of input) {
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
                      Object.keys(wordEmotionSum).forEach((w) => { normalizedEmotionVec[w] = normalize(wordEmotionSum[w]) })
                      const anchorNames = ['Joy','Sadness','Anger','Fear','Disgust','Calmness','Interest','Surprise','Confusion','Determination']
                      const anchorColors = ['#f59e0b','#1f2937','#ef4444','#a78bfa','#10b981','#93c5fd','#60a5fa','#22c55e','#64748b','#f97316']
                      const toSphere = (x01: number, y01: number): [number, number, number] => {
                        const u = (x01 - 0.5) * Math.PI * 1.6
                        const v = (y01 - 0.5) * Math.PI
                        const cx = Math.cos(v) * Math.cos(u)
                        const cy = Math.cos(v) * Math.sin(u)
                        const cz = Math.sin(v)
                        return [shellRadius * cx, shellRadius * cy, shellRadius * cz]
                      }
                      const anchorNodes: WordNode[] = anchorNames.map((name, idx) => {
                        const [x, y, z] = toSphere(0.1 + 0.8 * (idx / anchorNames.length), 0.2 + 0.6 * (idx / anchorNames.length))
                        return { id: `A${idx}`, label: name, scale: 6, fixed: true, nodeType: 'anchor', initial: [x, y, z], color: anchorColors[idx] }
                      })
                      const baseOffset = nodes.length
                      const allNodes = [...anchorNodes, ...nodes]
                      const links: WordLink[] = []
                      for (let ai = 0; ai < anchorNodes.length; ai++) {
                        const key = (['joy','sadness','anger','fear','disgust','calm','focus','surprise','confusion','focus'] as const)[ai]
                        const kIdx = emotionIndex[key]
                        for (let wi = 0; wi < nodes.length; wi++) {
                          const wordIndex = baseOffset + wi
                          const ei = normalizedEmotionVec[nodes[wi].label] || new Array(10).fill(0)
                          const sim = kIdx >= 0 ? ei[kIdx] || 0 : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                          const w = Math.max(0, Math.min(1, sim))
                          if (w < 0.15) continue
                          const L0 = Math.max(10, restLength * (1 - 0.6 * w))
                          const k = springK * (0.3 + 0.7 * w)
                          links.push({ source: ai, target: wordIndex, weight: w, mode: 'tension', L0, k })
                        }
                      }
                      return { nodes: allNodes, links }
                    }
                    const { nodes, links } = buildFrom(firstData)
                    return (
                      <div className="border rounded overflow-hidden">
                        <Force3D nodes={nodes} links={links} width={width} height={Math.max(420, height - 80)} physics={{
                          springK, repulsionK, damping, restLength, maxSpeed: 200, shellRadius, shellK, radialOutK: radialOutK, constraintIters, constraintStiffness, minSep, sepK
                        }} />
                      </div>
                    )
                  } catch {
                    return <div className="text-red-600">前半モデル生成エラー</div>
                  }
                })()}
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">後半（最後の100語）</h3>
                {mounted && (() => {
                  try {
                    const Force3D = dynamic(() => import('./Force3DWordGraphTypeGPU'), { ssr: false })
                    const half = Math.floor(data.length / 2)
                    const secondData = data.slice(Math.max(0, data.length - Math.max(1, Math.min(100, half))))
                    const buildFrom = (input: typeof data): { nodes: WordNode[]; links: WordLink[] } => {
                      const jungWords = JUNG_STIMULUS_WORDS
                      const accum: Record<string, { count: number; sumReactionValue: number; sumReactionTime: number }> = {}
                      jungWords.forEach(({ japanese }) => { accum[japanese] = { count: 0, sumReactionValue: 0, sumReactionTime: 0 } })
                      for (const d of input) {
                        if (!accum[d.word]) continue
                        accum[d.word].count += 1
                        accum[d.word].sumReactionValue += d.reactionValue
                        accum[d.word].sumReactionTime += d.reactionTime
                      }
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
                        scale: Math.max(0.5, 0.5 + 5.5 * ((n.raw - rawMin) / denom)),
                        nodeType: 'word'
                      }))
                      const EMOTION_KEYS = ['joy','sadness','anger','fear','surprise','disgust','calm','focus','excitement','confusion'] as const
                      const emotionIndex: Record<string, number> = Object.fromEntries(EMOTION_KEYS.map((k, i) => [k, i]))
                      const wordEmotionSum: Record<string, number[]> = {}
                      for (const dpt of input) {
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
                      Object.keys(wordEmotionSum).forEach((w) => { normalizedEmotionVec[w] = normalize(wordEmotionSum[w]) })
                      const anchorNames = ['Joy','Sadness','Anger','Fear','Disgust','Calmness','Interest','Surprise','Confusion','Determination']
                      const anchorColors = ['#f59e0b','#1f2937','#ef4444','#a78bfa','#10b981','#93c5fd','#60a5fa','#22c55e','#64748b','#f97316']
                      const toSphere = (x01: number, y01: number): [number, number, number] => {
                        const u = (x01 - 0.5) * Math.PI * 1.6
                        const v = (y01 - 0.5) * Math.PI
                        const cx = Math.cos(v) * Math.cos(u)
                        const cy = Math.cos(v) * Math.sin(u)
                        const cz = Math.sin(v)
                        return [shellRadius * cx, shellRadius * cy, shellRadius * cz]
                      }
                      const anchorNodes: WordNode[] = anchorNames.map((name, idx) => {
                        const [x, y, z] = toSphere(0.1 + 0.8 * (idx / anchorNames.length), 0.2 + 0.6 * (idx / anchorNames.length))
                        return { id: `A${idx}`, label: name, scale: 6, fixed: true, nodeType: 'anchor', initial: [x, y, z], color: anchorColors[idx] }
                      })
                      const baseOffset = nodes.length
                      const allNodes = [...anchorNodes, ...nodes]
                      const links: WordLink[] = []
                      for (let ai = 0; ai < anchorNodes.length; ai++) {
                        const key = (['joy','sadness','anger','fear','disgust','calm','focus','surprise','confusion','focus'] as const)[ai]
                        const kIdx = emotionIndex[key]
                        for (let wi = 0; wi < nodes.length; wi++) {
                          const wordIndex = baseOffset + wi
                          const ei = normalizedEmotionVec[nodes[wi].label] || new Array(10).fill(0)
                          const sim = kIdx >= 0 ? ei[kIdx] || 0 : (ei.reduce((s, x) => s + (x || 0), 0) / Math.max(1, ei.length))
                          const w = Math.max(0, Math.min(1, sim))
                          if (w < 0.15) continue
                          const L0 = Math.max(10, restLength * (1 - 0.6 * w))
                          const k = springK * (0.3 + 0.7 * w)
                          links.push({ source: ai, target: wordIndex, weight: w, mode: 'tension', L0, k })
                        }
                      }
                      return { nodes: allNodes, links }
                    }
                    const { nodes, links } = buildFrom(secondData)
                    return (
                      <div className="border rounded overflow-hidden">
                        <Force3D nodes={nodes} links={links} width={width} height={Math.max(420, height - 80)} physics={{
                          springK, repulsionK, damping, restLength, maxSpeed: 200, shellRadius, shellK, radialOutK: radialOutK, constraintIters, constraintStiffness, minSep, sepK
                        }} />
                      </div>
                    )
                  } catch {
                    return <div className="text-red-600">後半モデル生成エラー</div>
                  }
                })()}
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

// 追加: 前後比較レンダリング（下部タブとして実装）

// Merkle DAG: components.timeline_visualization -> refactored_complete
// 時系列統合可視化コンポーネントのモジュール化完了
