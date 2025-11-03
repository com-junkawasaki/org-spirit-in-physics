import { NextRequest, NextResponse } from 'next/server'
import { getResponseTimeseries } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: responseId } = await params
    const timeSeriesData = await getResponseTimeseries(responseId)

    // Process time series data for frontend
    const processedData = {
      timestamps: timeSeriesData.skinPotential.map(point => point.timestamp_offset_ms),
      skinPotential: timeSeriesData.skinPotential.map(point => point.value),
      emotions: timeSeriesData.emotions.reduce((acc, point) => {
        const existingPoint = acc.find(p => p.timestamp === point.timestamp_offset_ms)
        if (existingPoint) {
          existingPoint[point.emotion_type] = point.intensity
        } else {
          acc.push({
            timestamp: point.timestamp_offset_ms,
            [point.emotion_type]: point.intensity,
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0
          })
        }
        return acc
      }, [] as any[])
    }

    // Ensure all emotion types are present in each point
    processedData.emotions = processedData.emotions.map(point => ({
      timestamp: point.timestamp,
      joy: point.joy || 0,
      sadness: point.sadness || 0,
      anger: point.anger || 0,
      fear: point.fear || 0,
      surprise: point.surprise || 0
    }))

    return NextResponse.json(processedData)
  } catch (error) {
    console.error('Failed to fetch response time series:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch response time series',
        timestamps: [],
        skinPotential: [],
        emotions: []
      },
      { status: 500 }
    )
  }
}
