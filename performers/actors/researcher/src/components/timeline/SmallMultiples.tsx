import React, { useCallback } from 'react'
import * as d3 from 'd3'
import type { TimelineDataPoint, SmallMultiplesDataPoint } from './types'

// Merkle DAG: timeline.components.small_multiples
// スモールマルチプルコンポーネント

interface SmallMultiplesProps {
  data: TimelineDataPoint[]
}

export default function SmallMultiples({ data }: SmallMultiplesProps) {
  // スモールマルチプル用データ準備
  const prepareSmallMultiplesData = useCallback((): SmallMultiplesDataPoint[] => {
    if (data.length === 0) return []

    // 単語ごとにグループ化して時系列データを作成
    const wordGroups = data.reduce((acc, d) => {
      if (!acc[d.word]) acc[d.word] = []
      acc[d.word].push(d)
      return acc
    }, {} as Record<string, TimelineDataPoint[]>)

    return Object.entries(wordGroups)
      .map(([word, points]) => ({
        word,
        data: points.sort((a, b) => a.timestamp - b.timestamp),
        stats: {
          avgReactionTime: points.reduce((sum, d) => sum + d.reactionTime, 0) / points.length,
          avgReactionValue: points.reduce((sum, d) => sum + d.reactionValue, 0) / points.length,
          maxReactionValue: Math.max(...points.map(d => d.reactionValue)),
          responseRate: (points.filter(d => d.hasResponse).length / points.length) * 100
        }
      }))
      .sort((a, b) => b.stats.avgReactionValue - a.stats.avgReactionValue)
      .slice(0, 12) // 上位12単語のみ表示
  }, [data])

  // スモールマルチプルレンダリング
  const renderSmallMultiples = useCallback(() => {
    const smallMultiplesData = prepareSmallMultiplesData()
    if (smallMultiplesData.length === 0) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {smallMultiplesData.map((item) => (
          <div key={item.word} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">{item.word}</h3>
              <div className="text-xs text-gray-500">{item.data.length}件</div>
            </div>

            <div className="h-16 mb-2">
              <svg width="100%" height="100%" className="text-blue-500">
                <title>スパークライン: {item.word}</title>
                <path
                  d={(() => {
                    try {
                      const validData = item.data.filter(d => 
                        !isNaN(d.reactionValue) && 
                        isFinite(d.reactionValue) && 
                        d.reactionValue >= 0
                      )
                      if (validData.length === 0) return ''
                      
                      const maxValue = Math.max(...validData.map(x => x.reactionValue))
                      if (!isFinite(maxValue) || isNaN(maxValue) || maxValue === 0) return ''
                      
                      const line = d3.line<TimelineDataPoint>()
                        .x((_, i) => {
                          if (validData.length === 0) return 0
                          const x = (i / Math.max(1, validData.length - 1)) * 100
                          return isFinite(x) && !isNaN(x) ? x : 0
                        })
                        .y(d => {
                          if (!isFinite(d.reactionValue) || isNaN(d.reactionValue)) return 50
                          const y = 100 - (d.reactionValue / maxValue) * 100
                          return isFinite(y) && !isNaN(y) ? y : 50
                        })
                        .curve(d3.curveMonotoneX)
                      
                      const pathString = line(validData)
                      if (!pathString || pathString.includes('NaN') || pathString.includes('Infinity')) {
                        return ''
                      }
                      return pathString
                    } catch (error) {
                      console.error('[SmallMultiples] Error generating path for', item.word, error)
                      return ''
                    }
                  })()}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-500">平均反応値</div>
                <div className="font-semibold">{item.stats.avgReactionValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">反応率</div>
                <div className="font-semibold">{item.stats.responseRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-500">最大値</div>
                <div className="font-semibold">{item.stats.maxReactionValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">平均時間</div>
                <div className="font-semibold">{item.stats.avgReactionTime.toFixed(0)}ms</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }, [prepareSmallMultiplesData])

  return renderSmallMultiples()
}

// Merkle DAG: timeline.components.small_multiples -> implementation_complete
// スモールマルチプルコンポーネントの実装完了
