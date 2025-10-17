'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import dynamic from 'next/dynamic'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'

// Force3D 用型（型のみローカル定義して実行時依存を最小化）
interface WordNode { id: string; label: string; scale: number; axis?: [number, number, number]; fixed?: boolean; nodeType?: 'word' | 'anchor'; initial?: [number, number, number] }
interface WordLink { source: number; target: number; weight: number; mode?: 'tension' | 'compression'; L0?: number; k?: number }

// Force3D コンポーネントは選択時にのみ遅延読み込み

// Merkle DAG: components.timeline_visualization
// 時系列統合可視化コンポーネント
// 依存関係: React, D3.js, timeline API
// BPMN: TimelineVisualizationComponent

// Force3DWordGraph は dynamic import で any として扱う（型はローカルで定義しない）

interface EmotionData {
  name: string
  score: number
  fileType: string
}

interface TimelineDataPoint {
  timestamp: number
  word: string
  reactionTime: number
  hasResponse: boolean
  emotions: EmotionData[]
  physiological: { average?: number; max?: number; min?: number } | unknown[]
  reactionValue: number
  eventType?: string
  metadata?: { emotionCount?: number; physiologicalCount?: number }
}

interface FilterSettings {
  emotions: boolean
  physiological: boolean
  reactionValues: boolean
  wordDisplay: boolean
  reactionTime: boolean
  physiologicalThreshold: boolean
  emotionChange: boolean
  range: number
  timeScale: number
  verticalScale: number
  showEmotionDetails: boolean
  showWordLabels: boolean
}

interface TimeRange {
  start: number
  end: number
}

type VisualizationMode = 'timeline' | 'kpi' | 'dumbbell' | 'small-multiples' | 'force-3d'

interface TimelineVisualizationProps {
  participantId: string
  width?: number
  height?: number
  // このページでモードを固定したい場合に指定（例: 'force-3d'）
  forceMode?: VisualizationMode
  // フィルターUIを非表示にする
  hideFilters?: boolean
  // デモ用可視化データセットをAPIから取得
  useDemo?: boolean
}

