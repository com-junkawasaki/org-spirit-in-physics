// Merkle DAG: components.structure_analysis
// Structure analysis panel component

import React from 'react'
import type { GapArea, DensityRegion, DuplicateCandidate } from '@spirit-in-physics/visualization-components'

interface StructureAnalysisProps {
  gapAreas: GapArea[]
  densityRegions: DensityRegion[]
  duplicates: DuplicateCandidate[]
  overallDensity: number
}

export default function StructureAnalysis({
  gapAreas,
  densityRegions,
  duplicates,
  overallDensity,
}: StructureAnalysisProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        構造分析
      </h3>

      {/* Overall density */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">全体密度</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {(overallDensity * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, overallDensity * 100)}%` }}
          />
        </div>
      </div>

      {/* Gap areas */}
      {gapAreas.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
            空白エリア ({gapAreas.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-auto">
            {gapAreas.slice(0, 5).map((gap) => (
              <div
                key={gap.id}
                className="text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  信頼度: {(gap.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  近接ノード: {gap.nearbyNodes.length}個
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Density regions */}
      {densityRegions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
            密度領域 ({densityRegions.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-auto">
            {densityRegions.slice(0, 5).map((region) => (
              <div
                key={region.id}
                className="text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {region.isOvercrowded ? '密集' : '分散'}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  ノード数: {region.nodeCount || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
            重複候補 ({duplicates.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-auto">
            {duplicates.slice(0, 5).map((dup) => (
              <div
                key={dup.id}
                className="text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {dup.word1} ↔ {dup.word2}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  類似度: {(dup.similarity * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gapAreas.length === 0 && densityRegions.length === 0 && duplicates.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          構造分析データがありません
        </p>
      )}
    </div>
  )
}

