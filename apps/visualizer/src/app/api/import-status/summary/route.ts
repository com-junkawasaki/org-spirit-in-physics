import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Merkle DAG: Import status API - import状況のサマリーを取得
    const response = await fetch('http://localhost:8001/import-status/summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Import status API responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching import status summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import status summary' },
      { status: 500 }
    )
  }
}
