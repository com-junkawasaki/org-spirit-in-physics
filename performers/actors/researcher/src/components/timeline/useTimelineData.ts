import { useState, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import type {
  TimelineDataPoint,
  TimelineVisualizationProps,
  FilterSettings,
  TimeRange,
  DebugInfo
} from './types'

// Merkle DAG: timeline.hooks.data
// 時系列データの取得と状態管理フック

export function useTimelineData({ participantId }: Pick<TimelineVisualizationProps, 'participantId'>) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    const totalStart = performance.now()
    try {
      setLoading(true)
      setDebugInfo(prev => ({
        ...prev,
        apiStatus: 'loading',
        errors: []
      }))
      
      console.log('[TimelineData] Starting data fetch for participant:', participantId)
      // Use sampleSize=2000 for initial display to optimize performance
      const apiUrl = `/api/participants/${participantId}/timeline?sampleSize=2000`
      console.log('[TimelineData] API URL:', apiUrl)
      
      let ok = false
      let conversionError: Error | null = null
      
      try {
        const apiRequestStart = performance.now()
        const response = await fetch(apiUrl)
        const apiRequestMs = Math.round(performance.now() - apiRequestStart)
        console.log('[TimelineData] API response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log('[TimelineData] API result:', {
          success: result?.success,
          hasData: !!result?.data,
          timelineDataLength: result?.data?.timelineData?.length,
          metadata: result?.data?.metadata
        })
        
        setDebugInfo(prev => ({
          ...prev,
          apiResponseReceived: true,
          apiStatus: result?.success ? 'success' : 'error',
          responseMetadata: result?.data?.metadata,
          apiUrl
        }))
        
        if (result?.success && Array.isArray(result.data?.timelineData)) {
          console.log('[TimelineData] Converting data, count:', result.data.timelineData.length)
          
          try {
            const conversionStart = performance.now()
            // 短縮フィールドをTimelineDataPoint形式に変換
            const convertedData = result.data.timelineData.map((item: any, index: number) => {
              try {
                // timestampを数値に変換（無効な場合はスキップ）
                const timestamp = typeof item.t === 'number' ? item.t : 
                                 typeof item.timestamp === 'number' ? item.timestamp :
                                 typeof item.t === 'string' ? parseFloat(item.t) :
                                 typeof item.timestamp === 'string' ? parseFloat(item.timestamp) : NaN;
                
                if (isNaN(timestamp) || timestamp <= 0) {
                  console.warn(`[TimelineData] Invalid timestamp at index ${index}:`, item);
                  return null;
                }
                
                // reactionValueを数値に変換（NaNの場合は0）
                const reactionValue = typeof item.rv === 'number' ? (isNaN(item.rv) ? 0 : item.rv) :
                                     typeof item.reactionValue === 'number' ? (isNaN(item.reactionValue) ? 0 : item.reactionValue) :
                                     typeof item.rv === 'string' ? parseFloat(item.rv) || 0 :
                                     typeof item.reactionValue === 'string' ? parseFloat(item.reactionValue) || 0 : 0;
                
                return {
                  timestamp,
                  word: item.w || item.word || '',
                  reactionTime: typeof item.rt === 'number' ? (isNaN(item.rt) ? 0 : item.rt) : 
                               typeof item.reactionTime === 'number' ? (isNaN(item.reactionTime) ? 0 : item.reactionTime) : 0,
                  hasResponse: item.hasResponse !== undefined ? item.hasResponse : true,
                  emotions: Array.isArray(item.em) ? item.em : (Array.isArray(item.emotions) ? item.emotions : []),
                  physiological: item.ph || item.physiological || { average: 0, max: 0, min: 0 },
                  reactionValue,
                  eventType: item.e || item.eventType || 'word_displayed',
                  metadata: item.m || item.metadata || { emotionCount: 0, physiologicalCount: 0 }
                }
              } catch (itemError) {
                console.warn(`[TimelineData] Error converting item at index ${index}:`, itemError, item)
                return null
              }
            }).filter((item: TimelineDataPoint | null): item is TimelineDataPoint => item !== null)
            
            const conversionMs = Math.round(performance.now() - conversionStart)
            const totalMs = Math.round(performance.now() - totalStart)
            const responseSizeKb = Math.round(JSON.stringify(result.data.timelineData).length / 1024)
            
            console.log('[TimelineData] Converted data count:', convertedData.length)
            console.log('[TimelineData] Converted data sample:', convertedData[0])
            console.log('[Performance] TimelineData: apiRequestMs=' + apiRequestMs + ', conversionMs=' + conversionMs + ', totalMs=' + totalMs + ', responseSizeKb=' + responseSizeKb)
            
            if (convertedData.length > 0) {
              setData(convertedData)
              setDebugInfo(prev => ({
                ...prev,
                dataPointCount: convertedData.length,
                dataConversionStatus: 'success',
                sessionDataStatus: result.data.metadata?.sessionEvents > 0 ? 'success' : 'not_available',
                emotionDataStatus: result.data.metadata?.emotionEntries > 0 ? 'success' : 'not_available',
                physiologicalDataStatus: result.data.metadata?.physiologicalEntries > 0 ? 'success' : 'not_available',
                sessionEventsCount: result.data.metadata?.sessionEvents,
                emotionEntriesCount: result.data.metadata?.emotionEntries,
                physiologicalEntriesCount: result.data.metadata?.physiologicalEntries,
                lastUpdateTime: Date.now(),
                performance: {
                  apiRequestMs,
                  dataConversionMs: conversionMs,
                  totalMs,
                  responseSizeKb
                }
              }))
              ok = true
            } else {
              const emptyError = 'Data conversion resulted in empty array'
              console.error('[TimelineData]', emptyError)
              setError(`データ変換に失敗しました: 変換後のデータが空です`)
              setData([])
              setDebugInfo(prev => ({
                ...prev,
                apiStatus: 'error',
                errors: [...prev.errors, emptyError],
                dataConversionStatus: 'error',
                dataPointCount: 0
              }))
              throw new Error(emptyError)
            }
            
            // エラー情報の処理
            if (Array.isArray(result.data.metadata?.errors) && result.data.metadata.errors.length > 0) {
              const errorMessages = result.data.metadata.errors.join('; ')
              setError(`警告: 一部データ取得に失敗しました: ${errorMessages}`)
              setDebugInfo(prev => ({
                ...prev,
                errors: [...prev.errors, ...result.data.metadata.errors]
              }))
            } else {
              setError(null)
            }
          } catch (convertErr) {
            conversionError = convertErr instanceof Error ? convertErr : new Error('Data conversion failed')
            console.error('[TimelineData] Data conversion error:', convertErr)
            throw conversionError
          }
        } else {
          const errorMsg = result?.error || 'API response not successful or no data'
          console.warn('[TimelineData]', errorMsg)
          setError(`データ取得に失敗しました: ${errorMsg}`)
          setData([])
          setDebugInfo(prev => ({
            ...prev,
            apiStatus: 'error',
            errors: [...prev.errors, errorMsg],
            dataConversionStatus: 'error',
            dataPointCount: 0
          }))
        }
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
        console.error('[TimelineData] API fetch error:', fetchError)
        setData([])
        setError(`データ取得に失敗しました: ${errorMsg}`)
        setDebugInfo(prev => ({
          ...prev,
          apiStatus: 'error',
          errors: [...prev.errors, `API Error: ${errorMsg}`],
          apiResponseReceived: false,
          dataPointCount: 0,
          dataConversionStatus: 'error'
        }))
      }

      // APIが成功しなかった場合の最終チェック（エラーが設定されていない場合）
      if (!ok && !error) {
        setData([])
        setError('データが取得できませんでした。APIがエラーを返すか、データが空です。')
        setDebugInfo(prev => ({
          ...prev,
          dataPointCount: 0,
          dataConversionStatus: 'error'
        }))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[TimelineData] Fatal error:', err)
      setError(`致命的なエラーが発生しました: ${errorMsg}`)
      setData([])
      setDebugInfo(prev => ({
        ...prev,
        apiStatus: 'error',
        errors: [...prev.errors, `Fatal Error: ${errorMsg}`],
        dataConversionStatus: 'error',
        dataPointCount: 0
      }))
    } finally {
      setLoading(false)
      setDebugInfo(prev => ({
        ...prev,
        apiStatus: prev.apiStatus === 'loading' ? 'idle' : prev.apiStatus
      }))
    }
  }, [participantId])

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
    refetchData: fetchTimelineData,
    debugInfo
  }
}

// Merkle DAG: timeline.hooks.data -> implementation_complete
// 時系列データの取得と状態管理フックの実装完了
