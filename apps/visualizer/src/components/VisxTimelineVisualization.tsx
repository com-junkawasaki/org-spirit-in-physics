'use client'

// Merkle DAG: visx_timeline.chart_component -> visualization_implementation
// visx + D3（関数写像）+ ml-matrix/mathjs による時系列可視化コンポーネント

import { useState, useEffect, useMemo, useId } from 'react'
import type React from 'react'
import {
  scaleLinear,
  scaleTime,
  scaleOrdinal
} from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { LinePath, Bar } from '@visx/shape'
import { Group } from '@visx/group'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { localPoint } from '@visx/event'
import { ParentSize } from '@visx/responsive'
import { LinearTransformationPipeline, calculateStatistics } from '@/lib/linear-algebra'
import type { TimelineDataPoint } from '@/lib/linear-algebra'

interface VisxTimelineVisualizationProps {
  participantId: string
  width?: number
  height?: number
}

interface TooltipData {
  timestamp: number
  word: string
  eventType: string
  reactionValue: number
  emotions: {
    burst: number
    face: number
    language: number
    prosody: number
    total: number
  }
  physiological: {
    average: number
    max: number
    min: number
  }
}

// Merkle DAG: visx_timeline.color_scales
// 色スケール関数（D3関数写像）
const createColorScales = (data: TimelineDataPoint[]) => {
  // イベントタイプ別色スケール
  const eventTypes = [...new Set(data.map(d => d.eventType))]
  const eventColorScale = scaleOrdinal({
    domain: eventTypes,
    range: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
  })
  
  // 反応値連続色スケール
  const reactionValues = data.map(d => d.reactionValue)
  const reactionColorScale = scaleLinear<string>({
    domain: [Math.min(...reactionValues), Math.max(...reactionValues)],
    range: ['#440154', '#31688e', '#35b779', '#fde725'] // viridisカラーパレット
  })
  
  return { eventColorScale, reactionColorScale }
}

// Merkle DAG: visx_timeline.time_scales
// 時間スケール関数（D3関数写像）
const createTimeScales = (data: TimelineDataPoint[], width: number) => {
  const timestamps = data.map(d => d.timestamp)
  const timeScale = scaleTime({
    domain: [Math.min(...timestamps), Math.max(...timestamps)],
    range: [0, width]
  })
  
  return { timeScale }
}

// Merkle DAG: visx_timeline.reaction_scales
// 反応値スケール関数（D3関数写像）
const createReactionScales = (data: TimelineDataPoint[], height: number) => {
  const reactionValues = data.map(d => d.reactionValue)
  const stats = calculateStatistics(reactionValues)
  
  const reactionScale = scaleLinear({
    domain: [stats.min, stats.max],
    range: [height, 0]
  })
  
  return { reactionScale, stats }
}