export default function TimelineVisualization({ 
  participantId, 
  width = 800, 
  height = 400,
  forceMode,
  hideFilters = false,
  useDemo = false,
}: TimelineVisualizationProps) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDataPoint, setSelectedDataPoint] = useState<TimelineDataPoint | null>(null)
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>(forceMode ?? 'timeline')
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [embeddingsByWord, setEmbeddingsByWord] = useState<Record<string, number[]>>({})
  const [filters, setFilters] = useState<FilterSettings>({
    emotions: true,
    physiological: true,
    reactionValues: true,
    wordDisplay: true,
    reactionTime: true,
    physiologicalThreshold: true,
    emotionChange: true,
    range: 100,
    timeScale: 1.0,
    verticalScale: 1.0,
    showEmotionDetails: true,
    showWordLabels: true
  })
  // Kawasaki model hyperparameters
  const [alpha, setAlpha] = useState(1.0)  // 反応時間の指数 α
  const [gamma, setGamma] = useState(1.0)  // ΔSP の係数 γ
  const [lambda, setLambda] = useState(1.0) // ΔSP のスケール λ
  const [eta, setEta] = useState(1.0)    // 感情スコア係数 η
  const [beta, setBeta] = useState(1.0)  // ベクトル項の温度 β
  const [springK, setSpringK] = useState(3.0)
  const [repulsionK, setRepulsionK] = useState(800.0)
  const [restLength, setRestLength] = useState(60)
  const [damping, setDamping] = useState(0.95)
  // 感情類似フォース係数（弱・強）
  const [emotionWeak, setEmotionWeak] = useState(0.6)
  const [emotionStrong, setEmotionStrong] = useState(1.6)
  const [emotionGain, setEmotionGain] = useState(1.5)
  const [emotionMix, setEmotionMix] = useState(0.7) // 0..1 感情寄与の重み
  const [neighborsK, setNeighborsK] = useState(6) // k-NN エッジ数
  const [weightGamma, setWeightGamma] = useState(1.5) // 重みのダイナミックレンジ拡張
  const [shellRadius, setShellRadius] = useState(220)
  const [shellK, setShellK] = useState(4.0)
  const [radialOutK, setRadialOutK] = useState(60)
  const [constraintIters, setConstraintIters] = useState(2)
  const [constraintStiffness, setConstraintStiffness] = useState(0.5)
  const [kernelSigma, setKernelSigma] = useState(0.8)
  const [useSpectralInit, setUseSpectralInit] = useState(true)
  // reserved (future): verlet constraints tuning
  const [emotionGainMin, setEmotionGainMin] = useState(0.5)
  const [emotionGainMax, setEmotionGainMax] = useState(4.0)
  // 3D Force プリセット
  const forcePresets = [
    { id: 'balanced', label: 'Balanced', springK: 3.0, repulsionK: 800, restLength: 60, damping: 0.95, emoWeak: 0.6, emoStrong: 1.6, emoGain: 1.5 },
    { id: 'tight', label: 'Tight clusters', springK: 4.0, repulsionK: 1200, restLength: 45, damping: 0.92, emoWeak: 0.6, emoStrong: 1.8, emoGain: 2.5 },
    { id: 'loose', label: 'Loose clusters', springK: 2.0, repulsionK: 600, restLength: 75, damping: 0.97, emoWeak: 0.7, emoStrong: 1.4, emoGain: 1.0 },
    { id: 'slow', label: 'Slow precise', springK: 3.0, repulsionK: 900, restLength: 60, damping: 0.98, emoWeak: 0.6, emoStrong: 1.6, emoGain: 2.0 },
  ] as const
  const [forcePresetId, setForcePresetId] = useState<typeof forcePresets[number]['id']>('balanced')
  const applyForcePreset = (id: typeof forcePresets[number]['id']) => {
    const p = forcePresets.find(x => x.id === id)
    if (!p) return
    setForcePresetId(id)
    setSpringK(p.springK)
    setRepulsionK(p.repulsionK)
    setRestLength(p.restLength)
    setDamping(p.damping)
    setEmotionWeak(p.emoWeak)
    setEmotionStrong(p.emoStrong)
    setEmotionGain(p.emoGain)
  }
  
  const svgRef = useRef<SVGSVGElement>(null)
  const overviewSvgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // --- Demo timeline generator -------------------------------------------------
  const generateDemoTimeline = React.useCallback((): TimelineDataPoint[] => {
    // 100語のサンプルを時系列化
    const words = JUNG_STIMULUS_WORDS.slice(0, 100)
    const EMOTIONS = ['joy','sadness','anger','fear','surprise','disgust','calm','focus','excitement','confusion'] as const
    const start = Date.now() - 1000 * 60 // 少し過去から開始

    const rand = (min: number, max: number) => Math.random() * (max - min) + min
    const pick = <T,>(arr: readonly T[], k: number) => Array.from({ length: k }, () => arr[Math.floor(Math.random() * arr.length)])

    const points: TimelineDataPoint[] = words.map((w, idx) => {
      const timestamp = start + idx * Math.round(rand(700, 1600))
      const reactionTime = Math.round(rand(350, 2400))
      const hasResponse = Math.random() < 0.9
      const emoCount = Math.max(1, Math.floor(rand(1, 4)))
      const emos = pick(EMOTIONS, emoCount).map((name) => ({ name, score: Math.round(rand(0.15, 0.9) * 100) / 100, fileType: 'demo' }))
      const physAvg = Math.round(rand(-0.12, 0.18) * 1000) / 1000
      const physMax = physAvg + Math.abs(Math.round(rand(0.0, 0.08) * 1000) / 1000)
      const physMin = physAvg - Math.abs(Math.round(rand(0.0, 0.08) * 1000) / 1000)
      // 反応値: 感情平均と生理の正規化、反応時間のペナルティを合成
      const emoMean = emos.length ? emos.reduce((s, e) => s + e.score, 0) / emos.length : 0
      const rtNorm = (reactionTime - 350) / (2400 - 350)
      const physNorm = (Math.abs(physAvg) / 0.2)
      const reactionValue = Math.max(0, Math.min(1, 0.55 * emoMean + 0.35 * Math.min(1, physNorm) + 0.25 * (1 - rtNorm)))

      return {
        timestamp,
        word: w.japanese,
        reactionTime,
        hasResponse,
        emotions: emos as unknown as EmotionData[],
        physiological: { average: physAvg, max: physMax, min: physMin },
        reactionValue,
        eventType: 'word_displayed',
        metadata: { emotionCount: emos.length, physiologicalCount: 1 }
      }
    })
    return points
  }, [])

  const getPhysStat = (p: TimelineDataPoint['physiological'], key: 'average' | 'max' | 'min'): number => {
    if (Array.isArray(p)) return 0
    if (p && typeof p === 'object') {
      const v = (p as Record<string, unknown>)[key]
      return typeof v === 'number' && Number.isFinite(v) ? v : 0
    }
    return 0
  }

  useEffect(() => { setMounted(true) }, [])

  const fetchTimelineData = React.useCallback(async () => {
    try {
      setLoading(true)
      // API優先、失敗時・useDemo時はローカル生成でフォールバック
      const apiUrl = useDemo
        ? `/api/participants/${participantId}/timeline?demo=1`
        : `/api/participants/${participantId}/timeline`
      let ok = false
      try {
        const response = await fetch(apiUrl)
        const result = await response.json()
        if (result?.success && Array.isArray(result.data?.timelineData)) {
          setData(result.data.timelineData)
          ok = true
          if (Array.isArray(result.data.metadata?.errors) && result.data.metadata.errors.length > 0) {
            setError(`警告: 一部データ取得に失敗しました: ${result.data.metadata.errors.join('; ')}`)
          } else {
            setError(null)
          }
        }
      } catch {
        // noop -> フォールバックへ
      }

      if (!ok) {
        const demo = generateDemoTimeline()
        setData(demo)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [participantId, useDemo, generateDemoTimeline])

  // Word2Vec 埋め込み（平均）を単語ごとに取得
  const fetchWordEmbeddings = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/participants/${participantId}/word2vec`)
      const json = await res.json()
      if (!json?.success) return
      const byWord: Record<string, { sum: number[]; count: number }> = {}
      ;(json.wordData as Array<{ word: string; embedding: number[] }>).forEach((item) => {
        if (!byWord[item.word]) byWord[item.word] = { sum: new Array(item.embedding.length).fill(0), count: 0 }
        const acc = byWord[item.word]
        for (let i = 0; i < item.embedding.length; i++) acc.sum[i] += item.embedding[i]
        acc.count += 1
      })
      const averaged: Record<string, number[]> = {}
      Object.entries(byWord).forEach(([w, { sum, count }]) => {
        averaged[w] = sum.map((v) => v / Math.max(1, count))
      })
      setEmbeddingsByWord(averaged)
    } catch {
      // 失敗時は無視（ベクトル項なしでも描画可能）
    }
  }, [participantId])

  const showTooltip = React.useCallback((event: MouseEvent, d: TimelineDataPoint) => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    tooltip.style.display = 'block'
    tooltip.style.left = `${event.pageX + 10}px`
    tooltip.style.top = `${event.pageY - 10}px`
    
    // 感情データの詳細表示
    const emotionDetails = d.emotions.length > 0 
      ? d.emotions.map(emotion => 
          `<div class="text-xs">
            <span class="font-medium">${emotion.name || 'unknown'}</span>: 
            <span class="text-blue-600">${(emotion.score || 0).toFixed(2)}</span>
            <span class="text-gray-500">(${emotion.fileType || 'unknown'})</span>
          </div>`
        ).join('')
      : '<div class="text-xs text-gray-500">感情データなし</div>'
    
    tooltip.innerHTML = `
      <div class="bg-white border border-gray-300 rounded-lg p-3 shadow-lg text-sm">
        <div class="font-semibold text-gray-900 mb-2">${d.word}</div>
        <div class="text-gray-600 mb-2">時間: ${new Date(d.timestamp).toLocaleTimeString()}</div>
        <div class="grid grid-cols-2 gap-2 text-xs mb-2">
          <div>反応値: <span class="font-medium">${d.reactionValue.toFixed(2)}</span></div>
          <div>反応時間: <span class="font-medium">${d.reactionTime}ms</span></div>
        </div>
        <div class="border-t pt-2">
          <div class="text-xs font-medium text-gray-700 mb-1">感情データ:</div>
          ${emotionDetails}
        </div>
      </div>
    `
  }, [])

  const hideTooltip = React.useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none'
    }
  }, [])

  // KPIカード計算
  const calculateKPIs = React.useCallback(() => {
    if (data.length === 0) return null

    const currentValues = {
      avgReactionTime: data.reduce((sum, d) => sum + d.reactionTime, 0) / data.length,
      avgReactionValue: data.reduce((sum, d) => sum + d.reactionValue, 0) / data.length,
      responseRate: (data.filter(d => d.hasResponse).length / data.length) * 100,
      totalResponses: data.filter(d => d.hasResponse).length
    }

    // 過去の値（デモ用：現在値の90-110%の範囲でランダム）
    const previousValues = {
      avgReactionTime: currentValues.avgReactionTime * (0.9 + Math.random() * 0.2),
      avgReactionValue: currentValues.avgReactionValue * (0.9 + Math.random() * 0.2),
      responseRate: currentValues.responseRate * (0.9 + Math.random() * 0.2),
      totalResponses: Math.floor(currentValues.totalResponses * (0.9 + Math.random() * 0.2))
    }

    // 変化率計算
    const changes = {
      avgReactionTime: ((currentValues.avgReactionTime - previousValues.avgReactionTime) / previousValues.avgReactionTime) * 100,
      avgReactionValue: ((currentValues.avgReactionValue - previousValues.avgReactionValue) / previousValues.avgReactionValue) * 100,
      responseRate: ((currentValues.responseRate - previousValues.responseRate) / previousValues.responseRate) * 100,
      totalResponses: ((currentValues.totalResponses - previousValues.totalResponses) / previousValues.totalResponses) * 100
    }

    return { current: currentValues, previous: previousValues, changes }
  }, [data])

  // ダンベルチャート用データ準備
  const prepareDumbbellData = React.useCallback(() => {
    if (data.length === 0) return []

    // 単語ごとにグループ化
    const wordGroups = data.reduce((acc, d) => {
      if (!acc[d.word]) acc[d.word] = []
      acc[d.word].push(d)
      return acc
    }, {} as Record<string, TimelineDataPoint[]>)

    // 各単語の前半・後半の平均値を計算
    return Object.entries(wordGroups).map(([word, points]) => {
      const sorted = points.sort((a, b) => a.timestamp - b.timestamp)
      const mid = Math.floor(sorted.length / 2)
      const firstHalf = sorted.slice(0, mid)
      const secondHalf = sorted.slice(mid)

      return {
        word,
        firstHalf: {
          avgReactionTime: firstHalf.reduce((sum, d) => sum + d.reactionTime, 0) / firstHalf.length,
          avgReactionValue: firstHalf.reduce((sum, d) => sum + d.reactionValue, 0) / firstHalf.length,
          count: firstHalf.length
        },
        secondHalf: {
          avgReactionTime: secondHalf.reduce((sum, d) => sum + d.reactionTime, 0) / secondHalf.length,
          avgReactionValue: secondHalf.reduce((sum, d) => sum + d.reactionValue, 0) / secondHalf.length,
          count: secondHalf.length
        }
      }
    }).filter(d => d.firstHalf.count > 0 && d.secondHalf.count > 0)
  }, [data])

  // スモールマルチプル用データ準備
  const prepareSmallMultiplesData = React.useCallback(() => {
    if (data.length === 0) return []

    // 単語ごとにグループ化して時系列データを作成
    const wordGroups = data.reduce((acc, d) => {
      if (!acc[d.word]) acc[d.word] = []
      acc[d.word].push(d)
      return acc
    }, {} as Record<string, TimelineDataPoint[]>)

    return Object.entries(wordGroups)
      .map(([word, points]) => ({
        word,
        data: points.sort((a, b) => a.timestamp - b.timestamp),
        stats: {
          avgReactionTime: points.reduce((sum, d) => sum + d.reactionTime, 0) / points.length,
          avgReactionValue: points.reduce((sum, d) => sum + d.reactionValue, 0) / points.length,
          maxReactionValue: Math.max(...points.map(d => d.reactionValue)),
          responseRate: (points.filter(d => d.hasResponse).length / points.length) * 100
        }
      }))
      .sort((a, b) => b.stats.avgReactionValue - a.stats.avgReactionValue)
      .slice(0, 12) // 上位12単語のみ表示
  }, [data])

  // 3Dフォース用 完全グラフデータ生成（語ごとスケール、辺スケール）
  const prepareForce3DGraph = React.useCallback((): { nodes: WordNode[]; links: WordLink[] } => {
    if (data.length === 0) return { nodes: [], links: [] }

    // ユング100語（日本語）を固定ノード集合として使用
    const jungWords = JUNG_STIMULUS_WORDS.map(w => ({ word: w.japanese, key: w.id }))

    // 集約（ノード指標）。全語を初期化し、セッション実データで加算
    const accum: Record<string, { count: number; sumReactionValue: number; sumReactionTime: number }> = {}
    jungWords.forEach(({ word }) => { accum[word] = { count: 0, sumReactionValue: 0, sumReactionTime: 0 } })
    for (const d of data) {
      if (!accum[d.word]) continue // セッション語がユング語に無い場合は無視
      accum[d.word].count += 1
      accum[d.word].sumReactionValue += d.reactionValue
      accum[d.word].sumReactionTime += d.reactionTime
    }

    // 生スケール: 平均反応値 × log(1+回数)
    const nodeEntries = jungWords.map(({ word }) => {
      const g = accum[word]
      const avgRV = g.count > 0 ? g.sumReactionValue / g.count : 0
      const raw = avgRV * Math.log1p(g.count)
      return { word, count: g.count, avgReactionValue: avgRV, raw }
    })

    const rawMin = Math.min(...nodeEntries.map(n => n.raw))
    const rawMax = Math.max(...nodeEntries.map(n => n.raw))
    const denom = rawMax - rawMin || 1

    const nodes: WordNode[] = nodeEntries.map((n, idx) => ({
      id: String(idx),
      label: n.word,
      // 0.5〜6.0程度に正規化（視認性のため）
      scale: 0.5 + 5.5 * ((n.raw - rawMin) / denom),
      axis: undefined,
      fixed: false,
      nodeType: 'word',
      initial: undefined,
    }))

    // 連続イベントから w_I -> w_O を抽出し、エッジ重みを川崎モデルで加算
    const wordToIndex: Record<string, number> = Object.fromEntries(nodes.map((n, i) => [n.label, i]))
    const pairWeight = new Map<string, number>()

    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)
    const eps = 1e-3
    for (let k = 0; k < sorted.length - 1; k++) {
      const wi = sorted[k]
      const wo = sorted[k + 1]
      const i = wordToIndex[wi.word]
      const j = wordToIndex[wo.word]
      if (i === undefined || j === undefined || i === j) continue

      // r(w_I, w_O) = 1/(T(w_I, w_O)+eps) → ここでは後続イベントの反応時間を採用
      const r = 1 / (Math.max(0, wo.reactionTime) + eps)
      // ΔSP: 生理データ平均の差（存在しない場合0）
      const spI = (wi.physiological as unknown as { average?: number } | undefined)?.average ?? 0
      const spO = (wo.physiological as unknown as { average?: number } | undefined)?.average ?? 0
      const deltaSP = spO - spI
      // F: 感情スコア（後続イベントの平均スコア）
      const f = wo.emotions && wo.emotions.length > 0
        ? wo.emotions.reduce((s, e) => s + (e.score || 0), 0) / wo.emotions.length
        : 0

      // 川崎モデルに基づく重み（Word2Vec項は未提供のため1とする）
      const w = Math.pow(r, alpha) * Math.exp(gamma * (deltaSP / (lambda || 1))) * Math.exp(eta * f)
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      pairWeight.set(key, (pairWeight.get(key) || 0) + w)
    }

    // 観測重み正規化の準備
    let obsMin = Infinity; let obsMax = -Infinity
    for (const v of pairWeight.values()) { if (v < obsMin) obsMin = v; if (v > obsMax) obsMax = v }
    const obsDen = (Number.isFinite(obsMax) && Number.isFinite(obsMin) && obsMax - obsMin !== 0) ? (obsMax - obsMin) : 1

    // ベクトル正規化・内積
    const normalize = (vec: number[]): number[] => {
      const norm = Math.hypot(...vec)
      if (!Number.isFinite(norm) || norm === 0) return vec.map(() => 0)
      return vec.map((x) => x / norm)
    }
    const dot = (a: number[], b: number[]) => {
      const n = Math.min(a.length, b.length)
      let s = 0
      for (let i = 0; i < n; i++) s += a[i] * b[i]
      return s
    }

    const normalizedEmb: Record<string, number[]> = {}
    nodes.forEach((n) => {
      const emb = embeddingsByWord[n.label]
      normalizedEmb[n.label] = emb ? normalize(emb) : []
    })

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
    const normalizedEmotionVec: Record<string, number[]> = {}
    Object.keys(wordEmotionSum).forEach((w) => {
      normalizedEmotionVec[w] = normalize(wordEmotionSum[w])
    })

    // --- PCA: 全語の感情行列 -> 上位3主成分スコアを方向ベクトルに ---
    const wordsWithVec = nodes.map(n => ({ n, v: normalizedEmotionVec[n.label] || new Array(10).fill(0) }))
    const dim = 10
    if (wordsWithVec.length > 0) {
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
        // 正規化
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
      // 逐次直交化（一次・二次・三次）
      const dotv = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
      // 補助関数（未使用）を削除
      const v1 = powerIter(C)
      // C を v1 に沿ってデフレート
      const C2 = Array.from({ length: dim }, (_, i) => C[i].slice())
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          C2[i][j] -= v1[i] * v1[j] * dotv(v1, C.map(row => row[j])) // 近似的デフレ
        }
      }
      const v2 = powerIter(C2)
      // 二回目のデフレ
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
      for (const { node, vec } of embed3) {
        const norm = Math.hypot(vec[0], vec[1], vec[2])
        if (norm > 0) node.axis = [vec[0] / norm, vec[1] / norm, vec[2] / norm]
      }
    }

    // --- Spectral Embedding（ラプラシアンの固有ベクトル）で初期3D座標を与える ---
    if (useSpectralInit) {
      const words = nodes.map(n => n.label)
      const V = words.map(w => normalizedEmotionVec[w] || new Array(10).fill(0))
      const n = words.length
      // RBFカーネル重み行列 W
      const W: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
      const sig2 = Math.max(1e-6, kernelSigma * kernelSigma)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let d2 = 0
          for (let k = 0; k < 10; k++) {
            const diff = (V[i][k] || 0) - (V[j][k] || 0)
            d2 += diff * diff
          }
          const w = Math.exp(-d2 / sig2)
          W[i][j] = w; W[j][i] = w
        }
      }
      const D = new Array(n).fill(0)
      for (let i = 0; i < n; i++) {
        let s = 0; for (let j = 0; j < n; j++) s += W[i][j]
        D[i] = s
      }
      // 反復法で2〜4番目の固有ベクトル（ゼロ和を満たす次元）を近似
      const lapMul = (x: number[]): number[] => {
        const y = new Array(n).fill(0)
        for (let i = 0; i < n; i++) {
          let s = D[i] * x[i]
          for (let j = 0; j < n; j++) s -= W[i][j] * x[j]
          y[i] = s
        }
        return y
      }
      const power = (orth: number[][]): number[] => {
        let v = Array.from({ length: n }, () => Math.random())
        const normv = () => { const nn = Math.hypot(...v); if (nn > 0) v = v.map(x => x / nn) }
        const proj = (u: number[]) => {
          const dot = v.reduce((s, x, i) => s + x * u[i], 0)
          for (let i = 0; i < n; i++) v[i] -= dot * u[i]
        }
        normv()
        for (let t = 0; t < 48; t++) {
          for (const u of orth) proj(u)
          const y = lapMul(v)
          v = y
          normv()
        }
        return v
      }
      const ones = Array.from({ length: n }, () => 1 / Math.sqrt(n))
      const e2 = power([ones])
      const e3 = power([ones, e2])
      const e4 = power([ones, e2, e3])
      // 座標へ割当（スケール調整）
      const scale = shellRadius * 0.8
      for (let i = 0; i < n; i++) {
        nodes[i].initial = [e2[i] * scale, e3[i] * scale, e4[i] * scale]
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
        axis: undefined,
        fixed: true,
        nodeType: 'anchor',
        initial: [x, y, z],
      }
    })

    // 全結合 + 10感情を統合した単一エッジ（強スコア=強結合）
    // まず全ペアの生の感情結合スコアを計算
    const rawPairs: Array<{ i: number; j: number; wEmotion: number; wStruct: number }> = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const wi = nodes[i].label
        const wj = nodes[j].label
        const vi = normalizedEmb[wi] || []
        const vj = normalizedEmb[wj] || []
        const sim = (vi.length && vj.length) ? Math.max(-1, Math.min(1, dot(vi, vj))) : 0
        const sim01 = 0.5 * (sim + 1)

        const key = `${i}-${j}`
        const obsRaw = pairWeight.get(key)
        const obsNorm = obsRaw != null ? ((obsRaw - obsMin) / (obsDen || 1)) : 0
        const structComponent = Math.max(0, Math.min(1, (sim01 + obsNorm) / 2))

        const ei = normalizedEmotionVec[wi] || new Array(EMOTION_KEYS.length).fill(0)
        const ej = normalizedEmotionVec[wj] || new Array(EMOTION_KEYS.length).fill(0)

        // 10感情の積（両者が高いほど強い）を平均
        let sum = 0
        for (let k = 0; k < EMOTION_KEYS.length; k++) {
          const emoSpec = Math.max(0, Math.min(1, (ei[k] || 0) * (ej[k] || 0)))
          sum += Math.pow(emoSpec, Math.max(0.1, emotionGain))
        }
        const wEmotion = sum / EMOTION_KEYS.length
        rawPairs.push({ i, j, wEmotion, wStruct: structComponent })
      }
    }

    // 正規化してダイナミックレンジ拡張
    let eMin = Infinity, eMax = -Infinity
    for (const p of rawPairs) { if (p.wEmotion < eMin) eMin = p.wEmotion; if (p.wEmotion > eMax) eMax = p.wEmotion }
    const eDen = eMax - eMin || 1
    // テンセグリティ: 上位の感情結合を張力ケーブル、少数の構造補完を圧縮ストラットに分類
    const combined: Array<{ i: number; j: number; w: number; wE: number; wS: number }> = rawPairs.map(p => {
      const wE = (p.wEmotion - eMin) / eDen
      // 構造と感情のミックス
      let w = Math.max(0, Math.min(1, emotionMix * wE + (1 - emotionMix) * p.wStruct))
      // 1) べき乗強調（既存）
      w = Math.pow(w, Math.max(0.1, weightGamma))
      // 2) 強コントラスト（ロジスティック）: 中央0.5を境に急峻化
      const a = 8 // 勾配（大きいほど0/1へ張り付く）
      const b = 0.5
      const wc = 1 / (1 + Math.exp(-a * (w - b)))
      // 3) 底上げ/天井: 極弱はほぼ0、強は1に近づける
      const wFinal = Math.min(1, Math.max(0, wc))
      return { i: p.i, j: p.j, w: wFinal, wE, wS: p.wStruct }
    })

    // 上位p%を tension、ランダムにわずかを compression
    const tensionFrac = 0.25
    const compressionFrac = 0.08
    const sortedByE = [...combined].sort((a, b) => b.wE - a.wE)
    const Tcount = Math.max(1, Math.floor(sortedByE.length * tensionFrac))
    const Ccount = Math.max(1, Math.floor(sortedByE.length * compressionFrac))

    const tensionSet = new Set(sortedByE.slice(0, Tcount).map(x => `${x.i}-${x.j}`))
    // 圧縮は構造の遠さを優先（wS低→遠い）から抽出
    const sortedBySAsc = [...combined].sort((a, b) => a.wS - b.wS)
    const compressionSet = new Set(sortedBySAsc.slice(0, Ccount).map(x => `${x.i}-${x.j}`))

    const links: WordLink[] = combined.map((p) => {
      const key = `${p.i}-${p.j}`
      if (tensionSet.has(key)) {
        const L0 = Math.max(10, restLength * (1 - 0.4 * Math.pow(p.wE, 2)))
        const k = springK * (0.4 + 0.6 * Math.pow(p.w, 2))
        return { source: p.i, target: p.j, weight: p.w, mode: 'tension', L0, k }
      }
      if (compressionSet.has(key)) {
        const L0 = Math.max(10, restLength * (1 + 0.6 * (1 - p.wS)))
        const k = springK * (0.6 + 0.8 * (1 - p.wS))
        return { source: p.i, target: p.j, weight: p.w, mode: 'compression', L0, k }
      }
      // それ以外は従来の両側バネ
      return { source: p.i, target: p.j, weight: p.w }
    })

    // アンカー追加と接続
    const baseOffset = nodes.length
    const allNodes = [...anchorNodes, ...nodes]
    for (let ai = 0; ai < anchorNodes.length; ai++) {
      const anchorIndex = ai
      for (let wi = 0; wi < nodes.length; wi++) {
        const wordIndex = baseOffset + wi
        const ei = normalizedEmotionVec[nodes[wi].label] || new Array(10).fill(0)
        // アンカー名に対応する感情次元があるならその軸、なければ平均
        const ej = ei // 近似: 同一空間で平均的に張る（詳細マッピングは後続）
        const sim = ei.reduce((s, x, k) => s + x * (ej[k] || 0), 0)
        const w = Math.max(0, Math.min(1, (sim + 1) / 2))
        const L0 = Math.max(10, restLength * (1 - 0.5 * w))
        const k = springK * (0.4 + 0.6 * w)
        links.push({ source: anchorIndex, target: wordIndex, weight: w, mode: 'tension', L0, k })
      }
    }

    return { nodes: allNodes, links }
  }, [data, alpha, gamma, lambda, eta, embeddingsByWord, emotionGain, emotionMix, weightGamma, restLength, springK, shellRadius, kernelSigma, useSpectralInit])

  // KPIカードレンダリング
  const renderKPICards = React.useCallback(() => {
    const kpis = calculateKPIs()
    if (!kpis) return

    const cards = [
      {
        title: '平均反応時間',
        value: kpis.current.avgReactionTime,
        unit: 'ms',
        change: kpis.changes.avgReactionTime,
        sparkline: data.map(d => d.reactionTime).slice(-20) // 最新20件
      },
      {
        title: '平均反応値',
        value: kpis.current.avgReactionValue,
        unit: '',
        change: kpis.changes.avgReactionValue,
        sparkline: data.map(d => d.reactionValue).slice(-20)
      },
      {
        title: '反応率',
        value: kpis.current.responseRate,
        unit: '%',
        change: kpis.changes.responseRate,
        sparkline: data.map(d => d.hasResponse ? 1 : 0).slice(-20)
      },
      {
        title: '総反応数',
        value: kpis.current.totalResponses,
        unit: '件',
        change: kpis.changes.totalResponses,
        sparkline: Array.from({ length: 20 }, () => Math.floor(kpis.current.totalResponses * (0.8 + Math.random() * 0.4)))
      }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`flex items-center text-xs ${
                card.change > 0 ? 'text-green-600' : card.change < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {card.change > 0 ? '↗' : card.change < 0 ? '↘' : '→'} {Math.abs(card.change).toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {card.value.toFixed(card.unit === '%' ? 1 : card.unit === 'ms' ? 0 : 2)}{card.unit}
            </div>
            <div className="h-8">
              <svg width="100%" height="100%" className="text-blue-500">
                <title>スパークライン: {card.title}</title>
                <path
                  d={d3.line<number>()
                    .x((_, i) => (i / (card.sparkline.length - 1)) * 100)
                    .y(d => 100 - (d / Math.max(...card.sparkline)) * 100)
                    .curve(d3.curveMonotoneX)(card.sparkline) || ''}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    )
  }, [data, calculateKPIs])

  // ダンベルチャートレンダリング
  const renderDumbbellChart = React.useCallback(() => {
    const dumbbellData = prepareDumbbellData()
    if (dumbbellData.length === 0) return null

    const margin = { top: 20, right: 30, bottom: 60, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = Math.max(400, dumbbellData.length * 30)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', innerHeight + margin.top + margin.bottom)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // スケール設定
    const yScale = d3.scaleBand()
      .domain(dumbbellData.map(d => d.word))
      .range([0, innerHeight])
      .padding(0.1)

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(dumbbellData, d => Math.max(d.firstHalf.avgReactionValue, d.secondHalf.avgReactionValue)) || 1])
      .range([0, innerWidth])

    // 線を描画
    g.selectAll('.dumbbell-line')
      .data(dumbbellData)
      .enter()
      .append('line')
      .attr('class', 'dumbbell-line')
      .attr('x1', d => xScale(d.firstHalf.avgReactionValue))
      .attr('x2', d => xScale(d.secondHalf.avgReactionValue))
      .attr('y1', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('y2', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .style('stroke', '#666')
      .style('stroke-width', 2)

    // 前半の点
    g.selectAll('.first-half-point')
      .data(dumbbellData)
      .enter()
      .append('circle')
      .attr('class', 'first-half-point')
      .attr('cx', d => xScale(d.firstHalf.avgReactionValue))
      .attr('cy', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('r', 6)
      .style('fill', '#3b82f6')
      .style('stroke', '#fff')
      .style('stroke-width', 2)

    // 後半の点
    g.selectAll('.second-half-point')
      .data(dumbbellData)
      .enter()
      .append('circle')
      .attr('class', 'second-half-point')
      .attr('cx', d => xScale(d.secondHalf.avgReactionValue))
      .attr('cy', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('r', 6)
      .style('fill', d => d.secondHalf.avgReactionValue > d.firstHalf.avgReactionValue ? '#10b981' : '#ef4444')
      .style('stroke', '#fff')
      .style('stroke-width', 2)

    // Y軸
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')

    // X軸
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')

    // ラベル
    g.append('text')
      .attr('class', 'x-label')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('平均反応値')

    // 凡例
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 150}, 20)`)

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 6)
      .style('fill', '#3b82f6')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 5)
      .style('font-size', '12px')
      .text('前半')

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 20)
      .attr('r', 6)
      .style('fill', '#10b981')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 25)
      .style('font-size', '12px')
      .text('後半（改善）')

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 40)
      .attr('r', 6)
      .style('fill', '#ef4444')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 45)
      .style('font-size', '12px')
      .text('後半（悪化）')

  }, [prepareDumbbellData, width])

  // スモールマルチプルレンダリング
  const renderSmallMultiples = React.useCallback(() => {
    const smallMultiplesData = prepareSmallMultiplesData()
    if (smallMultiplesData.length === 0) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {smallMultiplesData.map((item) => (
          <div key={item.word} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">{item.word}</h3>
              <div className="text-xs text-gray-500">{item.data.length}件</div>
            </div>
            
            <div className="h-16 mb-2">
              <svg width="100%" height="100%" className="text-blue-500">
                <title>スパークライン: {item.word}</title>
                <path
                  d={d3.line<TimelineDataPoint>()
                    .x((_, i) => (i / Math.max(1, item.data.length - 1)) * 100)
                    .y(d => 100 - (d.reactionValue / Math.max(...item.data.map(x => x.reactionValue))) * 100)
                    .curve(d3.curveMonotoneX)(item.data) || ''}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-500">平均反応値</div>
                <div className="font-semibold">{item.stats.avgReactionValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">反応率</div>
                <div className="font-semibold">{item.stats.responseRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-500">最大値</div>
                <div className="font-semibold">{item.stats.maxReactionValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">平均時間</div>
                <div className="font-semibold">{item.stats.avgReactionTime.toFixed(0)}ms</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }, [prepareSmallMultiplesData])

  // 時間範囲を初期化
  const initializeTimeRange = React.useCallback(() => {
    if (data.length === 0) return

    const timeExtent = d3.extent(data, d => d.timestamp) as [number, number]
    const range = timeExtent[1] - timeExtent[0]
    const initialRange = {
      start: timeExtent[0] + range * 0.2, // 20%から開始
      end: timeExtent[1] - range * 0.2   // 80%で終了
    }
    setTimeRange(initialRange)
  }, [data])

  // 概要チャート（ナビゲーター）レンダリング
  const renderOverviewChart = React.useCallback(() => {
    if (!overviewSvgRef.current || data.length === 0) return

    const svg = d3.select(overviewSvgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 10, right: 20, bottom: 30, left: 20 }
    const overviewWidth = width - margin.left - margin.right
    const overviewHeight = 80 - margin.top - margin.bottom

    svg.attr('width', width).attr('height', 80)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // 時間範囲
    const timeExtent = d3.extent(data, d => d.timestamp) as [Date, Date]
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, overviewWidth])

    // 反応値のスケール
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionValue) as [number, number])
      .range([overviewHeight, 0])

    // メインライン
    const line = d3.line<TimelineDataPoint>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.reactionValue))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(data)
      .attr('class', 'overview-line')
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', '#666')
      .style('stroke-width', 1)

    // 選択範囲のハイライト
    if (timeRange) {
      g.append('rect')
        .attr('class', 'brush-area')
        .attr('x', xScale(new Date(timeRange.start)))
        .attr('y', 0)
        .attr('width', xScale(new Date(timeRange.end)) - xScale(new Date(timeRange.start)))
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('opacity', 0.2)
        .style('stroke', '#3b82f6')
        .style('stroke-width', 1)

      // ドラッグハンドル
      g.append('rect')
        .attr('class', 'brush-handle-left')
        .attr('x', xScale(new Date(timeRange.start)) - 2)
        .attr('y', 0)
        .attr('width', 4)
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('cursor', 'ew-resize')

      g.append('rect')
        .attr('class', 'brush-handle-right')
        .attr('x', xScale(new Date(timeRange.end)) - 2)
        .attr('y', 0)
        .attr('width', 4)
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('cursor', 'ew-resize')

      // ブラシ機能
      const brush = d3.brushX()
        .extent([[0, 0], [overviewWidth, overviewHeight]])
        .on('brush', (event) => {
          const selection = event.selection
          if (selection) {
            const [x0, x1] = selection.map(xScale.invert)
            setTimeRange({
              start: x0.getTime(),
              end: x1.getTime()
            })
          }
        })

      g.append('g')
        .attr('class', 'brush')
        .call(brush as unknown as d3.BrushBehavior<unknown>)
    }

    // X軸
    g.append('g')
      .attr('class', 'x-axis-overview')
      .attr('transform', `translate(0,${overviewHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M'))
        .ticks(5)
      )
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666')

  }, [data, width, timeRange])

  const renderTimeline = React.useCallback(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // フィルタリングされたデータ
    const filteredData = timeRange 
      ? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data

    // スケール設定
    const timeExtent = timeRange 
      ? [new Date(timeRange.start), new Date(timeRange.end)] as [Date, Date]
      : d3.extent(data, d => new Date(d.timestamp)) as [Date, Date]
    
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.reactionValue) || 100])
      .range([innerHeight, 0])

    // メイングループ
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // グリッド線
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => '')
      )
      .style('stroke', '#e0e0e0')
      .style('opacity', 0.5)

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .style('stroke', '#e0e0e0')
      .style('opacity', 0.5)

    // 複数軸の設定
    const yAxisCount = 4; // 反応値、反応時間、生理閾値、感情変化
    const axisHeight = innerHeight / yAxisCount;
    
    // 各軸のスケール設定
    const reactionValueScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionValue) as [number, number])
      .range([axisHeight * 0.5, axisHeight * 0.1]);
    
    const reactionTimeScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionTime) as [number, number])
      .range([axisHeight * 1.5, axisHeight * 1.1]);
    
    const physiologicalScale = d3.scaleLinear()
      .domain([0, 100]) // 生理データの閾値
      .range([axisHeight * 2.5, axisHeight * 2.1]);
    
    const emotionScale = d3.scaleLinear()
      .domain([0, 1]) // 感情変化スコア
      .range([axisHeight * 3.5, axisHeight * 3.1]);

    // 単語表示（時間軸上）
    if (filters.wordDisplay && filters.showWordLabels) {
      g.selectAll('.word-label')
        .data(filteredData)
        .enter()
        .append('text')
        .attr('class', 'word-label')
        .attr('x', d => xScale(new Date(d.timestamp)))
        .attr('y', innerHeight + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#374151')
        .text(d => d.word)
        .style('opacity', 0.9)
        .on('mouseover', (event, d) => {
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
        });
    }

    // 反応値データポイント
    if (filters.reactionValues) {
      g.selectAll('.reaction-value-point')
        .data(filteredData)
        .enter()
        .append('circle')
        .attr('class', 'reaction-value-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', d => reactionValueScale(d.reactionValue))
        .attr('r', 3)
        .style('fill', '#2563eb')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
        });
    }

    // 反応時間データポイント
    if (filters.reactionTime) {
      g.selectAll('.reaction-time-point')
        .data(filteredData.filter(d => d.hasResponse))
        .enter()
        .append('circle')
        .attr('class', 'reaction-time-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', d => reactionTimeScale(d.reactionTime))
        .attr('r', 3)
        .style('fill', '#dc2626')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 生理データ閾値
    if (filters.physiologicalThreshold) {
      g.selectAll('.physiological-point')
        .data(filteredData.filter(d => {
          const p = d.physiological as unknown
          return Array.isArray(p) ? p.length > 0 : typeof p === 'object'
        }))
        .enter()
        .append('circle')
        .attr('class', 'physiological-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', _d => physiologicalScale(Math.random() * 100)) // デモ用
        .attr('r', 3)
        .style('fill', '#16a34a')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 感情変化
    if (filters.emotionChange) {
      g.selectAll('.emotion-change-point')
        .data(filteredData.filter(d => d.emotions.length > 0))
        .enter()
        .append('circle')
        .attr('class', 'emotion-change-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', _d => emotionScale(Math.random())) // デモ用
        .attr('r', 3)
        .style('fill', '#9333ea')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
        });
    }

    // 感情データの詳細表示
    if (filters.showEmotionDetails) {
      filteredData.forEach(d => {
        if (d.emotions.length > 0) {
          // 感情データポイントを個別に表示
          d.emotions.forEach((emotion) => {
            const emotionGroup = g.append('g')
              .attr('class', 'emotion-detail-group')
              .attr('transform', `translate(${xScale(new Date(d.timestamp))}, ${emotionScale(emotion.score)})`)

            // 感情の色を決定
            const emotionColors: Record<string, string> = {
              'joy': '#fbbf24',
              'sadness': '#3b82f6',
              'anger': '#ef4444',
              'fear': '#8b5cf6',
              'surprise': '#10b981',
              'disgust': '#6b7280',
              'calm': '#84cc16',
              'focus': '#f59e0b',
              'excitement': '#ec4899',
              'confusion': '#6366f1'
            }

            const color = emotionColors[(emotion.name || 'unknown').toLowerCase()] || '#9333ea'

            emotionGroup.append('circle')
              .attr('r', 4)
              .style('fill', color)
              .style('stroke', '#fff')
              .style('stroke-width', 2)
              .style('cursor', 'pointer')
              .on('mouseover', (event) => {
                setSelectedDataPoint(d)
                showTooltip(event, d)
              })
              .on('mouseout', () => {
                setSelectedDataPoint(null)
                hideTooltip()
              })

            // 感情名のラベル
            emotionGroup.append('text')
              .attr('x', 8)
              .attr('y', 4)
              .attr('font-size', '9px')
              .attr('font-weight', '500')
              .attr('fill', color)
              .text(emotion.name || 'unknown')
              .style('opacity', 0.8)
          })
        }
      })
    }

    // 線の描画（反応値）
    if (filters.reactionValues) {
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale(d.reactionValue))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(filteredData)
        .attr('class', 'reaction-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2)
    }

    // 軸の描画
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M:%S'))
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#666')

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#666')

    // 軸ラベル
    g.append('text')
      .attr('class', 'x-label')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text('時間')

    // Y軸ラベル（複数軸対応）
    g.append('text')
      .attr('class', 'y-label-reaction')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 0.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('反応値')
      .style('opacity', filters.reactionValues ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-time')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 1.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('反応時間 (ms)')
      .style('opacity', filters.reactionTime ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-physiological')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 2.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('生理閾値')
      .style('opacity', filters.physiologicalThreshold ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-emotion')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 3.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('感情変化')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    // ズーム機能
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event
        g.attr('transform', `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`)
      })

    svg.call(zoom as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void)

    // 感情の凡例
    if (filters.showEmotionDetails) {
      const legend = g.append('g')
        .attr('class', 'emotion-legend')
        .attr('transform', `translate(${innerWidth - 200}, 20)`)

      const emotionColors: Record<string, string> = {
        'joy': '#fbbf24',
        'sadness': '#3b82f6',
        'anger': '#ef4444',
        'fear': '#8b5cf6',
        'surprise': '#10b981',
        'disgust': '#6b7280',
        'calm': '#84cc16',
        'focus': '#f59e0b',
        'excitement': '#ec4899',
        'confusion': '#6366f1'
      }

      const emotions = Object.keys(emotionColors)
      const legendItems = legend.selectAll('.legend-item')
        .data(emotions)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (_d, i) => `translate(0, ${i * 20})`)

      legendItems.append('circle')
        .attr('r', 4)
        .style('fill', d => emotionColors[d])
        .style('stroke', '#fff')
        .style('stroke-width', 1)

      legendItems.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .attr('font-size', '10px')
        .attr('fill', '#374151')
        .text(d => d)

      // 凡例の背景
      legend.insert('rect', ':first-child')
        .attr('width', 120)
        .attr('height', emotions.length * 20 + 10)
        .attr('fill', 'rgba(255, 255, 255, 0.9)')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('rx', 4)
    }
  }, [data, filters, width, height, showTooltip, hideTooltip, timeRange])


  // データ取得
  useEffect(() => {
    fetchTimelineData()
    fetchWordEmbeddings()
  }, [fetchTimelineData, fetchWordEmbeddings])

  // 時間範囲初期化
  useEffect(() => {
    if (data.length > 0 && !timeRange) {
      initializeTimeRange()
    }
  }, [data, timeRange, initializeTimeRange])

  // D3可視化
  useEffect(() => {
    if (data.length > 0 && svgRef.current) {
      switch (visualizationMode) {
        case 'timeline':
          renderTimeline()
          renderOverviewChart()
          break
        case 'dumbbell':
          renderDumbbellChart()
          break
        case 'force-3d':
          // three.js 側で描画するため、ここではD3描画なし
          break
        default:
          break
      }
    }
  }, [data, renderTimeline, renderDumbbellChart, renderOverviewChart, visualizationMode])


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">時系列データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>エラー: {error}</p>
        <button 
          type="button"
          onClick={fetchTimelineData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 表示モード切り替え */}
      {!forceMode && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">表示モード</h3>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'timeline', label: '時系列', icon: '📈' },
              { id: 'kpi', label: 'KPIカード', icon: '📊' },
              { id: 'dumbbell', label: 'Before-After', icon: '⚖️' },
              { id: 'small-multiples', label: 'スモールマルチプル', icon: '🔢' },
              { id: 'force-3d', label: '3D Force', icon: '🧲' }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setVisualizationMode(mode.id as VisualizationMode)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  visualizationMode === mode.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
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
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.reactionTime}
              onChange={(e) => setFilters(prev => ({ ...prev, reactionTime: e.target.checked }))}
            />
            <span className="text-sm">反応時間</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.physiologicalThreshold}
              onChange={(e) => setFilters(prev => ({ ...prev, physiologicalThreshold: e.target.checked }))}
            />
            <span className="text-sm">生理閾値</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.emotionChange}
              onChange={(e) => setFilters(prev => ({ ...prev, emotionChange: e.target.checked }))}
            />
            <span className="text-sm">感情変化</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showEmotionDetails}
              onChange={(e) => setFilters(prev => ({ ...prev, showEmotionDetails: e.target.checked }))}
            />
            <span className="text-sm">感情詳細</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showWordLabels}
              onChange={(e) => setFilters(prev => ({ ...prev, showWordLabels: e.target.checked }))}
            />
            <span className="text-sm">単語ラベル</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm">範囲:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.range}
              onChange={(e) => setFilters(prev => ({ ...prev, range: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.range}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">時間スケール:</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={filters.timeScale}
              onChange={(e) => setFilters(prev => ({ ...prev, timeScale: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.timeScale.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">縦スケール:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={filters.verticalScale}
              onChange={(e) => setFilters(prev => ({ ...prev, verticalScale: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.verticalScale.toFixed(1)}x</span>
          </div>
        </div>
      </div>
      )}

      {/* メインコンテンツ */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">
          {visualizationMode === 'timeline' && '時系列統合可視化'}
          {visualizationMode === 'kpi' && 'KPIダッシュボード'}
          {visualizationMode === 'dumbbell' && 'Before-After比較'}
          {visualizationMode === 'small-multiples' && 'スモールマルチプル分析'}
        </h3>
        
        {visualizationMode === 'timeline' && (
          <div className="space-y-4">
            {/* メインチャート */}
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="border"
            />
            
            {/* 概要チャート（ナビゲーター） */}
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600 mb-1">時間範囲選択</div>
              <svg
                ref={overviewSvgRef}
                width={width}
                height={80}
                className="border border-gray-300"
              />
            </div>
          </div>
        )}
        
        {visualizationMode === 'kpi' && renderKPICards()}
        
        {visualizationMode === 'dumbbell' && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="border"
          />
        )}
        
        {visualizationMode === 'small-multiples' && renderSmallMultiples()}

        {visualizationMode === 'force-3d' && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <label className="flex items-center space-x-2 col-span-2 md:col-span-2">
              <span>Preset</span>
              <select className="border rounded px-2 py-1" value={forcePresetId} onChange={(e) => applyForcePreset(e.target.value as typeof forcePresetId)}>
                {forcePresets.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center space-x-2">
              <span>α</span>
              <input type="number" step="0.1" value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>γ</span>
              <input type="number" step="0.1" value={gamma} onChange={(e) => setGamma(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>λ</span>
              <input type="number" step="0.1" value={lambda} onChange={(e) => setLambda(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>η</span>
              <input type="number" step="0.1" value={eta} onChange={(e) => setEta(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>β</span>
              <input type="number" step="0.1" value={beta} onChange={(e) => setBeta(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>Emo Weak</span>
              <input type="number" step="0.1" value={emotionWeak} onChange={(e) => setEmotionWeak(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>Emo Strong</span>
              <input type="number" step="0.1" value={emotionStrong} onChange={(e) => setEmotionStrong(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <div className="flex items-center space-x-2 col-span-2">
              <span>Emo Gain</span>
              <input
                type="range"
                min={emotionGainMin}
                max={emotionGainMax}
                step="0.1"
                value={emotionGain}
                onChange={(e) => setEmotionGain(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-10 text-right">{emotionGain.toFixed(1)}</span>
              <span className="ml-2 text-xs text-gray-500">min</span>
              <input type="number" step="0.1" value={emotionGainMin} onChange={(e) => setEmotionGainMin(Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
              <span className="text-xs text-gray-500">max</span>
              <input type="number" step="0.1" value={emotionGainMax} onChange={(e) => setEmotionGainMax(Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
            </div>
            <label className="flex items-center space-x-2 col-span-2">
              <span>Emo Mix</span>
              <input
                type="range"
                min={0}
                max={1}
                step="0.05"
                value={emotionMix}
                onChange={(e) => setEmotionMix(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-10 text-right">{emotionMix.toFixed(2)}</span>
            </label>
            <label className="flex items-center space-x-2">
              <span>γ(w)</span>
              <input type="number" step="0.1" value={weightGamma} onChange={(e) => setWeightGamma(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>ShellR</span>
              <input type="number" step="10" value={shellRadius} onChange={(e) => setShellRadius(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>ShellK</span>
              <input type="number" step="0.1" value={shellK} onChange={(e) => setShellK(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>RadialOutK</span>
              <input type="number" step="1" value={radialOutK} onChange={(e) => setRadialOutK(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            {/* reserved: constraints tuning controls */}
            <label className="flex items-center space-x-2">
              <span>K</span>
              <input type="number" step="1" value={neighborsK} onChange={(e) => setNeighborsK(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>Repulsion</span>
              <input type="number" step="10" value={repulsionK} onChange={(e) => setRepulsionK(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>L0</span>
              <input type="number" step="1" value={restLength} onChange={(e) => setRestLength(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>Damping</span>
              <input type="number" step="0.01" value={damping} onChange={(e) => setDamping(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>σ</span>
              <input type="number" step="0.05" min="0.1" max="3" value={kernelSigma} onChange={(e) => setKernelSigma(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </label>
            <label className="flex items-center space-x-2">
              <span>Spectral Init</span>
              <input type="checkbox" checked={useSpectralInit} onChange={(e) => setUseSpectralInit(e.target.checked)} />
            </label>
          </div>
        )}

        {visualizationMode === 'force-3d' && mounted && (() => {
          type Force3DProps = { nodes: WordNode[]; links: WordLink[]; width: number; height: number; physics: { springK: number; repulsionK: number; damping: number; restLength: number; maxSpeed: number; shellRadius?: number; shellK?: number; shellRadiusOuter?: number; shellKOuter?: number; radialOutK?: number; constraintIters?: number; constraintStiffness?: number }; emotionPower?: number }
          const Force3D = dynamic<Force3DProps>(() => import('./Force3DWordGraph.tsx') as unknown as Promise<{ default: React.ComponentType<Force3DProps> }>, { ssr: false })
          const { nodes, links } = prepareForce3DGraph()
          return (
            <div className="border rounded overflow-hidden">
              <Force3D nodes={nodes} links={links} width={width} height={Math.max(600, height)} physics={{ springK, repulsionK, damping, restLength, maxSpeed: 120, shellRadius, shellK, shellRadiusOuter: shellRadius * 1.6, shellKOuter: Math.max(0, shellK - 2), radialOutK }} emotionPower={emotionGain} />
            </div>
          )
        })()}
      </div>

      {/* データポイント詳細 */}
      {selectedDataPoint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">選択されたデータポイント</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">単語</div>
              <div className="text-gray-600">{selectedDataPoint.word}</div>
            </div>
            <div>
              <div className="font-medium">時間</div>
              <div className="text-gray-600">{new Date(selectedDataPoint.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">反応値</div>
              <div className="text-gray-600">{selectedDataPoint.reactionValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-medium">イベントタイプ</div>
              <div className="text-gray-600">{selectedDataPoint.eventType}</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">感情データ</div>
              <div className="text-gray-600">
                {selectedDataPoint.emotions.length > 0 ? (
                  selectedDataPoint.emotions.map((emotion, index) => (
                    <div key={`${emotion.name}-${emotion.fileType}-${index}`} className="text-xs">
                      <span className="font-medium">{emotion.name || 'unknown'}</span>: 
                      <span className="text-blue-600">{(emotion.score || 0).toFixed(2)}</span>
                      <span className="text-gray-500">({emotion.fileType || 'unknown'})</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">感情データなし</div>
                )}
              </div>
            </div>
            <div>
              <div className="font-medium">生理データ</div>
              <div className="text-gray-600">
                平均: {getPhysStat(selectedDataPoint.physiological, 'average').toFixed(2)}<br/>
                最大: {getPhysStat(selectedDataPoint.physiological, 'max').toFixed(2)}<br/>
                最小: {getPhysStat(selectedDataPoint.physiological, 'min').toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-medium">メタデータ</div>
              <div className="text-gray-600">
                感情データ数: {selectedDataPoint.metadata?.emotionCount || 0}<br/>
                生理データ数: {selectedDataPoint.metadata?.physiologicalCount || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ツールチップ */}
      <div
        ref={tooltipRef}
        className="fixed bg-white border border-gray-300 rounded-lg p-2 shadow-lg text-sm z-50 pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* 統計情報 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">統計情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">総データポイント</div>
            <div className="text-gray-600">{data.length}</div>
          </div>
          <div>
            <div className="font-medium">平均反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? (data.reduce((sum, d) => sum + d.reactionValue, 0) / data.length).toFixed(2) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="font-medium">最大反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? Math.max(...data.map(d => d.reactionValue)).toFixed(2) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="font-medium">最小反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? Math.min(...data.map(d => d.reactionValue)).toFixed(2) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: components.timeline_visualization -> implementation_complete
// 時系列統合可視化コンポーネントの実装完了
