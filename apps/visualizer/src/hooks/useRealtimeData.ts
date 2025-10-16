// Merkle DAG: use_realtime_data -> realtime_data_hook
// リアルタイムデータ管理Hook - WebSocketとの連携

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import { WebSocketMessage } from '@/lib/websocket-manager'

interface RealtimeDataOptions {
  experimentId?: string
  sessionId?: string
  participantId?: string
  topics?: string[]
  autoSubscribe?: boolean
}

interface RealtimeDataReturn<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  isConnected: boolean
  refresh: () => void
}

// Merkle DAG: use_realtime_data.experiment -> experiment_realtime_hook
export function useRealtimeExperiment(experimentId: string): RealtimeDataReturn {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const dataRef = useRef<any>(null)

  const { isConnected, lastMessage, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  })

  // Merkle DAG: use_realtime_data.fetch_experiment -> data_fetching
  const fetchExperimentData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/experiments/${experimentId}?include=basic,sessions,participants,analysis`)
      if (!response.ok) {
        throw new Error(`Failed to fetch experiment: ${response.statusText}`)
      }

      const experimentData = await response.json()
      setData(experimentData)
      dataRef.current = experimentData
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch experiment data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [experimentId])

  // Merkle DAG: use_realtime_data.handle_message -> message_handling
  const handleRealtimeMessage = useCallback((message: WebSocketMessage) => {
    if (message.experimentId === experimentId) {
      switch (message.type) {
        case 'experiment_update':
          // 実験データの更新
          if (dataRef.current) {
            const updatedData = { ...dataRef.current, ...message.data }
            setData(updatedData)
            dataRef.current = updatedData
            setLastUpdate(new Date())
          }
          break

        case 'session_update':
          // セッションデータの更新
          if (dataRef.current && dataRef.current.sessions) {
            const updatedSessions = dataRef.current.sessions.map((session: any) =>
              session.id === message.sessionId ? { ...session, ...message.data } : session
            )
            const updatedData = { ...dataRef.current, sessions: updatedSessions }
            setData(updatedData)
            dataRef.current = updatedData
            setLastUpdate(new Date())
          }
          break

        case 'analysis_complete':
          // 分析完了の通知
          fetchExperimentData() // データを再取得
          break
      }
    }
  }, [experimentId, fetchExperimentData])

  // Merkle DAG: use_realtime_data.effect -> lifecycle_management
  useEffect(() => {
    fetchExperimentData()
  }, [fetchExperimentData])

  // Merkle DAG: use_realtime_data.subscription -> websocket_subscription
  useEffect(() => {
    if (isConnected) {
      subscribe([`experiment:${experimentId}`, `experiment:${experimentId}:sessions`, `experiment:${experimentId}:analysis`])
    }

    return () => {
      unsubscribe([`experiment:${experimentId}`, `experiment:${experimentId}:sessions`, `experiment:${experimentId}:analysis`])
    }
  }, [isConnected, experimentId, subscribe, unsubscribe])

  // Merkle DAG: use_realtime_data.message_effect -> message_processing
  useEffect(() => {
    if (lastMessage) {
      handleRealtimeMessage(lastMessage)
    }
  }, [lastMessage, handleRealtimeMessage])

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    refresh: fetchExperimentData
  }
}

// Merkle DAG: use_realtime_data.sessions -> sessions_realtime_hook
export function useRealtimeSessions(experimentId: string): RealtimeDataReturn {
  const [sessions, setSessions] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const sessionsRef = useRef<any>(null)

  const { isConnected, lastMessage, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  })

  const fetchSessionsData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/experiments/${experimentId}/sessions`)
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`)
      }

      const sessionsData = await response.json()
      setSessions(sessionsData)
      sessionsRef.current = sessionsData
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch sessions data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [experimentId])

  const handleRealtimeMessage = useCallback((message: WebSocketMessage) => {
    if (message.experimentId === experimentId && message.type === 'session_update') {
      if (sessionsRef.current && sessionsRef.current.sessions) {
        const updatedSessions = sessionsRef.current.sessions.map((session: any) =>
          session.id === message.sessionId ? { ...session, ...message.data } : session
        )
        const updatedData = { ...sessionsRef.current, sessions: updatedSessions }
        setSessions(updatedData)
        sessionsRef.current = updatedData
        setLastUpdate(new Date())
      }
    }
  }, [experimentId])

  useEffect(() => {
    fetchSessionsData()
  }, [fetchSessionsData])

  useEffect(() => {
    if (isConnected) {
      subscribe([`experiment:${experimentId}:sessions`])
    }

    return () => {
      unsubscribe([`experiment:${experimentId}:sessions`])
    }
  }, [isConnected, experimentId, subscribe, unsubscribe])

  useEffect(() => {
    if (lastMessage) {
      handleRealtimeMessage(lastMessage)
    }
  }, [lastMessage, handleRealtimeMessage])

  return {
    data: sessions,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    refresh: fetchSessionsData
  }
}

// Merkle DAG: use_realtime_data.analysis -> analysis_realtime_hook
export function useRealtimeAnalysis(experimentId: string): RealtimeDataReturn {
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const analysisRef = useRef<any>(null)

  const { isConnected, lastMessage, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  })

  const fetchAnalysisData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/experiments/${experimentId}/analysis`)
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis: ${response.statusText}`)
      }

      const analysisData = await response.json()
      setAnalysis(analysisData)
      analysisRef.current = analysisData
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch analysis data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [experimentId])

  const handleRealtimeMessage = useCallback((message: WebSocketMessage) => {
    if (message.experimentId === experimentId && message.type === 'analysis_complete') {
      fetchAnalysisData() // 分析完了時にデータを再取得
    }
  }, [experimentId, fetchAnalysisData])

  useEffect(() => {
    fetchAnalysisData()
  }, [fetchAnalysisData])

  useEffect(() => {
    if (isConnected) {
      subscribe([`experiment:${experimentId}:analysis`])
    }

    return () => {
      unsubscribe([`experiment:${experimentId}:analysis`])
    }
  }, [isConnected, experimentId, subscribe, unsubscribe])

  useEffect(() => {
    if (lastMessage) {
      handleRealtimeMessage(lastMessage)
    }
  }, [lastMessage, handleRealtimeMessage])

  return {
    data: analysis,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    refresh: fetchAnalysisData
  }
}
