// Merkle DAG: websocket_manager -> realtime_data_updates
// WebSocket管理システム - リアルタイムデータ更新

import { EventEmitter } from 'events'

export interface WebSocketMessage {
  type: 'experiment_update' | 'session_update' | 'participant_update' | 'analysis_complete' | 'error'
  data: any
  timestamp: string
  experimentId?: string
  sessionId?: string
  participantId?: string
}

export interface WebSocketConnection {
  id: string
  socket: WebSocket
  subscriptions: Set<string>
  lastPing: number
  isAlive: boolean
}

export class WebSocketManager extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30秒
  private readonly PING_TIMEOUT = 10000 // 10秒

  constructor() {
    super()
    this.startHeartbeat()
  }

  // Merkle DAG: websocket_manager.add_connection -> connection_management
  addConnection(connectionId: string, socket: WebSocket): void {
    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      subscriptions: new Set(),
      lastPing: Date.now(),
      isAlive: true
    }

    this.connections.set(connectionId, connection)

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(connectionId, message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
        this.sendError(connectionId, 'Invalid message format')
      }
    })

    socket.on('close', () => {
      this.removeConnection(connectionId)
    })

    socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.removeConnection(connectionId)
    })

    // 接続確認メッセージを送信
    this.sendMessage(connectionId, {
      type: 'connection_established',
      data: { connectionId },
      timestamp: new Date().toISOString()
    })

    console.log(`WebSocket connection added: ${connectionId}`)
  }

  // Merkle DAG: websocket_manager.remove_connection -> connection_cleanup
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.socket.close()
      this.connections.delete(connectionId)
      console.log(`WebSocket connection removed: ${connectionId}`)
    }
  }

  // Merkle DAG: websocket_manager.handle_message -> message_processing
  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    switch (message.type) {
      case 'ping':
        connection.lastPing = Date.now()
        connection.isAlive = true
        this.sendMessage(connectionId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        })
        break

      case 'subscribe':
        if (message.data && message.data.topics) {
          message.data.topics.forEach((topic: string) => {
            connection.subscriptions.add(topic)
          })
          this.sendMessage(connectionId, {
            type: 'subscription_confirmed',
            data: { topics: Array.from(connection.subscriptions) },
            timestamp: new Date().toISOString()
          })
        }
        break

      case 'unsubscribe':
        if (message.data && message.data.topics) {
          message.data.topics.forEach((topic: string) => {
            connection.subscriptions.delete(topic)
          })
          this.sendMessage(connectionId, {
            type: 'unsubscription_confirmed',
            data: { topics: Array.from(connection.subscriptions) },
            timestamp: new Date().toISOString()
          })
        }
        break

      case 'get_status':
        this.sendMessage(connectionId, {
          type: 'status',
          data: {
            connectionId,
            subscriptions: Array.from(connection.subscriptions),
            uptime: Date.now() - connection.lastPing,
            totalConnections: this.connections.size
          },
          timestamp: new Date().toISOString()
        })
        break

      default:
        console.warn(`Unknown message type: ${message.type}`)
    }
  }

  // Merkle DAG: websocket_manager.send_message -> message_broadcasting
  sendMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      connection.socket.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      this.removeConnection(connectionId)
    }
  }

  // Merkle DAG: websocket_manager.broadcast -> topic_based_broadcasting
  broadcast(topic: string, message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    }

    this.connections.forEach((connection, connectionId) => {
      if (connection.subscriptions.has(topic) || connection.subscriptions.has('*')) {
        this.sendMessage(connectionId, fullMessage)
      }
    })
  }

  // Merkle DAG: websocket_manager.send_error -> error_handling
  private sendError(connectionId: string, errorMessage: string): void {
    this.sendMessage(connectionId, {
      type: 'error',
      data: { message: errorMessage },
      timestamp: new Date().toISOString()
    })
  }

  // Merkle DAG: websocket_manager.start_heartbeat -> connection_health_monitoring
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        if (!connection.isAlive) {
          console.log(`Terminating inactive connection: ${connectionId}`)
          this.removeConnection(connectionId)
          return
        }

        connection.isAlive = false
        this.sendMessage(connectionId, {
          type: 'ping',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        })
      })
    }, this.HEARTBEAT_INTERVAL)
  }

  // Merkle DAG: websocket_manager.stop_heartbeat -> cleanup
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Merkle DAG: websocket_manager.get_connections -> connection_status
  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values())
  }

  // Merkle DAG: websocket_manager.get_connection_count -> monitoring
  getConnectionCount(): number {
    return this.connections.size
  }

  // Merkle DAG: websocket_manager.cleanup -> resource_cleanup
  cleanup(): void {
    this.stopHeartbeat()
    this.connections.forEach((connection) => {
      connection.socket.close()
    })
    this.connections.clear()
  }
}

// Merkle DAG: websocket_manager_singleton -> unified_websocket_management
// シングルトンインスタンス
let websocketManagerInstance: WebSocketManager | null = null

export function getWebSocketManager(): WebSocketManager {
  if (!websocketManagerInstance) {
    websocketManagerInstance = new WebSocketManager()
  }
  return websocketManagerInstance
}
