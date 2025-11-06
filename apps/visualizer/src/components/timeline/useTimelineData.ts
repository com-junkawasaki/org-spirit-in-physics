import { useState, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'
import type {
  TimelineDataPoint,
  TimelineVisualizationProps,
  EmotionData,
  FilterSettings,
  TimeRange
} from './types'

// Merkle DAG: timeline.hooks.data
// 時系列データの取得と状態管理フック

export function useTimelineData({ participantId, useDemo = false }: Pick<TimelineVisualizationProps, 'participantId' | 'useDemo'>) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDataPoint, setSelectedDataPoint] = useState<TimelineDataPoint | null>(null)
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

  // --- Demo timeline generator -------------------------------------------------
  const generateDemoTimeline = useCallback((): TimelineDataPoint[] => {
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

  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true)
      console.log('TimelineVisualization: Starting data fetch for participant:', participantId)
      // API優先、失敗時・useDemo時はローカル生成でフォールバック
      const apiUrl = `/api/participants/${participantId}/timeline`
      console.log('TimelineVisualization: API URL:', apiUrl)
      let ok = false
      try {
        const response = await fetch(apiUrl)
        console.log('TimelineVisualization: API response status:', response.status)
        const result = await response.json()
        console.log('TimelineVisualization: API result:', result)
        if (result?.success && Array.isArray(result.data?.timelineData)) {
          console.log('TimelineVisualization: Converting data, count:', result.data.timelineData.length)
          // 短縮フィールドをTimelineDataPoint形式に変換
          const convertedData = result.data.timelineData.map((item: any) => ({
            timestamp: item.t || item.timestamp,
            word: item.w || item.word,
            reactionTime: item.rt != null ? item.rt : (item.reactionTime != null ? item.reactionTime : null), // APIから取得
            hasResponse: item.rt != null && item.rt > 0, // 反応時間が存在するか
            emotions: item.em || item.emotions || [],
            physiological: item.ph || item.physiological || { average: 0, max: 0, min: 0 },
            reactionValue: item.rv || item.reactionValue || 0,
            eventType: item.e || item.eventType,
            metadata: item.m || item.metadata || { emotionCount: 0, physiologicalCount: 0 }
          }))
          console.log('TimelineVisualization: Converted data sample:', convertedData[0])
          setData(convertedData)
          ok = true
          if (Array.isArray(result.data.metadata?.errors) && result.data.metadata.errors.length > 0) {
            setError(`警告: 一部データ取得に失敗しました: ${result.data.metadata.errors.join('; ')}`)
          } else {
            setError(null)
          }
        } else {
          console.log('TimelineVisualization: API response not successful or no data')
        }
      } catch (error) {
        console.error('TimelineVisualization: API fetch error:', error)
        // noop -> フォールバックへ
      }

      if (!ok || useDemo) {
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
  const fetchWordEmbeddings = useCallback(async () => {
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

  // 時間範囲を初期化
  const initializeTimeRange = useCallback(() => {
    if (data.length === 0) return

    const timeExtent = d3.extent(data, d => d.timestamp) as [number, number]
    const range = timeExtent[1] - timeExtent[0]
    const initialRange = {
      start: timeExtent[0] + range * 0.2, // 20%から開始
      end: timeExtent[1] - range * 0.2   // 80%で終了
    }
    setTimeRange(initialRange)
  }, [data])

  useEffect(() => {
    console.log('TimelineVisualization: useEffect triggered, mounted:', mounted)
    if (mounted) {
      console.log('TimelineVisualization: Calling fetchTimelineData')
      fetchTimelineData()
      fetchWordEmbeddings()
    }
  }, [fetchTimelineData, fetchWordEmbeddings, mounted])

  // 時間範囲初期化
  useEffect(() => {
    if (data.length > 0 && !timeRange) {
      initializeTimeRange()
    }
  }, [data, timeRange, initializeTimeRange])

  return {
    mounted,
    data,
    loading,
    error,
    selectedDataPoint,
    setSelectedDataPoint,
    timeRange,
    setTimeRange,
    embeddingsByWord,
    filters,
    setFilters,
    getPhysStat,
    refetchData: fetchTimelineData
  }
}

// Merkle DAG: timeline.hooks.data -> implementation_complete
// 時系列データの取得と状態管理フックの実装完了
