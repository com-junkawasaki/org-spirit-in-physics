// Merkle DAG: websocket_api -> websocket_endpoint
// WebSocket APIエンドポイント - リアルタイムデータ更新

import { NextRequest } from 'next/server'
import { getWebSocketManager } from '@/lib/websocket-manager'

export async function GET(request: NextRequest) {
  // WebSocket接続のアップグレード
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId') || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // WebSocket接続を確立
    const ws = new WebSocket(`ws://localhost:3000/api/ws?connectionId=${connectionId}`)
    
    const websocketManager = getWebSocketManager()
    websocketManager.addConnection(connectionId, ws)

    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': 'websocket'
      }
    })
  } catch (error) {
    console.error('WebSocket connection failed:', error)
    return new Response('WebSocket connection failed', { status: 500 })
  }
}
