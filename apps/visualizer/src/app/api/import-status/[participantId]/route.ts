import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params
    
    // Merkle DAG: Import status API - 特定の参加者のimport状況を取得
    const response = await fetch(`http://localhost:8001/import-status/${participantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Import status not found' },
          { status: 404 }
        )
      }
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params
    const body = await request.json()
    
    // Merkle DAG: Import status API - 参加者のimport状況を更新
    const response = await fetch(`http://localhost:8001/import-status/${participantId}`, {
      method: 'PUT',
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
    console.error('Error updating import status:', error)
    return NextResponse.json(
      { error: 'Failed to update import status' },
      { status: 500 }
    )
  }
}
