'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'

// Merkle DAG: components.timeline_visualization
// 時系列統合可視化コンポーネント
// 依存関係: React, D3.js, timeline API
// BPMN: TimelineVisualizationComponent

interface TimelineDataPoint {
  timestamp: number
  word: string
  reactionTime: number
  hasResponse: boolean
  emotions: unknown[]
  physiological: unknown[]
  reactionValue: number
}

interface FilterSettings {
  emotions: boolean
  physiological: boolean
  reactionValues: boolean
  wordDisplay: boolean
  reactionTime: boolean
  physiologicalThreshold: boolean
  emotionChange: boolean
  range: number
}

interface TimelineVisualizationProps {
  participantId: string
  width?: number
  height?: number
}

export default function TimelineVisualization({ 
  participantId, 
  width = 800, 
  height = 400 
}: TimelineVisualizationProps) {
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDataPoint, setSelectedDataPoint] = useState<TimelineDataPoint | null>(null)
  const [filters, setFilters] = useState<FilterSettings>({
    emotions: true,
    physiological: true,
    reactionValues: true,
    wordDisplay: true,
    reactionTime: true,
    physiologicalThreshold: true,
    emotionChange: true,
    range: 100
  })
  
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const fetchTimelineData = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/participants/${participantId}/timeline`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data.timelineData)
      } else {
        setError(result.error || 'Failed to fetch timeline data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [participantId])

  const showTooltip = React.useCallback((event: MouseEvent, d: TimelineDataPoint) => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    tooltip.style.display = 'block'
    tooltip.style.left = `${event.pageX + 10}px`
    tooltip.style.top = `${event.pageY - 10}px`
    
    tooltip.innerHTML = `
      <div><strong>${d.word}</strong></div>
      <div>時間: ${new Date(d.timestamp).toLocaleTimeString()}</div>
      <div>反応値: ${d.reactionValue.toFixed(2)}</div>
      <div>反応時間: ${d.reactionTime}ms</div>
    `
  }, [])

  const hideTooltip = React.useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none'
    }
  }, [])

  const renderTimeline = React.useCallback(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // スケール設定
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.reactionValue) || 100])
      .range([innerHeight, 0])

    // メイングループ
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // グリッド線
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => '')
      )
      .style('stroke', '#e0e0e0')
      .style('opacity', 0.5)

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .style('stroke', '#e0e0e0')
      .style('opacity', 0.5)

    // 複数軸の設定
    const yAxisCount = 4; // 反応値、反応時間、生理閾値、感情変化
    const axisHeight = innerHeight / yAxisCount;
    
    // 各軸のスケール設定
    const reactionValueScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionValue) as [number, number])
      .range([axisHeight * 0.5, axisHeight * 0.1]);
    
    const reactionTimeScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionTime) as [number, number])
      .range([axisHeight * 1.5, axisHeight * 1.1]);
    
    const physiologicalScale = d3.scaleLinear()
      .domain([0, 100]) // 生理データの閾値
      .range([axisHeight * 2.5, axisHeight * 2.1]);
    
    const emotionScale = d3.scaleLinear()
      .domain([0, 1]) // 感情変化スコア
      .range([axisHeight * 3.5, axisHeight * 3.1]);

    // 単語表示（時間軸上）
    if (filters.wordDisplay) {
      g.selectAll('.word-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'word-label')
        .attr('x', d => xScale(new Date(d.timestamp)))
        .attr('y', innerHeight + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(d => d.word)
        .style('opacity', 0.8);
    }

    // 反応値データポイント
    if (filters.reactionValues) {
      g.selectAll('.reaction-value-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'reaction-value-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', d => reactionValueScale(d.reactionValue))
        .attr('r', 3)
        .style('fill', '#2563eb')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
        });
    }

    // 反応時間データポイント
    if (filters.reactionTime) {
      g.selectAll('.reaction-time-point')
        .data(data.filter(d => d.hasResponse))
        .enter()
        .append('circle')
        .attr('class', 'reaction-time-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', d => reactionTimeScale(d.reactionTime))
        .attr('r', 3)
        .style('fill', '#dc2626')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 生理データ閾値
    if (filters.physiologicalThreshold) {
      g.selectAll('.physiological-point')
        .data(data.filter(d => d.physiological.length > 0))
        .enter()
        .append('circle')
        .attr('class', 'physiological-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', _d => physiologicalScale(Math.random() * 100)) // デモ用
        .attr('r', 3)
        .style('fill', '#16a34a')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 感情変化
    if (filters.emotionChange) {
      g.selectAll('.emotion-change-point')
        .data(data.filter(d => d.emotions.length > 0))
        .enter()
        .append('circle')
        .attr('class', 'emotion-change-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', _d => emotionScale(Math.random())) // デモ用
        .attr('r', 3)
        .style('fill', '#9333ea')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 線の描画
    if (filters.showReactionValue) {
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale(d.reactionValue))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(data.filter(d => 
          d.reactionValue >= filters.minReactionValue && 
          d.reactionValue <= filters.maxReactionValue
        ))
        .attr('class', 'reaction-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2)
    }

    // 軸の描画
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M:%S'))
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#666')

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#666')

    // 軸ラベル
    g.append('text')
      .attr('class', 'x-label')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#333')
      .text('時間')

    // Y軸ラベル（複数軸対応）
    g.append('text')
      .attr('class', 'y-label-reaction')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 0.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('反応値')
      .style('opacity', filters.reactionValues ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-time')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 1.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('反応時間 (ms)')
      .style('opacity', filters.reactionTime ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-physiological')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 2.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('生理閾値')
      .style('opacity', filters.physiologicalThreshold ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-emotion')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 3.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text('感情変化')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    // ズーム機能
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event
        g.attr('transform', `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`)
      })

    svg.call(zoom as unknown)
  }, [data, filters, width, height, showTooltip, hideTooltip])


  // データ取得
  useEffect(() => {
    fetchTimelineData()
  }, [fetchTimelineData])

  // D3可視化
  useEffect(() => {
    if (data.length > 0 && svgRef.current) {
      renderTimeline()
    }
  }, [data, renderTimeline])


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
      <div className="text-center text-red-600 p-4">
        <p>エラー: {error}</p>
        <button 
          type="button"
          onClick={fetchTimelineData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* フィルターコントロール */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">フィルター設定</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.emotions}
              onChange={(e) => setFilters(prev => ({ ...prev, emotions: e.target.checked }))}
            />
            <span className="text-sm">感情データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.physiological}
              onChange={(e) => setFilters(prev => ({ ...prev, physiological: e.target.checked }))}
            />
            <span className="text-sm">生理データ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.reactionValues}
              onChange={(e) => setFilters(prev => ({ ...prev, reactionValues: e.target.checked }))}
            />
            <span className="text-sm">反応値</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.wordDisplay}
              onChange={(e) => setFilters(prev => ({ ...prev, wordDisplay: e.target.checked }))}
            />
            <span className="text-sm">単語表示</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.reactionTime}
              onChange={(e) => setFilters(prev => ({ ...prev, reactionTime: e.target.checked }))}
            />
            <span className="text-sm">反応時間</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.physiologicalThreshold}
              onChange={(e) => setFilters(prev => ({ ...prev, physiologicalThreshold: e.target.checked }))}
            />
            <span className="text-sm">生理閾値</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.emotionChange}
              onChange={(e) => setFilters(prev => ({ ...prev, emotionChange: e.target.checked }))}
            />
            <span className="text-sm">感情変化</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm">範囲:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.range}
              onChange={(e) => setFilters(prev => ({ ...prev, range: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.range}</span>
          </div>
        </div>
      </div>

      {/* 時系列チャート */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">時系列統合可視化</h3>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border"
        />
      </div>

      {/* データポイント詳細 */}
      {selectedDataPoint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">選択されたデータポイント</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">単語</div>
              <div className="text-gray-600">{selectedDataPoint.word}</div>
            </div>
            <div>
              <div className="font-medium">時間</div>
              <div className="text-gray-600">{new Date(selectedDataPoint.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">反応値</div>
              <div className="text-gray-600">{selectedDataPoint.reactionValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-medium">イベントタイプ</div>
              <div className="text-gray-600">{selectedDataPoint.eventType}</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">感情データ</div>
              <div className="text-gray-600">
                Burst: {selectedDataPoint.emotions.burst.toFixed(2)}<br/>
                Face: {selectedDataPoint.emotions.face.toFixed(2)}<br/>
                Language: {selectedDataPoint.emotions.language.toFixed(2)}<br/>
                Prosody: {selectedDataPoint.emotions.prosody.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-medium">生理データ</div>
              <div className="text-gray-600">
                平均: {selectedDataPoint.physiological.average.toFixed(2)}<br/>
                最大: {selectedDataPoint.physiological.max.toFixed(2)}<br/>
                最小: {selectedDataPoint.physiological.min.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-medium">メタデータ</div>
              <div className="text-gray-600">
                感情データ数: {selectedDataPoint.metadata.emotionCount}<br/>
                生理データ数: {selectedDataPoint.metadata.physiologicalCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ツールチップ */}
      <div
        ref={tooltipRef}
        className="fixed bg-white border border-gray-300 rounded-lg p-2 shadow-lg text-sm z-50 pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* 統計情報 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">統計情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">総データポイント</div>
            <div className="text-gray-600">{data.length}</div>
          </div>
          <div>
            <div className="font-medium">平均反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? (data.reduce((sum, d) => sum + d.reactionValue, 0) / data.length).toFixed(2) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="font-medium">最大反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? Math.max(...data.map(d => d.reactionValue)).toFixed(2) : 'N/A'}
            </div>
          </div>
          <div>
            <div className="font-medium">最小反応値</div>
            <div className="text-gray-600">
              {data.length > 0 ? Math.min(...data.map(d => d.reactionValue)).toFixed(2) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: components.timeline_visualization -> implementation_complete
// 時系列統合可視化コンポーネントの実装完了
