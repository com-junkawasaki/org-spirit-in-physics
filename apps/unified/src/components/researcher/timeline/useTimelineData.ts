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

export function useTimelineData({ participantId, sessionId }: Pick<TimelineVisualizationProps, 'participantId' | 'sessionId'>) {
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
    // participantIdのバリデーション
    if (!participantId || typeof participantId !== 'string' || participantId.trim() === '') {
      setError('参加者IDが指定されていません')
      setLoading(false)
      console.error('TimelineVisualization: Invalid participantId:', participantId)
      return
    }

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 120000) // 120秒タイムアウト（大量データ対応）

    try {
      setLoading(true)
      setError(null)
      console.log('TimelineVisualization: Starting data fetch for participant:', participantId, sessionId ? `session: ${sessionId}` : '')
      
      // 実データのみを使用（APIから取得）
      // Note: _t parameter bypasses cache - only use for forced refresh
      const forceRefresh = false; // Set to true to bypass cache
      const baseUrl = sessionId 
        ? `/api/participants/${participantId}/timeline?sessionId=${encodeURIComponent(sessionId)}`
        : `/api/participants/${participantId}/timeline`
      const apiUrl = forceRefresh ? `${baseUrl}&_t=${Date.now()}` : baseUrl
      console.log('TimelineVisualization: API URL:', apiUrl, forceRefresh ? '(cache bypassed)' : '(cache enabled)')
      
      const fetchStartTime = Date.now()
      const response = await fetch(apiUrl, {
        cache: forceRefresh ? 'no-store' : 'default',
        signal: abortController.signal,
        headers: forceRefresh ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`TimelineVisualization: API response received in ${fetchDuration}ms, status:`, response.status)
      
      // レスポンスサイズのチェック
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const sizeMB = parseInt(contentLength, 10) / (1024 * 1024)
        console.log(`TimelineVisualization: Response size: ${sizeMB.toFixed(2)}MB`)
        if (sizeMB > 10) {
          console.warn(`TimelineVisualization: Large response detected (${sizeMB.toFixed(2)}MB), parsing may take time`)
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        throw new Error(`APIリクエストが失敗しました (ステータス: ${response.status}): ${errorText.substring(0, 200)}`)
      }
      
      // JSONパースを個別に処理
      let result: any
      const parseStartTime = Date.now()
      try {
        result = await response.json()
        const parseDuration = Date.now() - parseStartTime
        console.log(`TimelineVisualization: JSON parsed in ${parseDuration}ms`)
      } catch (parseError) {
        throw new Error(`レスポンスのJSONパースに失敗しました: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
      
      console.log('TimelineVisualization: API result:', result)
      
      // APIレスポンスのメタデータを詳細にログ出力
      if (result?.data?.metadata) {
        console.log('=== API Response Metadata ===')
        console.log('Session events:', result.data.metadata.sessionEvents)
        console.log('Emotion entries:', result.data.metadata.emotionEntries)
        console.log('Physiological entries:', result.data.metadata.physiologicalEntries)
        console.log('Total data points:', result.data.metadata.totalDataPoints)
        if (result.data.metadata.errors && result.data.metadata.errors.length > 0) {
          console.warn('API errors:', result.data.metadata.errors)
        }
      }
      
      if (result?.success && Array.isArray(result.data?.timelineData)) {
        console.log('TimelineVisualization: Converting data, count:', result.data.timelineData.length)
        
        // 生データのサンプルを確認（最初の5件）
        console.log('=== Raw API Data Sample (first 5) ===')
        result.data.timelineData.slice(0, 5).forEach((item: any, idx: number) => {
          const emRaw = item.em
          const emArray = Array.isArray(item.em) ? item.em : (Array.isArray(item.emotions) ? item.emotions : [])
          console.log(`[${idx}] Raw item:`, {
            timestamp: item.t || item.timestamp,
            word: item.w || item.word,
            emRaw: emRaw,
            emType: typeof emRaw,
            emIsArray: Array.isArray(emRaw),
            emLength: Array.isArray(emRaw) ? emRaw.length : 'N/A',
            emFirstItem: Array.isArray(emRaw) && emRaw.length > 0 ? emRaw[0] : null,
            emotionsArray: emArray,
            emotionsLength: emArray.length,
            metadata: item.m
          })
          
          // emフィールドの詳細を展開
          if (Array.isArray(emRaw) && emRaw.length > 0) {
            console.log(`  → em[0] details:`, emRaw[0])
            console.log(`  → em[0] keys:`, Object.keys(emRaw[0] || {}))
          } else if (emRaw && typeof emRaw === 'object') {
            console.log(`  → em (object) details:`, emRaw)
            console.log(`  → em (object) keys:`, Object.keys(emRaw))
          } else {
            console.log(`  → em is empty or invalid:`, emRaw)
          }
        })
        
        // 短縮フィールドをTimelineDataPoint形式に変換
        const convertedData = result.data.timelineData.map((item: any) => ({
          timestamp: item.ts || item.t || item.timestamp, // APIレスポンスは`ts`フィールドを使用
          word: item.w || item.word,
          reactionTime: item.rt ?? item.reactionTime ?? null, // 反応時間を正しく取得
          hasResponse: item.rt != null || item.reactionTime != null, // 反応時間が存在する場合はtrue
          emotions: Array.isArray(item.em) 
            ? item.em.map((e: any) => ({
                // 短縮形式（n, s, t）を展開形式（name, score, fileType）に変換
                name: e.n || e.name || '',
                score: typeof e.s === 'number' ? e.s : (typeof e.score === 'number' ? e.score : 0),
                fileType: e.t || e.fileType || e.file_type || ''
              }))
            : (Array.isArray(item.emotions) 
                ? item.emotions.map((e: any) => ({
                    name: e.name || '',
                    score: typeof e.score === 'number' ? e.score : 0,
                    fileType: e.fileType || e.file_type || ''
                  }))
                : []),
          physiological: item.ph || item.physiological || { average: 0, max: 0, min: 0 },
          reactionValue: item.rv || item.reactionValue || 0,
          eventType: item.e || item.eventType,
          metadata: item.md || item.m || item.metadata || { emotionCount: 0, physiologicalCount: 0 }
        }))
        
        // 変換後のデータの統計情報
        console.log('=== Converted Data Statistics ===')
        const totalPoints = convertedData.length
        const pointsWithEmotions = convertedData.filter((d: TimelineDataPoint) => d.emotions && d.emotions.length > 0)
        const pointsWithPhysiological = convertedData.filter((d: TimelineDataPoint) => {
          const ph = d.physiological
          if (!ph || Array.isArray(ph)) return false
          const phObj = ph as { average?: number; max?: number; min?: number }
          return (phObj.average ?? 0) > 0 || (phObj.max ?? 0) > 0
        })
        const pointsWithReactionTime = convertedData.filter((d: TimelineDataPoint) => d.reactionTime != null)
        
        // タイムスタンプ範囲を確認
        const timestamps = convertedData.map((d: TimelineDataPoint) => d.timestamp).filter((ts: number | null | undefined): ts is number => typeof ts === 'number')
        const timeExtentRaw = timestamps.length > 0 ? d3.extent(timestamps) : null
        const timeExtent = timeExtentRaw && timeExtentRaw[0] != null && timeExtentRaw[1] != null
          ? [timeExtentRaw[0] as unknown as number, timeExtentRaw[1] as unknown as number] as [number, number]
          : null
        const startTime = timeExtent ? new Date(timeExtent[0]).toISOString() : 'N/A'
        const endTime = timeExtent ? new Date(timeExtent[1]).toISOString() : 'N/A'
        const durationHours = timeExtent ? (timeExtent[1] - timeExtent[0]) / (1000 * 60 * 60) : 0
        
        console.log(`Total data points: ${totalPoints}`)
        console.log(`Time range: ${startTime} to ${endTime} (${durationHours.toFixed(2)} hours)`)
        console.log(`Points with emotions: ${pointsWithEmotions.length} (${((pointsWithEmotions.length / totalPoints) * 100).toFixed(1)}%)`)
        console.log(`Points with physiological: ${pointsWithPhysiological.length} (${((pointsWithPhysiological.length / totalPoints) * 100).toFixed(1)}%)`)
        console.log(`Points with reaction time: ${pointsWithReactionTime.length} (${((pointsWithReactionTime.length / totalPoints) * 100).toFixed(1)}%)`)
        
        // LIMIT 20000に達しているか確認
        if (totalPoints >= 20000) {
          console.warn('⚠️ WARNING: Data points reached LIMIT 20000. Some data may be missing!')
        }
        
        // 感情データの詳細分析
        if (pointsWithEmotions.length > 0) {
          console.log('=== Emotion Data Analysis ===')
          const emotionDataSample = pointsWithEmotions[0]
          console.log('First point with emotions:', {
            word: emotionDataSample.word,
            timestamp: emotionDataSample.timestamp,
            emotionsCount: emotionDataSample.emotions.length,
            emotions: emotionDataSample.emotions,
            allFileTypes: [...new Set(emotionDataSample.emotions.map((e: any) => e.fileType || 'unknown'))]
          })
          
          // 感情タイプ別の統計
          const emotionTypeCounts: Record<string, number> = {}
          pointsWithEmotions.forEach((point: TimelineDataPoint) => {
            point.emotions.forEach((e: any) => {
              const fileType = e.fileType || 'unknown'
              emotionTypeCounts[fileType] = (emotionTypeCounts[fileType] || 0) + 1
            })
          })
          console.log('Emotion type distribution:', emotionTypeCounts)
          
          // 感情名の分布
          const emotionNameCounts: Record<string, number> = {}
          pointsWithEmotions.forEach((point: TimelineDataPoint) => {
            point.emotions.forEach((e: any) => {
              const name = e.name || 'unknown'
              emotionNameCounts[name] = (emotionNameCounts[name] || 0) + 1
            })
          })
          console.log('Emotion name distribution:', emotionNameCounts)
        } else {
          console.warn('=== ⚠️ NO EMOTION DATA FOUND ===')
          console.warn('All converted data points have empty emotions array')
          
          // 最初の5件の詳細を確認
          console.log('First 5 converted data points:', convertedData.slice(0, 5).map((d: any, idx: number) => ({
            index: idx,
            word: d.word,
            timestamp: d.timestamp,
            emotions: d.emotions,
            emotionsLength: d.emotions?.length || 0,
            emotionsType: Array.isArray(d.emotions) ? 'array' : typeof d.emotions,
            metadata: d.metadata
          })))
          
          // 生データの感情部分を確認（詳細版）
          console.log('=== Raw Emotion Data from API (first 10) ===')
          result.data.timelineData.slice(0, 10).forEach((item: any, idx: number) => {
            const emRaw = item.em
            console.log(`[${idx}] Word: "${item.w || item.word}"`, {
              emRaw: emRaw,
              emType: typeof emRaw,
              emIsArray: Array.isArray(emRaw),
              emLength: Array.isArray(emRaw) ? emRaw.length : 'N/A',
              emValue: emRaw,
              emotionsRaw: item.emotions,
              metadata: item.m
            })
            
            // emフィールドが配列で中身がある場合、最初の要素を詳細表示
            if (Array.isArray(emRaw) && emRaw.length > 0) {
              console.log(`  → First emotion in em array:`, emRaw[0])
              console.log(`  → First emotion keys:`, Object.keys(emRaw[0] || {}))
              console.log(`  → First emotion has fileType:`, 'fileType' in (emRaw[0] || {}))
              console.log(`  → First emotion has name:`, 'name' in (emRaw[0] || {}))
              console.log(`  → First emotion has score:`, 'score' in (emRaw[0] || {}))
            } else if (emRaw && typeof emRaw === 'object' && !Array.isArray(emRaw)) {
              console.log(`  → em is object (not array):`, emRaw)
              console.log(`  → em object keys:`, Object.keys(emRaw))
            } else {
              console.log(`  → ⚠️ em is empty, null, or invalid type`)
            }
          })
          
          // 全体の統計
          const totalEmFields = result.data.timelineData.length
          const emFieldsWithData = result.data.timelineData.filter((item: any) => {
            const em = item.em
            return Array.isArray(em) && em.length > 0
          }).length
          console.log(`=== Emotion Data Summary ===`)
          console.log(`Total data points: ${totalEmFields}`)
          console.log(`Points with emotion data in em field: ${emFieldsWithData} (${((emFieldsWithData / totalEmFields) * 100).toFixed(1)}%)`)
          
          // emフィールドにデータがある最初の5件を詳細表示
          const itemsWithEmData = result.data.timelineData.filter((item: any) => {
            const em = item.em
            return Array.isArray(em) && em.length > 0
          }).slice(0, 5)
          
          if (itemsWithEmData.length > 0) {
            console.log(`=== Sample Items WITH Emotion Data ===`)
            itemsWithEmData.forEach((item: any, idx: number) => {
              console.log(`[${idx}] Word: "${item.w || item.word}"`, {
                emLength: item.em.length,
                emData: item.em,
                firstEmotion: item.em[0]
              })
            })
          } else {
            console.warn(`⚠️ NO items found with emotion data in em field!`)
          }
        }
        
        console.log('TimelineVisualization: Converted data sample:', convertedData[0])
        setData(convertedData)
        
        if (Array.isArray(result.data.metadata?.errors) && result.data.metadata.errors.length > 0) {
          setError(`警告: 一部データ取得に失敗しました: ${result.data.metadata.errors.join('; ')}`)
        } else {
          setError(null)
        }
      } else {
        throw new Error('APIレスポンスが成功していないか、データがありません')
      }
    } catch (err) {
      // タイムアウトのクリーンアップ
      clearTimeout(timeoutId)
      
      // エラーの種類に応じて適切なメッセージを設定
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          setError('リクエストがタイムアウトしました（120秒）。データ量が多い可能性があります。しばらく待ってから再試行してください。')
          console.error('TimelineVisualization: Request timeout after 120 seconds')
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('ネットワークエラーが発生しました。インターネット接続を確認してください。')
          console.error('TimelineVisualization: Network error:', err)
        } else if (err.message.includes('JSON') || err.message.includes('パース')) {
          setError(`データの解析に失敗しました: ${err.message}`)
          console.error('TimelineVisualization: JSON parse error:', err)
        } else {
          setError(`データの取得に失敗しました: ${err.message}`)
          console.error('TimelineVisualization: Error:', err)
        }
      } else {
        setError('不明なエラーが発生しました')
        console.error('TimelineVisualization: Unknown error:', err)
      }
    } finally {
      clearTimeout(timeoutId)
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

  // 時間範囲を初期化（全範囲を表示）
  const initializeTimeRange = useCallback(() => {
    if (data.length === 0) return

    const timeExtent = d3.extent(data, d => d.timestamp) as [number, number]
    const initialRange = {
      start: timeExtent[0], // 開始時刻
      end: timeExtent[1]    // 終了時刻（全範囲）
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
