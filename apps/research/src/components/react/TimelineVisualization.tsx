'use client'

import React, { useMemo } from 'react'

// Merkle DAG: components.react.timeline_visualization
// Timeline visualization component for research app

export interface TimelineDataPoint {
  time: string
  word: string
  reactionTime?: number
  reactionValue?: number
  emotion?: Record<string, number>
  physiological?: number[]
}

interface TimelineVisualizationProps {
  data: TimelineDataPoint[]
  width?: number
  height?: number
}

export default function TimelineVisualization({
  data,
  width = 1000,
  height = 400
}: TimelineVisualizationProps) {
  const processedData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      timestamp: new Date(point.time).getTime(),
      index
    })).sort((a, b) => a.timestamp - b.timestamp)
  }, [data])

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center border rounded-lg" style={{ width, height }}>
        <div className="text-gray-500">No timeline data available</div>
      </div>
    )
  }

  const minTime = processedData[0]?.timestamp || 0
  const maxTime = processedData[processedData.length - 1]?.timestamp || 1
  const timeRange = maxTime - minTime || 1

  return (
    <div className="border rounded-lg p-4 bg-white" style={{ width, height }}>
      <h3 className="text-lg font-semibold mb-4">Timeline Visualization</h3>
      <svg width={width - 32} height={height - 80} className="border rounded">
        {processedData.map((point, index) => {
          const x = ((point.timestamp - minTime) / timeRange) * (width - 32)
          const y = height - 80 - 20

          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r={4}
                fill="#3b82f6"
                className="hover:fill-blue-600 cursor-pointer"
              />
              {point.reactionTime && (
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y - (point.reactionTime / 1000) * 10}
                  stroke="#ef4444"
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
              <text
                x={x}
                y={y + 15}
                fontSize="10"
                textAnchor="middle"
                className="fill-gray-600"
              >
                {point.word}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 text-xs text-gray-500">
        {processedData.length} data points | Time range: {new Date(minTime).toLocaleTimeString()} - {new Date(maxTime).toLocaleTimeString()}
      </div>
    </div>
  )
}

