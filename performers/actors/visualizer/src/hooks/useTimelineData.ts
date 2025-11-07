import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import * as d3 from 'd3'
import type {
  TimelineDataPoint,
  TimelineVisualizationProps,
  FilterSettings,
  TimeRange,
  DebugInfo
} from '../types'
import { ParticipantTimelineDocument, ParticipantWord2VecDocument } from '@/generated/graphql'

// Merkle DAG: timeline.hooks.data
// 時系列データの取得と状態管理フック

export function useTimelineData({ participantId }: Pick<TimelineVisualizationProps, 'participantId'>) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TimelineDataPoint[]>([])
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

  // Use Apollo Client query
  const { loading, data: queryData, error: queryError, refetch } = useQuery(ParticipantTimelineDocument, {
    variables: { participantId },
    client: apolloClient,
    skip: !participantId || !mounted,
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

  // Handle GraphQL query results
  useEffect(() => {
    if (queryError) {
      const errorMsg = queryError.message || 'GraphQL query error'
      console.error('[TimelineData] GraphQL error:', queryError)
      setError(`データ取得に失敗しました: ${errorMsg}`)
      setData([])
      setDebugInfo(prev => ({
        ...prev,
        apiStatus: 'error',
        errors: [errorMsg],
        apiResponseReceived: true,
        dataPointCount: 0,
        dataConversionStatus: 'error'
      }))
      return
    }

    if (queryData?.participantTimeline) {
      const timelineResponse = queryData.participantTimeline
      console.log('[TimelineData] GraphQL result:', {
        timelineDataLength: timelineResponse.timelineData?.length,
        metadata: timelineResponse.metadata
      })

      setDebugInfo(prev => ({
        ...prev,
        apiResponseReceived: true,
        apiStatus: 'success',
        responseMetadata: timelineResponse.metadata,
      }))

      if (timelineResponse.timelineData && timelineResponse.timelineData.length > 0) {
        console.log('[TimelineData] Converting data, count:', timelineResponse.timelineData.length)

        // GraphQL response is already in the correct format
        const convertedData: TimelineDataPoint[] = timelineResponse.timelineData.map((item: any, index: number) => {
          try {
            return {
              timestamp: item.timestamp,
              word: item.word,
              reactionTime: item.reactionTime,
              hasResponse: item.hasResponse,
              emotions: item.emotions || [],
              physiological: item.physiological || { average: 0, max: 0, min: 0 },
              reactionValue: item.reactionValue,
              eventType: item.eventType,
              metadata: item.metadata || { emotionCount: 0, physiologicalCount: 0 }
            }
          } catch (itemError) {
            console.warn(`[TimelineData] Error converting item at index ${index}:`, itemError, item)
            return null
          }
        }).filter((item: TimelineDataPoint | null): item is TimelineDataPoint => item !== null)

        console.log('[TimelineData] Converted data count:', convertedData.length)
        console.log('[TimelineData] Converted data sample:', convertedData[0])

        if (convertedData.length > 0) {
          setData(convertedData)
          setDebugInfo(prev => ({
            ...prev,
            dataPointCount: convertedData.length,
            dataConversionStatus: 'success',
            sessionDataStatus: timelineResponse.metadata?.sessionEvents > 0 ? 'success' : 'not_available',
            emotionDataStatus: timelineResponse.metadata?.emotionEntries > 0 ? 'success' : 'not_available',
            physiologicalDataStatus: timelineResponse.metadata?.physiologicalEntries > 0 ? 'success' : 'not_available',
            sessionEventsCount: timelineResponse.metadata?.sessionEvents,
            emotionEntriesCount: timelineResponse.metadata?.emotionEntries,
            physiologicalEntriesCount: timelineResponse.metadata?.physiologicalEntries,
            lastUpdateTime: Date.now()
          }))
          setError(null)
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
        }

        // Handle metadata errors
        if (timelineResponse.metadata?.errors && timelineResponse.metadata.errors.length > 0) {
          const errorMessages = timelineResponse.metadata.errors.join('; ')
          setError(`警告: 一部データ取得に失敗しました: ${errorMessages}`)
          setDebugInfo(prev => ({
            ...prev,
            errors: [...prev.errors, ...timelineResponse.metadata.errors]
          }))
        }
      } else {
        setError('データが取得できませんでした。APIがエラーを返すか、データが空です。')
        setData([])
        setDebugInfo(prev => ({
          ...prev,
          apiStatus: 'error',
          errors: ['No timeline data returned'],
          dataPointCount: 0,
          dataConversionStatus: 'error'
        }))
      }
    } else if (!loading && participantId && mounted) {
      // No data and not loading - this might be an error case
      setError('データが取得できませんでした。')
      setData([])
      setDebugInfo(prev => ({
        ...prev,
        apiStatus: 'error',
        errors: ['No data returned from GraphQL query'],
        dataPointCount: 0,
        dataConversionStatus: 'error'
      }))
    }
  }, [queryData, queryError, loading, participantId, mounted])

  // GraphQL query for Word2Vec embeddings
  const { data: word2VecData } = useQuery(ParticipantWord2VecDocument, {
    variables: { participantId },
    client: apolloClient,
    skip: !participantId || !mounted,
  });

  // Handle Word2Vec data
  useEffect(() => {
    if (word2VecData?.participantWord2Vec?.wordData) {
      const wordData = word2VecData.participantWord2Vec.wordData;
      const embeddingsByWord: Record<string, number[]> = {};
      wordData.forEach((item: { word: string; embedding: number[] }) => {
        embeddingsByWord[item.word] = item.embedding;
      });
      setEmbeddingsByWord(embeddingsByWord);
    }
  }, [word2VecData]);

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

  // Data fetching is handled by useQuery hooks above
  // No need for manual fetch functions

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
    refetchData: refetch,
    debugInfo
  }
}

// Merkle DAG: timeline.hooks.data -> implementation_complete
// 時系列データの取得と状態管理フックの実装完了

