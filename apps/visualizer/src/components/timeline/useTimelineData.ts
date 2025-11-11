import { useState, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type {
  TimelineDataPoint,
  TimelineVisualizationProps,
  FilterSettings,
  TimeRange
} from './types'

// Merkle DAG: timeline.hooks.data
// 時系列データの取得と状態管理フック

export function useTimelineData({ participantId, sessionId }: Pick<TimelineVisualizationProps, 'participantId' | 'sessionId'>) {
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
    range: 200,
    timeScale: 1.0,
    verticalScale: 1.0,
    showEmotionDetails: true,
    showWordLabels: true
  })


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
      console.log('TimelineVisualization: Starting data fetch for participant:', participantId, sessionId ? `session: ${sessionId}` : '')
      // 実データのみを使用（APIから取得）
      const apiUrl = sessionId 
        ? `/api/participants/${participantId}/timeline?sessionId=${encodeURIComponent(sessionId)}&_t=${Date.now()}`
        : `/api/participants/${participantId}/timeline?_t=${Date.now()}`
      console.log('TimelineVisualization: API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      console.log('TimelineVisualization: API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      
      const result = await response.json()
      console.log('TimelineVisualization: API result:', result)
      
      if (result?.success && Array.isArray(result.data?.timelineData)) {
        console.log('TimelineVisualization: Converting data, count:', result.data.timelineData.length)
        // 短縮フィールドをTimelineDataPoint形式に変換
        const convertedData = result.data.timelineData.map((item: any) => ({
          timestamp: item.t || item.timestamp,
          word: item.w || item.word,
          reactionTime: item.rt ?? item.reactionTime ?? null, // 反応時間を正しく取得
          hasResponse: item.rt != null || item.reactionTime != null, // 反応時間が存在する場合はtrue
          emotions: Array.isArray(item.em) ? item.em : (Array.isArray(item.emotions) ? item.emotions : []),
          physiological: item.ph || item.physiological || { average: 0, max: 0, min: 0 },
          reactionValue: item.rv || item.reactionValue || 0,
          eventType: item.e || item.eventType,
          metadata: item.m || item.metadata || { emotionCount: 0, physiologicalCount: 0 }
        }))
        
        // 感情データのfileTypeを確認
        const emotionDataSample = convertedData.find(d => d.emotions && d.emotions.length > 0)
        if (emotionDataSample) {
          console.log('TimelineVisualization: Emotion data sample:', {
            word: emotionDataSample.word,
            emotionsCount: emotionDataSample.emotions.length,
            firstEmotion: emotionDataSample.emotions[0],
            allFileTypes: [...new Set(emotionDataSample.emotions.map((e: any) => e.fileType))]
          })
        } else {
          console.log('TimelineVisualization: No emotion data found in converted data')
        }
        
        console.log('TimelineVisualization: Converted data sample:', convertedData[0])
        setData(convertedData)
        
        if (Array.isArray(result.data.metadata?.errors) && result.data.metadata.errors.length > 0) {
          setError(`警告: 一部データ取得に失敗しました: ${result.data.metadata.errors.join('; ')}`)
        } else {
          setError(null)
        }
      } else {
        throw new Error('API response not successful or no data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [participantId, sessionId])

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
