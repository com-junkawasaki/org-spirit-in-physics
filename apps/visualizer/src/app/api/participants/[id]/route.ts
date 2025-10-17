import { NextRequest, NextResponse } from 'next/server'
import { getParticipantData } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('API: Fetching participant:', id)

    const participant = await getParticipantData(id)

    if (!participant) {
      console.log('API: Participant not found:', id)
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    console.log('API: Found participant:', participant.name || 'No name')
    return NextResponse.json(participant)
  } catch (error) {
    console.error('API: Failed to fetch participant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant', details: error.message },
      { status: 500 }
    )
  }
}
