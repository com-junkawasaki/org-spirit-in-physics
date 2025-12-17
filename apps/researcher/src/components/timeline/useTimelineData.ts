import { useState, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type {
  TimelineDataPoint,
  TimelineVisualizationProps,
  FilterSettings,
  TimeRange,
  DebugInfo
} from './types'
import { useTimeline } from '@/lib/connect/hooks/useTimeline'

// Merkle DAG: timeline.hooks.data
// 時系列データの取得と状態管理フック（Connect RPC版）

export function useTimelineData({ participantId, sessionId }: Pick<TimelineVisualizationProps, 'participantId' | 'sessionId'>) {
  const [mounted, setMounted] = useState(false)
  const [selectedDataPoint, setSelectedDataPoint] = useState<TimelineDataPoint | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [embeddingsByWord, setEmbeddingsByWord] = useState<Record<string, number[]>>({})
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    apiStatus: 'idle',
    apiResponseReceived: false,
    dataPointCount: 0,
    dataConversionStatus: 'pending',
    errors: [],
    sessionDataStatus: 'pending',
    emotionDataStatus: 'pending',
    physiologicalDataStatus: 'pending'
  })
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

  // Use Connect RPC hook
  const { data: timelinePoints, isLoading, error, refetch } = useTimeline(
    participantId,
    sessionId
  )

  // Transform Connect RPC data to TimelineDataPoint format
  const data: TimelineDataPoint[] = timelinePoints?.map((point) => {
    const timestamp = point.time?.seconds ? point.time.seconds * 1000 : Date.now()
    
    return {
      timestamp,
      word: point.word || null,
      reactionTime: point.reactionTime || null,
      hasResponse: point.hasResponse,
      emotions: point.emotions.map((e) => ({
        name: e.name || '',
        score: e.score || 0,
        fileType: e.fileType || '',
      })),
      physiological: point.physiological.length > 0
        ? {
            average: point.physiological.reduce((sum, p) => sum + (p.value || 0), 0) / point.physiological.length,
            max: Math.max(...point.physiological.map(p => p.value || 0)),
            min: Math.min(...point.physiological.map(p => p.value || 0)),
          }
        : { average: 0, max: 0, min: 0 },
      reactionValue: point.reactionValue || 0,
      eventType: point.eventType || 'word_displayed',
      metadata: point.metadata || { emotionCount: 0, physiologicalCount: 0 }
    }
  }) || []

  const loading = isLoading
  const errorMessage = error ? (error instanceof Error ? error.message : 'Unknown error') : null

  // Update debug info
  const hasEmotions = data.some(d => d.emotions.length > 0)
  const hasPhysiological = data.some(d => {
    if (d.physiological && typeof d.physiological === 'object' && !Array.isArray(d.physiological)) {
      const phys = d.physiological as { average?: number }
      return phys.average !== undefined && phys.average > 0
    }
    return false
  })
  
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      apiStatus: isLoading ? 'loading' : (error ? 'error' : 'success'),
      apiResponseReceived: !!timelinePoints,
      dataPointCount: data.length,
      dataConversionStatus: timelinePoints ? 'success' : 'pending',
      sessionDataStatus: data.length > 0 ? 'success' : 'not_available',
      emotionDataStatus: hasEmotions ? 'success' : 'not_available',
      physiologicalDataStatus: hasPhysiological ? 'success' : 'not_available',
      errors: error ? [errorMessage || 'Unknown error'] : [],
    }))
  }, [timelinePoints, isLoading, error, data.length, errorMessage, hasEmotions, hasPhysiological])

  const getPhysStat = (p: TimelineDataPoint['physiological'], key: 'average' | 'max' | 'min'): number => {
    if (Array.isArray(p)) return 0
    if (p && typeof p === 'object') {
      const v = (p as Record<string, unknown>)[key]
      return typeof v === 'number' && Number.isFinite(v) ? v : 0
    }
    return 0
  }

  useEffect(() => { setMounted(true) }, [])

  // Word2Vec 埋め込み（平均）を単語ごとに取得
  const fetchWordEmbeddings = useCallback(async () => {
    if (!participantId || typeof participantId !== 'string' || participantId.trim() === '') {
      console.warn('TimelineVisualization: Skipping word2vec fetch - invalid participantId:', participantId)
      return
    }

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
      console.log('TimelineVisualization: Calling fetchWordEmbeddings')
      fetchWordEmbeddings()
    }
  }, [fetchWordEmbeddings, mounted])

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
    error: errorMessage,
    selectedDataPoint,
    setSelectedDataPoint,
    timeRange,
    setTimeRange,
    embeddingsByWord,
    filters,
    setFilters,
    getPhysStat,
    refetchData: () => refetch(),
    debugInfo
  }
}

// Merkle DAG: timeline.hooks.data -> implementation_complete
// 時系列データの取得と状態管理フックの実装完了（Connect RPC版）