// Merkle DAG: visx_timeline.chart_component
// メインチャートコンポーネント
function TimelineChart({ 
  data, 
  width, 
  height, 
  margin = { top: 20, right: 20, bottom: 60, left: 60 }
}: {
  data: TimelineDataPoint[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}) {
  const gridId = useId()
  const [showEmotions, setShowEmotions] = useState(true)
  const [showPhysiological, setShowPhysiological] = useState(true)
  const [showReactionValues, setShowReactionValues] = useState(true)
  const [smoothingWindow, setSmoothingWindow] = useState(5)
  
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip
  } = useTooltip<TooltipData>()
  
  // 線形変換パイプライン
  const pipeline = useMemo(() => {
    const timestamps = data.map(d => d.timestamp)
    const referenceTime = Math.min(...timestamps)
    return new LinearTransformationPipeline(timestamps, referenceTime, undefined, smoothingWindow)
  }, [data, smoothingWindow])
  
  // スケール関数（D3関数写像）
  const { timeScale } = useMemo(() => createTimeScales(data, width - margin.left - margin.right), [data, width, margin])
  const { reactionScale, stats } = useMemo(() => createReactionScales(data, height - margin.top - margin.bottom), [data, height, margin])
  const { eventColorScale, reactionColorScale } = useMemo(() => createColorScales(data), [data])
  
  // データ変換（線形代数的処理）
  const transformedData = useMemo(() => {
    const timestamps = data.map(d => d.timestamp)
    const emotionValues = data.map(d => d.emotions.total)
    const physiologicalValues = data.map(d => d.physiological.average)
    const referenceTime = Math.min(...timestamps)
    
    const { alignedTime, scaledReactions } = pipeline.processPipeline(
      timestamps,
      emotionValues,
      physiologicalValues,
      referenceTime,
      [Math.min(...timestamps), Math.max(...timestamps)],
      [0, 1]
    )
    
    return data.map((d, i) => ({
      ...d,
      x: timeScale(d.timestamp),
      y: reactionScale(d.reactionValue),
      alignedTime: alignedTime[i],
      transformedReaction: scaledReactions[i],
      eventColor: eventColorScale(d.eventType),
      reactionColor: reactionColorScale(d.reactionValue)
    }))
  }, [data, pipeline, timeScale, reactionScale, eventColorScale, reactionColorScale])
  
  // ツールチップ表示
  const handleMouseOver = (event: React.MouseEvent, datum: TimelineDataPoint) => {
    const svgElement = event.currentTarget.ownerSVGElement
    if (svgElement) {
      const coords = localPoint(svgElement, event)
      if (coords) {
        showTooltip({
          tooltipLeft: coords.x,
          tooltipTop: coords.y,
          tooltipData: {
            timestamp: datum.timestamp,
            word: datum.word,
            eventType: datum.eventType,
            reactionValue: datum.reactionValue,
            emotions: datum.emotions,
            physiological: datum.physiological
          }
        })
      }
    }
  }
  
  const handleMouseLeave = () => {
    hideTooltip()
  }
  
  return (
    <div className="w-full h-full">
      {/* フィルターコントロール */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">フィルター設定</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showEmotions}
              onChange={(e) => setShowEmotions(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">感情データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showPhysiological}
              onChange={(e) => setShowPhysiological(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">生理データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showReactionValues}
              onChange={(e) => setShowReactionValues(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">反応値</span>
          </label>
          <div className="flex items-center space-x-2">
            <label htmlFor={`smoothing-slider-${gridId}`} className="text-sm">平滑化:</label>
            <input
              id={`smoothing-slider-${gridId}`}
              type="range"
              min="1"
              max="20"
              value={smoothingWindow}
              onChange={(e) => setSmoothingWindow(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm w-8">{smoothingWindow}</span>
          </div>
        </div>
      </div>
      
      {/* チャート領域 */}
      <div className="border rounded-lg p-4">
        <svg width={width} height={height} role="img" aria-label="時系列データ可視化チャート">
          <Group left={margin.left} top={margin.top}>
            {/* グリッド線 */}
            <defs>
              <pattern id={`grid-${gridId}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={width - margin.left - margin.right} height={height - margin.top - margin.bottom} fill={`url(#grid-${gridId})`} />
            
            {/* データポイント */}
            {transformedData.map((d, i) => (
              <g key={`data-point-${d.timestamp}-${d.word}-${i}`}>
                {/* 反応値バー */}
                {showReactionValues && (
                  <Bar
                    x={d.x - 2}
                    y={d.y}
                    width={4}
                    height={height - margin.top - margin.bottom - d.y}
                    fill={d.reactionColor}
                    opacity={0.7}
                    onMouseOver={(event) => handleMouseOver(event, d)}
                    onFocus={(event) => handleMouseOver(event, d)}
                    onMouseLeave={handleMouseLeave}
                    tabIndex={0}
                    aria-label={`反応値: ${d.reactionValue.toFixed(3)}, 単語: ${d.word}`}
                  />
                )}
                
                {/* イベントマーカー */}
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={4}
                  fill={d.eventColor}
                  stroke="#fff"
                  strokeWidth={2}
                  aria-label={`イベント: ${d.eventType}, 単語: ${d.word}`}
                />
              </g>
            ))}
            
            {/* 反応値の線 */}
            {showReactionValues && (
              <LinePath
                data={transformedData}
                x={(d) => d.x}
                y={(d) => d.y}
                stroke="#4ecdc4"
                strokeWidth={2}
                strokeOpacity={0.8}
              />
            )}
            
            {/* 軸 */}
            <AxisBottom
              top={height - margin.top - margin.bottom}
              scale={timeScale}
              numTicks={10}
              tickFormat={(value) => new Date(value).toLocaleTimeString()}
            />
            <AxisLeft
              scale={reactionScale}
              numTicks={10}
              tickFormat={(value) => value.toFixed(2)}
            />
          </Group>
        </svg>
        
        {/* ツールチップ */}
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <div>
              <div><strong>単語:</strong> {tooltipData.word}</div>
              <div><strong>イベント:</strong> {tooltipData.eventType}</div>
              <div><strong>時刻:</strong> {new Date(tooltipData.timestamp).toLocaleString()}</div>
              <div><strong>反応値:</strong> {tooltipData.reactionValue.toFixed(3)}</div>
              <div><strong>感情:</strong> {tooltipData.emotions.total.toFixed(3)}</div>
              <div><strong>生理:</strong> {tooltipData.physiological.average.toFixed(3)}</div>
            </div>
          </TooltipWithBounds>
        )}
      </div>
      
      {/* 統計情報 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">統計情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">総データポイント:</span>
            <span className="ml-2">{transformedData.length}</span>
          </div>
          <div>
            <span className="font-medium">平均反応値:</span>
            <span className="ml-2">{stats.mean.toFixed(3)}</span>
          </div>
          <div>
            <span className="font-medium">最大反応値:</span>
            <span className="ml-2">{stats.max.toFixed(3)}</span>
          </div>
          <div>
            <span className="font-medium">最小反応値:</span>
            <span className="ml-2">{stats.min.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: visx_timeline.main_component
// メインコンポーネント
export default function VisxTimelineVisualization({ 
  participantId, 
  width = 1000, 
  height = 500 
}: VisxTimelineVisualizationProps) {
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/participants/${participantId}/timeline`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success && result.data?.timelineData) {
          setData(result.data.timelineData)
        } else {
          throw new Error('Invalid data format')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [participantId])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">時系列データを読み込み中...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div>
          <h3 className="text-lg font-semibold mb-2">エラーが発生しました</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div>
          <h3 className="text-lg font-semibold mb-2">データがありません</h3>
          <p className="text-sm">時系列データが見つかりませんでした。</p>
        </div>
      </div>
    )
  }
  
  return (
    <ParentSize>
      {({ width: parentWidth, height: parentHeight }) => (
        <TimelineChart
          data={data}
          width={Math.min(width, parentWidth)}
          height={Math.min(height, parentHeight)}
        />
      )}
    </ParentSize>
  )
}
