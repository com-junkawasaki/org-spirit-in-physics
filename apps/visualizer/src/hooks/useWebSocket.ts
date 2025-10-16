// Merkle DAG: use_websocket -> client_websocket_hook
// WebSocket React Hook - リアルタイムデータ更新

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { WebSocketMessage } from '@/lib/websocket-manager'

interface UseWebSocketOptions {
  connectionId?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  connectionId: string | null
  lastMessage: WebSocketMessage | null
  error: string | null
  sendMessage: (message: any) => void
  subscribe: (topics: string[]) => void
  unsubscribe: (topics: string[]) => void
  connect: () => void
  disconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    connectionId: providedConnectionId,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const subscriptionsRef = useRef<Set<string>>(new Set())

  // Merkle DAG: use_websocket.connect -> websocket_connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const id = providedConnectionId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const wsUrl = `ws://localhost:3000/api/ws?connectionId=${id}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected:', id)
        setIsConnected(true)
        setConnectionId(id)
        setError(null)
        reconnectAttemptsRef.current = 0

        // 既存のサブスクリプションを再送信
        if (subscriptionsRef.current.size > 0) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            data: { topics: Array.from(subscriptionsRef.current) }
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // 特定のメッセージタイプに対する処理
          switch (message.type) {
            case 'connection_established':
              console.log('Connection established:', message.data)
              break
            case 'subscription_confirmed':
              console.log('Subscriptions confirmed:', message.data.topics)
              break
            case 'error':
              setError(message.data.message)
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
          setError('Failed to parse message')
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // 自動再接続
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          setError('Max reconnection attempts reached')
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setError('Failed to create connection')
    }
  }, [providedConnectionId, reconnectInterval, maxReconnectAttempts])

  // Merkle DAG: use_websocket.disconnect -> websocket_disconnection
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setConnectionId(null)
    reconnectAttemptsRef.current = maxReconnectAttempts // 再接続を停止
  }, [maxReconnectAttempts])

  // Merkle DAG: use_websocket.send_message -> message_sending
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
      setError('WebSocket is not connected')
    }
  }, [])

  // Merkle DAG: use_websocket.subscribe -> topic_subscription
  const subscribe = useCallback((topics: string[]) => {
    topics.forEach(topic => subscriptionsRef.current.add(topic))
    
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        data: { topics }
      })
    }
  }, [isConnected, sendMessage])

  // Merkle DAG: use_websocket.unsubscribe -> topic_unsubscription
  const unsubscribe = useCallback((topics: string[]) => {
    topics.forEach(topic => subscriptionsRef.current.delete(topic))
    
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe',
        data: { topics }
      })
    }
  }, [isConnected, sendMessage])

  // Merkle DAG: use_websocket.effect -> lifecycle_management
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  // Merkle DAG: use_websocket.cleanup -> resource_cleanup
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    connectionId,
    lastMessage,
    error,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  }
}
