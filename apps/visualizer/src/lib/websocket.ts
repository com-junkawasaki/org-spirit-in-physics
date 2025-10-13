/**
 * WebSocket client for real-time import status updates
 * Merkle DAG: WebSocket接続によるリアルタイム更新
 */

export interface ImportStatusUpdate {
  type: 'initial_status' | 'status_update' | 'status_response' | 'subscription_confirmed' | 'error' | 'pong'
  data?: {
    summary: {
      total_participants: number
      by_status: Record<string, number>
    }
    statuses: Array<{
      participant_id: string
      status: string
      import_type: string
      imported_at?: string
      last_updated: string
      data_sources: string[]
      records_count: {
        sessions: number
        responses: number
        hume_data: number
        physiological_data: number
      }
      error_message?: string
      metadata: Record<string, any>
    }>
  }
  message?: string
  participant_id?: string
  timestamp: string
}

export class ImportStatusWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 10
  private reconnectAttempts: number = 0
  private isConnecting: boolean = false
  private listeners: Map<string, Set<(data: ImportStatusUpdate) => void>> = new Map()
  private pingInterval: NodeJS.Timeout | null = null

  constructor(private url: string = 'ws://localhost:8002') {
    this.connect()
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true
    console.log(`Connecting to WebSocket: ${this.url}`)

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startPing()
        this.emit('connected', { type: 'connected', timestamp: new Date().toISOString() })
      }

      this.ws.onmessage = (event) => {
        try {
          const data: ImportStatusUpdate = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.stopPing()
        this.emit('disconnected', { type: 'disconnected', timestamp: new Date().toISOString() })
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.emit('error', { 
          type: 'error', 
          message: 'WebSocket connection error', 
          timestamp: new Date().toISOString() 
        })
      }

    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('max_reconnect_attempts', { 
        type: 'error', 
        message: 'Max reconnection attempts reached', 
        timestamp: new Date().toISOString() 
      })
      return
    }

    this.reconnectAttempts++
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.reconnectInterval}ms`)
    
    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private handleMessage(data: ImportStatusUpdate): void {
    console.log('Received WebSocket message:', data.type)
    
    switch (data.type) {
      case 'initial_status':
      case 'status_update':
        this.emit('status_update', data)
        break
      case 'status_response':
        this.emit('status_response', data)
        break
      case 'subscription_confirmed':
        this.emit('subscription_confirmed', data)
        break
      case 'pong':
        // Handle pong response
        break
      case 'error':
        console.error('WebSocket server error:', data.message)
        this.emit('error', data)
        break
      default:
        console.warn('Unknown message type:', data.type)
    }
  }

  private emit(event: string, data: ImportStatusUpdate): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in event listener:', error)
        }
      })
    }
  }

  public on(event: string, listener: (data: ImportStatusUpdate) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  public off(event: string, listener: (data: ImportStatusUpdate) => void): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  public send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  public subscribeToParticipant(participantId: string): void {
    this.send({
      type: 'subscribe_participant',
      participant_id: participantId
    })
  }

  public requestStatus(): void {
    this.send({ type: 'get_status' })
  }

  public disconnect(): void {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  public getConnectionState(): string {
    if (!this.ws) return 'CLOSED'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'OPEN'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'CLOSED'
      default:
        return 'UNKNOWN'
    }
  }
}

// Singleton instance
let wsClient: ImportStatusWebSocketClient | null = null

export function getWebSocketClient(): ImportStatusWebSocketClient {
  if (!wsClient) {
    wsClient = new ImportStatusWebSocketClient()
  }
  return wsClient
}

export function disconnectWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}
