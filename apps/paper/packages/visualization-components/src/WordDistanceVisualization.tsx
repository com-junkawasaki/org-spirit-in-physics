import React, { useMemo } from 'react'

// Merkle DAG: components.react.word_distance_visualization
// Word distance visualization component for research app

import type { WordDistancePair } from './timeline/types'

interface WordDistanceVisualizationProps {
  distances: WordDistancePair[]
  width?: number
  height?: number
  topK?: number
}

export default function WordDistanceVisualization({
  distances,
  width = 1000,
  height = 600,
  topK = 20
}: WordDistanceVisualizationProps) {
  const topDistances = useMemo(() => {
    return [...distances]
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .slice(0, topK)
  }, [distances, topK])

  if (topDistances.length === 0) {
    return (
      <div className="flex items-center justify-center border rounded-lg" style={{ width, height }}>
        <div className="text-gray-500">No distance data available</div>
      </div>
    )
  }

  const maxDistance = Math.max(...topDistances.map(d => d.totalDistance))

  return (
    <div className="border rounded-lg p-4 bg-white" style={{ width, height }}>
      <h3 className="text-lg font-semibold mb-4">Word Distance Visualization (Top {topK})</h3>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: height - 80 }}>
        {topDistances.map((pair, index) => {
          const barWidth = (pair.totalDistance / maxDistance) * 100

          return (
            <div key={index} className="border rounded p-2 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">
                  {pair.word1} ↔ {pair.word2}
                </span>
                <span className="text-xs text-gray-500">
                  {pair.totalDistance.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-semibold">Emotion:</span> {pair.emotionDistance.toFixed(3)}
                </div>
                <div>
                  <span className="font-semibold">Reaction Value:</span> {pair.reactionValueDistance.toFixed(3)}
                </div>
                <div>
                  <span className="font-semibold">Reaction Time:</span> {pair.reactionTimeDistance.toFixed(3)}
                </div>
                <div>
                  <span className="font-semibold">Physiological:</span> {pair.physiologicalDistance.toFixed(3)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

