import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Merkle DAG: Import status API - データベースからimport状況を取得
    const response = await fetch('http://localhost:8001/import-status', {
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
    console.error('Error fetching import status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Merkle DAG: Import status API - 新しいimport statusを作成
    const response = await fetch('http://localhost:8001/import-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Import status API responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating import status:', error)
    return NextResponse.json(
      { error: 'Failed to create import status' },
      { status: 500 }
    )
  }
}
