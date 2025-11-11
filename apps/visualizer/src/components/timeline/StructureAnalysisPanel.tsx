'use client'

import React from 'react'
import type { GapArea, DensityRegion, DuplicateCandidate, CommonFeatures } from '@/lib/structure-analysis'

// Merkle DAG: timeline.components.structure_analysis_panel
// 構造分析結果の表示パネルコンポーネント

interface StructureAnalysisPanelProps {
  gapAreas: GapArea[]
  densityRegions: DensityRegion[]
  duplicates: DuplicateCandidate[]
  overallDensity: number
  onGapAreaClick?: (gapArea: GapArea) => void
  onDensityRegionClick?: (region: DensityRegion) => void
  onDuplicateClick?: (duplicate: DuplicateCandidate) => void
}

export default function StructureAnalysisPanel({
  gapAreas,
  densityRegions,
  duplicates,
  overallDensity,
  onGapAreaClick,
  onDensityRegionClick,
  onDuplicateClick
}: StructureAnalysisPanelProps) {
  return (
    <div className="space-y-4">
      {/* 全体密度 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">全体密度</h4>
        <div className="text-xs text-gray-600">
          密度: {overallDensity.toFixed(4)}
        </div>
      </div>

      {/* 空白エリア */}
      {gapAreas.length > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-yellow-600">?</span>
            <span>空白エリア（{gapAreas.length}箇所）</span>
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            近接ノードの共通点を参考に、漏れた項目を発見できる可能性があります。
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {gapAreas.map((gap) => (
              <button
                key={gap.id}
                type="button"
                onClick={() => onGapAreaClick?.(gap)}
                className="w-full text-left p-2 bg-white rounded border border-yellow-300 hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    信頼度: {(gap.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    半径: {gap.radius.toFixed(0)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  近接ノード: {gap.nearbyNodes.length}個
                </div>
                {gap.nearbyNodes.length > 0 && (
                  <div className="text-xs text-gray-500 mb-1">
                    例: {gap.nearbyNodes.slice(0, 3).map(n => n.label).join(', ')}
                  </div>
                )}
                {gap.commonEmotionProfile && (
                  <div className="text-xs text-gray-500">
                    主要感情: {Object.entries(gap.commonEmotionProfile)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 2)
                      .map(([emotion, _]) => emotion)
                      .join(', ')}
                  </div>
                )}
                {gap.suggestedItems.length > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    推奨: {gap.suggestedItems[0]}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 密集領域 */}
      {densityRegions.filter(r => r.isOvercrowded).length > 0 && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-red-600">⚠</span>
            <span>密集領域（{densityRegions.filter(r => r.isOvercrowded).length}箇所）</span>
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            項目が密集しすぎている可能性があります。統合や分離を検討してください。
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {densityRegions
              .filter(r => r.isOvercrowded)
              .map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onDensityRegionClick?.(region)}
                  className="w-full text-left p-2 bg-white rounded border border-red-300 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-gray-800">
                      ノード数: {region.nodeCount}
                    </span>
                    <span className="text-xs text-gray-500">
                      密度: {region.density.toFixed(4)}
                    </span>
                  </div>
                  {region.suggestedSeparation && (
                    <div className="text-xs text-blue-600">
                      推奨分離距離: {region.suggestedSeparation.toFixed(0)}
                    </div>
                  )}
                  {region.nodes.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      例: {region.nodes.slice(0, 3).map(n => n.label).join(', ')}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 分散領域 */}
      {densityRegions.filter(r => !r.isOvercrowded).length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-blue-600">ℹ</span>
            <span>分散領域（{densityRegions.filter(r => !r.isOvercrowded).length}箇所）</span>
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            項目が分散しすぎている可能性があります。関連項目の統合を検討してください。
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {densityRegions
              .filter(r => !r.isOvercrowded)
              .map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onDensityRegionClick?.(region)}
                  className="w-full text-left p-2 bg-white rounded border border-blue-300 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-gray-800">
                      ノード数: {region.nodeCount}
                    </span>
                    <span className="text-xs text-gray-500">
                      密度: {region.density.toFixed(4)}
                    </span>
                  </div>
                  {region.nodes.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      例: {region.nodes.slice(0, 3).map(n => n.label).join(', ')}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 重複候補 */}
      {duplicates.length > 0 && (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-orange-600">🔄</span>
            <span>重複候補（{duplicates.length}組）</span>
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            類似度が高い項目です。統合を検討してください。
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {duplicates.map((dup) => (
              <button
                key={dup.id}
                type="button"
                onClick={() => onDuplicateClick?.(dup)}
                className="w-full text-left p-2 bg-white rounded border border-orange-300 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    {dup.labels.join(' ↔ ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(dup.similarity * 100).toFixed(0)}%
                  </span>
                </div>
                {dup.suggestedMerge && (
                  <div className="text-xs text-blue-600 mb-1">
                    ⭐ 統合推奨
                  </div>
                )}
                {dup.commonFeatures.semanticTags.length > 0 && (
                  <div className="text-xs text-gray-500">
                    共通タグ: {dup.commonFeatures.semanticTags.slice(0, 3).join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分析結果がない場合 */}
      {gapAreas.length === 0 && 
       densityRegions.length === 0 && 
       duplicates.length === 0 && (
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-xs text-gray-500">
            分析結果がありません
          </p>
        </div>
      )}
    </div>
  )
}

// Merkle DAG: timeline.components.structure_analysis_panel -> implementation_complete
// 構造分析結果の表示パネルコンポーネントの実装完了

