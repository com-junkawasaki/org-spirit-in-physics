// WebSocket utilities for real-time communication

export interface WebSocketMessage {
  type: string
  payload?: unknown
}

export interface ImportStatusUpdate {
  type: string
  timestamp: string
  data?: {
    statuses?: unknown[]
    summary?: unknown
  }
  message?: string
}

type EventCallback = (data: ImportStatusUpdate) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventListeners: Map<string, EventCallback[]> = new Map()

  constructor(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.emit('connected', { type: 'connected', timestamp: new Date().toISOString() })
          resolve()
        }

        this.ws.onerror = (error) => {
          this.emit('error', { type: 'error', timestamp: new Date().toISOString(), message: 'WebSocket error' })
          reject(error)
        }

        this.ws.onclose = () => {
          this.emit('disconnected', { type: 'disconnected', timestamp: new Date().toISOString() })
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              this.connect().catch(console.error)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ImportStatusUpdate
            if (message.type) {
              this.emit(message.type, message)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private emit(event: string, data: ImportStatusUpdate): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(callback => callback(data))
  }

  on(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.push(callback)
    this.eventListeners.set(event, listeners)
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || []
    const filtered = listeners.filter(cb => cb !== callback)
    if (filtered.length === 0) {
      this.eventListeners.delete(event)
    } else {
      this.eventListeners.set(event, filtered)
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

// Singleton instance for the default WebSocket client
let defaultClient: WebSocketClient | null = null

export function getWebSocketClient(url?: string): WebSocketClient {
  if (!defaultClient) {
    const wsUrl = url || (typeof window !== 'undefined' 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws')
    defaultClient = new WebSocketClient(wsUrl)
    defaultClient.connect().catch(console.error)
  }
  return defaultClient
}

// Export a factory function for creating WebSocket clients
export function createWebSocketClient(url: string): WebSocketClient {
  return new WebSocketClient(url)
}

