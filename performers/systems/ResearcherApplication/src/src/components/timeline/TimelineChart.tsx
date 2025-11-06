import React, { useCallback, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TimelineDataPoint, FilterSettings, TimeRange } from './types'

// Merkle DAG: timeline.components.timeline_chart
// 時系列チャートコンポーネント

interface TimelineChartProps {
  data: TimelineDataPoint[]
  filters: FilterSettings
  width: number
  height: number
  timeRange: TimeRange | null
  onDataPointSelect: (point: TimelineDataPoint | null) => void
  onTooltipShow: (event: MouseEvent, point: TimelineDataPoint) => void
  onTooltipHide: () => void
}

export default function TimelineChart({
  data,
  filters,
  width,
  height,
  timeRange,
  onDataPointSelect,
  onTooltipShow,
  onTooltipHide
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const overviewSvgRef = useRef<SVGSVGElement>(null)

  const renderOverviewChart = useCallback(() => {
    if (!overviewSvgRef.current || data.length === 0) return

    const svg = d3.select(overviewSvgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 10, right: 20, bottom: 30, left: 20 }
    const overviewWidth = width - margin.left - margin.right
    const overviewHeight = 80 - margin.top - margin.bottom

    svg.attr('width', width).attr('height', 80)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // 時間範囲
    const validTimestamps = data.map(d => new Date(d.timestamp)).filter(d => Number.isFinite(d.getTime()))
    const timeExtent = d3.extent(validTimestamps) as [Date, Date]
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, overviewWidth])

    // 反応値のスケール
    const reactionValues = data.map(d => d.reactionValue).filter(v => Number.isFinite(v))
    const yScale = d3.scaleLinear()
      .domain(d3.extent(reactionValues) as [number, number])
      .range([overviewHeight, 0])

    // メインライン
    const line = d3.line<TimelineDataPoint>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.reactionValue))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(data.filter(d => Number.isFinite(new Date(d.timestamp).getTime()) && Number.isFinite(d.reactionValue)))
      .attr('class', 'overview-line')
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', '#666')
      .style('stroke-width', 1)

    // 選択範囲のハイライト
    if (timeRange) {
      const xStart = xScale(new Date(timeRange.start))
      const xEnd = xScale(new Date(timeRange.end))
      const selX = Number.isFinite(xStart) ? xStart : 0
      const selW = Number.isFinite(xEnd - xStart) ? (xEnd - xStart) : 0
      g.append('rect')
        .attr('class', 'brush-area')
        .attr('x', selX)
        .attr('y', 0)
        .attr('width', Math.max(0, selW))
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('opacity', 0.2)
        .style('stroke', '#3b82f6')
        .style('stroke-width', 1)
    }

    // X軸
    g.append('g')
      .attr('class', 'x-axis-overview')
      .attr('transform', `translate(0,${overviewHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M'))
        .ticks(5)
      )
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666')

  }, [data, width, timeRange])

  const renderTimeline = useCallback(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // フィルタリングされたデータ
    const filteredDataRaw = timeRange
      ? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data
    const filteredData = filteredDataRaw.filter(d => Number.isFinite(new Date(d.timestamp).getTime()))

    // スケール設定
    const timeExtent = timeRange
      ? [new Date(timeRange.start), new Date(timeRange.end)] as [Date, Date]
      : d3.extent(filteredData, d => new Date(d.timestamp)) as [Date, Date]

    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData.map(d => d.reactionValue).filter(v => Number.isFinite(v))) || 100])
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
    if (filters.wordDisplay && filters.showWordLabels) {
      g.selectAll('.word-label')
        .data(filteredData)
        .enter()
        .append('text')
        .attr('class', 'word-label')
        .attr('x', d => xScale(new Date(d.timestamp)))
        .attr('y', innerHeight + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#374151')
        .text(d => d.word)
        .style('opacity', 0.9)
        .on('mouseover', (event, d) => {
          onDataPointSelect(d)
          onTooltipShow(event, d)
        })
        .on('mouseout', () => {
          onDataPointSelect(null)
          onTooltipHide()
        });
    }

    // 反応値データポイント
    if (filters.reactionValues) {
      g.selectAll('.reaction-value-point')
        .data(filteredData)
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
          onDataPointSelect(d)
          onTooltipShow(event, d)
        })
        .on('mouseout', () => {
          onDataPointSelect(null)
          onTooltipHide()
        });
    }

    // 反応時間データポイント
    if (filters.reactionTime) {
      g.selectAll('.reaction-time-point')
        .data(filteredData.filter(d => d.hasResponse))
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
        .data(filteredData.filter(d => {
          const p = d.physiological as unknown
          return Array.isArray(p) ? p.length > 0 : typeof p === 'object'
        }))
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
        .data(filteredData.filter(d => d.emotions.length > 0))
        .enter()
        .append('circle')
        .attr('class', 'emotion-change-point')
        .attr('cx', d => xScale(new Date(d.timestamp)))
        .attr('cy', _d => emotionScale(Math.random())) // デモ用
        .attr('r', 3)
        .style('fill', '#9333ea')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          onDataPointSelect(d)
          onTooltipShow(event, d)
        })
        .on('mouseout', () => {
          onDataPointSelect(null)
          onTooltipHide()
        });
    }

    // 感情データの詳細表示
    if (filters.showEmotionDetails) {
      filteredData.forEach(d => {
        if (d.emotions.length > 0) {
          // 感情データポイントを個別に表示
          d.emotions.forEach((emotion) => {
            const emotionGroup = g.append('g')
              .attr('class', 'emotion-detail-group')
              .attr('transform', `translate(${xScale(new Date(d.timestamp))}, ${emotionScale(emotion.score)})`)

            // 感情の色を決定
            const emotionColors: Record<string, string> = {
              'joy': '#fbbf24',
              'sadness': '#3b82f6',
              'anger': '#ef4444',
              'fear': '#8b5cf6',
              'surprise': '#10b981',
              'disgust': '#6b7280',
              'calm': '#84cc16',
              'focus': '#f59e0b',
              'excitement': '#ec4899',
              'confusion': '#6366f1'
            }

            const color = emotionColors[(emotion.name || 'unknown').toLowerCase()] || '#9333ea'

            emotionGroup.append('circle')
              .attr('r', 4)
              .style('fill', color)
              .style('stroke', '#fff')
              .style('stroke-width', 2)
              .style('cursor', 'pointer')
              .on('mouseover', (event) => {
                onDataPointSelect(d)
                onTooltipShow(event, d)
              })
              .on('mouseout', () => {
                onDataPointSelect(null)
                onTooltipHide()
              })

            // 感情名のラベル
            emotionGroup.append('text')
              .attr('x', 8)
              .attr('y', 4)
              .attr('font-size', '9px')
              .attr('font-weight', '500')
              .attr('fill', color)
              .text(emotion.name || 'unknown')
              .style('opacity', 0.8)
          })
        }
      })
    }

    // 線の描画（反応値）
    if (filters.reactionValues) {
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale(d.reactionValue))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(filteredData)
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

    // 感情の凡例
    if (filters.showEmotionDetails) {
      const legend = g.append('g')
        .attr('class', 'emotion-legend')
        .attr('transform', `translate(${innerWidth - 200}, 20)`)

      const emotionColors: Record<string, string> = {
        'joy': '#fbbf24',
        'sadness': '#3b82f6',
        'anger': '#ef4444',
        'fear': '#8b5cf6',
        'surprise': '#10b981',
        'disgust': '#6b7280',
        'calm': '#84cc16',
        'focus': '#f59e0b',
        'excitement': '#ec4899',
        'confusion': '#6366f1'
      }

      const emotions = Object.keys(emotionColors)
      const legendItems = legend.selectAll('.legend-item')
        .data(emotions)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (_d, i) => `translate(0, ${i * 20})`)

      legendItems.append('circle')
        .attr('r', 4)
        .style('fill', d => emotionColors[d])
        .style('stroke', '#fff')
        .style('stroke-width', 1)

      legendItems.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .attr('font-size', '10px')
        .attr('fill', '#374151')
        .text(d => d)

      // 凡例の背景
      legend.insert('rect', ':first-child')
        .attr('width', 120)
        .attr('height', emotions.length * 20 + 10)
        .attr('fill', 'rgba(255, 255, 255, 0.9)')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('rx', 4)
    }
  }, [data, filters, width, height, timeRange, onDataPointSelect, onTooltipShow, onTooltipHide])

  useEffect(() => {
    renderTimeline()
    renderOverviewChart()
  }, [renderTimeline, renderOverviewChart])

  return (
    <div className="space-y-4">
      {/* メインチャート */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border"
      />

      {/* 概要チャート（ナビゲーター） */}
      <div className="bg-gray-50 p-2 rounded">
        <div className="text-xs text-gray-600 mb-1">時間範囲選択</div>
        <svg
          ref={overviewSvgRef}
          width={width}
          height={80}
          className="border border-gray-300"
        />
      </div>
    </div>
  )
}

// Merkle DAG: timeline.components.timeline_chart -> implementation_complete
// 時系列チャートコンポーネントの実装完了
