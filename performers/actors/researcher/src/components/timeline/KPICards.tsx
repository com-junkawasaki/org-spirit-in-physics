import React, { useCallback } from 'react'
import * as d3 from 'd3'
import type { TimelineDataPoint, KPICalculations } from './types'

// Merkle DAG: timeline.components.kpi_cards
// KPIカードコンポーネント

interface KPICardsProps {
  data: TimelineDataPoint[]
}

export default function KPICards({ data }: KPICardsProps) {
  // KPIカード計算
  const calculateKPIs = useCallback((): KPICalculations | null => {
    if (data.length === 0) return null

    const currentValues = {
      avgReactionTime: data.reduce((sum, d) => sum + d.reactionTime, 0) / data.length,
      avgReactionValue: data.reduce((sum, d) => sum + d.reactionValue, 0) / data.length,
      responseRate: (data.filter(d => d.hasResponse).length / data.length) * 100,
      totalResponses: data.filter(d => d.hasResponse).length
    }

    // 過去の値（デモ用：現在値の90-110%の範囲でランダム）
    const previousValues = {
      avgReactionTime: currentValues.avgReactionTime * (0.9 + Math.random() * 0.2),
      avgReactionValue: currentValues.avgReactionValue * (0.9 + Math.random() * 0.2),
      responseRate: currentValues.responseRate * (0.9 + Math.random() * 0.2),
      totalResponses: Math.floor(currentValues.totalResponses * (0.9 + Math.random() * 0.2))
    }

    // 変化率計算
    const changes = {
      avgReactionTime: ((currentValues.avgReactionTime - previousValues.avgReactionTime) / previousValues.avgReactionTime) * 100,
      avgReactionValue: ((currentValues.avgReactionValue - previousValues.avgReactionValue) / previousValues.avgReactionValue) * 100,
      responseRate: ((currentValues.responseRate - previousValues.responseRate) / previousValues.responseRate) * 100,
      totalResponses: ((currentValues.totalResponses - previousValues.totalResponses) / previousValues.totalResponses) * 100
    }

    return { current: currentValues, previous: previousValues, changes }
  }, [data])

  const renderKPICards = useCallback(() => {
    const kpis = calculateKPIs()
    if (!kpis) return null

    const cards = [
      {
        title: '平均反応時間',
        value: kpis.current.avgReactionTime,
        unit: 'ms',
        change: kpis.changes.avgReactionTime,
        sparkline: data.map(d => d.reactionTime).slice(-20) // 最新20件
      },
      {
        title: '平均反応値',
        value: kpis.current.avgReactionValue,
        unit: '',
        change: kpis.changes.avgReactionValue,
        sparkline: data.map(d => d.reactionValue).slice(-20)
      },
      {
        title: '反応率',
        value: kpis.current.responseRate,
        unit: '%',
        change: kpis.changes.responseRate,
        sparkline: data.map(d => d.hasResponse ? 1 : 0).slice(-20)
      },
      {
        title: '総反応数',
        value: kpis.current.totalResponses,
        unit: '件',
        change: kpis.changes.totalResponses,
        sparkline: Array.from({ length: 20 }, () => Math.floor(kpis.current.totalResponses * (0.8 + Math.random() * 0.4)))
      }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`flex items-center text-xs ${
                card.change > 0 ? 'text-green-600' : card.change < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {card.change > 0 ? '↗' : card.change < 0 ? '↘' : '→'} {Math.abs(card.change).toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {card.value.toFixed(card.unit === '%' ? 1 : card.unit === 'ms' ? 0 : 2)}{card.unit}
            </div>
            <div className="h-8">
              <svg width="100%" height="100%" className="text-blue-500">
                <title>スパークライン: {card.title}</title>
                <path
                  d={(() => {
                    try {
                      const validData = card.sparkline.filter(d => isFinite(d) && !isNaN(d))
                      if (validData.length === 0) return ''
                      
                      const maxValue = Math.max(...validData)
                      if (!isFinite(maxValue) || isNaN(maxValue) || maxValue === 0) return ''
                      
                      const line = d3.line<number>()
                        .x((_, i) => {
                          const x = (i / Math.max(1, validData.length - 1)) * 100
                          return isFinite(x) && !isNaN(x) ? x : 0
                        })
                        .y(d => {
                          if (!isFinite(d) || isNaN(d)) return 50
                          const y = 100 - (d / maxValue) * 100
                          return isFinite(y) && !isNaN(y) ? y : 50
                        })
                        .curve(d3.curveMonotoneX)
                      
                      const pathString = line(validData)
                      if (!pathString || pathString.includes('NaN') || pathString.includes('Infinity')) {
                        return ''
                      }
                      return pathString
                    } catch (error) {
                      console.error('[KPICards] Error generating path for', card.title, error)
                      return ''
                    }
                  })()}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    )
  }, [data, calculateKPIs])

  return renderKPICards()
}

// Merkle DAG: timeline.components.kpi_cards -> implementation_complete
// KPIカードコンポーネントの実装完了
