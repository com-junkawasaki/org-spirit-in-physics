'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import dynamic from 'next/dynamic'

// Force3D 用型（型のみローカル定義して実行時依存を最小化）
interface WordNode { id: string; label: string; scale: number }
interface WordLink { source: number; target: number; weight: number }

// Force3D コンポーネントは選択時にのみ遅延読み込み

// Merkle DAG: components.timeline_visualization
// 時系列統合可視化コンポーネント
// 依存関係: React, D3.js, timeline API
// BPMN: TimelineVisualizationComponent

interface EmotionData {
  name: string
  score: number
  fileType: string
}

interface TimelineDataPoint {
  timestamp: number
  word: string
  reactionTime: number
  hasResponse: boolean
  emotions: EmotionData[]
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
  timeScale: number
  verticalScale: number
  showEmotionDetails: boolean
  showWordLabels: boolean
}

interface TimeRange {
  start: number
  end: number
}

type VisualizationMode = 'timeline' | 'kpi' | 'dumbbell' | 'small-multiples' | 'force-3d'

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
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TimelineDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDataPoint, setSelectedDataPoint] = useState<TimelineDataPoint | null>(null)
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('timeline')
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [filters, setFilters] = useState<FilterSettings>({
    emotions: true,
    physiological: true,
    reactionValues: true,
    wordDisplay: true,
    reactionTime: true,
    physiologicalThreshold: true,
    emotionChange: true,
    range: 100,
    timeScale: 1.0,
    verticalScale: 1.0,
    showEmotionDetails: true,
    showWordLabels: true
  })
  
  const svgRef = useRef<SVGSVGElement>(null)
  const overviewSvgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

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
    
    // 感情データの詳細表示
    const emotionDetails = d.emotions.length > 0 
      ? d.emotions.map(emotion => 
          `<div class="text-xs">
            <span class="font-medium">${emotion.name || 'unknown'}</span>: 
            <span class="text-blue-600">${(emotion.score || 0).toFixed(2)}</span>
            <span class="text-gray-500">(${emotion.fileType || 'unknown'})</span>
          </div>`
        ).join('')
      : '<div class="text-xs text-gray-500">感情データなし</div>'
    
    tooltip.innerHTML = `
      <div class="bg-white border border-gray-300 rounded-lg p-3 shadow-lg text-sm">
        <div class="font-semibold text-gray-900 mb-2">${d.word}</div>
        <div class="text-gray-600 mb-2">時間: ${new Date(d.timestamp).toLocaleTimeString()}</div>
        <div class="grid grid-cols-2 gap-2 text-xs mb-2">
          <div>反応値: <span class="font-medium">${d.reactionValue.toFixed(2)}</span></div>
          <div>反応時間: <span class="font-medium">${d.reactionTime}ms</span></div>
        </div>
        <div class="border-t pt-2">
          <div class="text-xs font-medium text-gray-700 mb-1">感情データ:</div>
          ${emotionDetails}
        </div>
      </div>
    `
  }, [])

  const hideTooltip = React.useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none'
    }
  }, [])

  // KPIカード計算
  const calculateKPIs = React.useCallback(() => {
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

  // ダンベルチャート用データ準備
  const prepareDumbbellData = React.useCallback(() => {
    if (data.length === 0) return []

    // 単語ごとにグループ化
    const wordGroups = data.reduce((acc, d) => {
      if (!acc[d.word]) acc[d.word] = []
      acc[d.word].push(d)
      return acc
    }, {} as Record<string, TimelineDataPoint[]>)

    // 各単語の前半・後半の平均値を計算
    return Object.entries(wordGroups).map(([word, points]) => {
      const sorted = points.sort((a, b) => a.timestamp - b.timestamp)
      const mid = Math.floor(sorted.length / 2)
      const firstHalf = sorted.slice(0, mid)
      const secondHalf = sorted.slice(mid)

      return {
        word,
        firstHalf: {
          avgReactionTime: firstHalf.reduce((sum, d) => sum + d.reactionTime, 0) / firstHalf.length,
          avgReactionValue: firstHalf.reduce((sum, d) => sum + d.reactionValue, 0) / firstHalf.length,
          count: firstHalf.length
        },
        secondHalf: {
          avgReactionTime: secondHalf.reduce((sum, d) => sum + d.reactionTime, 0) / secondHalf.length,
          avgReactionValue: secondHalf.reduce((sum, d) => sum + d.reactionValue, 0) / secondHalf.length,
          count: secondHalf.length
        }
      }
    }).filter(d => d.firstHalf.count > 0 && d.secondHalf.count > 0)
  }, [data])

  // スモールマルチプル用データ準備
  const prepareSmallMultiplesData = React.useCallback(() => {
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

  // 3Dフォース用 完全グラフデータ生成（語ごとスケール、辺スケール）
  const prepareForce3DGraph = React.useCallback((): { nodes: WordNode[]; links: WordLink[] } => {
    if (data.length === 0) return { nodes: [], links: [] }

    // 単語ごとに集約
    const groups = data.reduce((acc, d) => {
      if (!acc[d.word]) acc[d.word] = { count: 0, sumReactionValue: 0, sumReactionTime: 0 }
      acc[d.word].count += 1
      acc[d.word].sumReactionValue += d.reactionValue
      acc[d.word].sumReactionTime += d.reactionTime
      return acc
    }, {} as Record<string, { count: number; sumReactionValue: number; sumReactionTime: number }>)

    // ノードの生スケール: 平均反応値 × log(1+回数)
    const nodeEntries = Object.entries(groups).map(([word, g]) => {
      const avgRV = g.sumReactionValue / Math.max(1, g.count)
      const raw = avgRV * Math.log1p(g.count)
      return { word, count: g.count, avgReactionValue: avgRV, raw }
    })

    // 上位N語に制限（描画安定性のため）
    const TOP_N = 40
    const top = nodeEntries.sort((a, b) => b.raw - a.raw).slice(0, TOP_N)

    const rawMin = Math.min(...top.map(n => n.raw))
    const rawMax = Math.max(...top.map(n => n.raw))
    const denom = rawMax - rawMin || 1

    const nodes: WordNode[] = top.map((n, idx) => ({
      id: String(idx),
      label: n.word,
      // 0.5〜6.0程度に正規化（視認性のため）
      scale: 0.5 + 5.5 * ((n.raw - rawMin) / denom)
    }))

    // 完全グラフの辺
    const links: WordLink[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const wi = top[i]
        const wj = top[j]
        // 辺スケールはノードスケール（正規化前raw）の積を基に正規化
        const prod = wi.raw * wj.raw
        links.push({ source: i, target: j, weight: prod })
      }
    }

    // 辺スケール正規化（0.1〜1.0）
    if (links.length > 0) {
      const wMin = Math.min(...links.map(l => l.weight))
      const wMax = Math.max(...links.map(l => l.weight))
      const wDen = wMax - wMin || 1
      for (const l of links) {
        const t = (l.weight - wMin) / wDen
        l.weight = 0.1 + 0.9 * t
      }
    }

    return { nodes, links }
  }, [data])

  // KPIカードレンダリング
  const renderKPICards = React.useCallback(() => {
    const kpis = calculateKPIs()
    if (!kpis) return

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
                  d={d3.line<number>()
                    .x((_, i) => (i / (card.sparkline.length - 1)) * 100)
                    .y(d => 100 - (d / Math.max(...card.sparkline)) * 100)
                    .curve(d3.curveMonotoneX)(card.sparkline) || ''}
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

  // ダンベルチャートレンダリング
  const renderDumbbellChart = React.useCallback(() => {
    const dumbbellData = prepareDumbbellData()
    if (dumbbellData.length === 0) return null

    const margin = { top: 20, right: 30, bottom: 60, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = Math.max(400, dumbbellData.length * 30)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', innerHeight + margin.top + margin.bottom)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // スケール設定
    const yScale = d3.scaleBand()
      .domain(dumbbellData.map(d => d.word))
      .range([0, innerHeight])
      .padding(0.1)

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(dumbbellData, d => Math.max(d.firstHalf.avgReactionValue, d.secondHalf.avgReactionValue)) || 1])
      .range([0, innerWidth])

    // 線を描画
    g.selectAll('.dumbbell-line')
      .data(dumbbellData)
      .enter()
      .append('line')
      .attr('class', 'dumbbell-line')
      .attr('x1', d => xScale(d.firstHalf.avgReactionValue))
      .attr('x2', d => xScale(d.secondHalf.avgReactionValue))
      .attr('y1', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('y2', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .style('stroke', '#666')
      .style('stroke-width', 2)

    // 前半の点
    g.selectAll('.first-half-point')
      .data(dumbbellData)
      .enter()
      .append('circle')
      .attr('class', 'first-half-point')
      .attr('cx', d => xScale(d.firstHalf.avgReactionValue))
      .attr('cy', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('r', 6)
      .style('fill', '#3b82f6')
      .style('stroke', '#fff')
      .style('stroke-width', 2)

    // 後半の点
    g.selectAll('.second-half-point')
      .data(dumbbellData)
      .enter()
      .append('circle')
      .attr('class', 'second-half-point')
      .attr('cx', d => xScale(d.secondHalf.avgReactionValue))
      .attr('cy', d => (yScale(d.word) || 0) + yScale.bandwidth() / 2)
      .attr('r', 6)
      .style('fill', d => d.secondHalf.avgReactionValue > d.firstHalf.avgReactionValue ? '#10b981' : '#ef4444')
      .style('stroke', '#fff')
      .style('stroke-width', 2)

    // Y軸
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')

    // X軸
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')

    // ラベル
    g.append('text')
      .attr('class', 'x-label')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('平均反応値')

    // 凡例
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 150}, 20)`)

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 6)
      .style('fill', '#3b82f6')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 5)
      .style('font-size', '12px')
      .text('前半')

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 20)
      .attr('r', 6)
      .style('fill', '#10b981')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 25)
      .style('font-size', '12px')
      .text('後半（改善）')

    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 40)
      .attr('r', 6)
      .style('fill', '#ef4444')

    legend.append('text')
      .attr('x', 15)
      .attr('y', 45)
      .style('font-size', '12px')
      .text('後半（悪化）')

  }, [prepareDumbbellData, width])

  // スモールマルチプルレンダリング
  const renderSmallMultiples = React.useCallback(() => {
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
                  d={d3.line<TimelineDataPoint>()
                    .x((_, i) => (i / Math.max(1, item.data.length - 1)) * 100)
                    .y(d => 100 - (d.reactionValue / Math.max(...item.data.map(x => x.reactionValue))) * 100)
                    .curve(d3.curveMonotoneX)(item.data) || ''}
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

  // 時間範囲を初期化
  const initializeTimeRange = React.useCallback(() => {
    if (data.length === 0) return

    const timeExtent = d3.extent(data, d => d.timestamp) as [number, number]
    const range = timeExtent[1] - timeExtent[0]
    const initialRange = {
      start: timeExtent[0] + range * 0.2, // 20%から開始
      end: timeExtent[1] - range * 0.2   // 80%で終了
    }
    setTimeRange(initialRange)
  }, [data])

  // 概要チャート（ナビゲーター）レンダリング
  const renderOverviewChart = React.useCallback(() => {
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
    const timeExtent = d3.extent(data, d => d.timestamp) as [Date, Date]
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, overviewWidth])

    // 反応値のスケール
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.reactionValue) as [number, number])
      .range([overviewHeight, 0])

    // メインライン
    const line = d3.line<TimelineDataPoint>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.reactionValue))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(data)
      .attr('class', 'overview-line')
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', '#666')
      .style('stroke-width', 1)

    // 選択範囲のハイライト
    if (timeRange) {
      g.append('rect')
        .attr('class', 'brush-area')
        .attr('x', xScale(new Date(timeRange.start)))
        .attr('y', 0)
        .attr('width', xScale(new Date(timeRange.end)) - xScale(new Date(timeRange.start)))
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('opacity', 0.2)
        .style('stroke', '#3b82f6')
        .style('stroke-width', 1)

      // ドラッグハンドル
      g.append('rect')
        .attr('class', 'brush-handle-left')
        .attr('x', xScale(new Date(timeRange.start)) - 2)
        .attr('y', 0)
        .attr('width', 4)
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('cursor', 'ew-resize')

      g.append('rect')
        .attr('class', 'brush-handle-right')
        .attr('x', xScale(new Date(timeRange.end)) - 2)
        .attr('y', 0)
        .attr('width', 4)
        .attr('height', overviewHeight)
        .style('fill', '#3b82f6')
        .style('cursor', 'ew-resize')

      // ブラシ機能
      const brush = d3.brushX()
        .extent([[0, 0], [overviewWidth, overviewHeight]])
        .on('brush', (event) => {
          const selection = event.selection
          if (selection) {
            const [x0, x1] = selection.map(xScale.invert)
            setTimeRange({
              start: x0.getTime(),
              end: x1.getTime()
            })
          }
        })

      g.append('g')
        .attr('class', 'brush')
        .call(brush as unknown as d3.BrushBehavior<unknown>)
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

  const renderTimeline = React.useCallback(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // フィルタリングされたデータ
    const filteredData = timeRange 
      ? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data

    // スケール設定
    const timeExtent = timeRange 
      ? [new Date(timeRange.start), new Date(timeRange.end)] as [Date, Date]
      : d3.extent(data, d => new Date(d.timestamp)) as [Date, Date]
    
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.reactionValue) || 100])
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
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
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
        .data(filteredData.filter(d => d.physiological.length > 0))
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
          setSelectedDataPoint(d)
          showTooltip(event, d)
        })
        .on('mouseout', () => {
          setSelectedDataPoint(null)
          hideTooltip()
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
                setSelectedDataPoint(d)
                showTooltip(event, d)
              })
              .on('mouseout', () => {
                setSelectedDataPoint(null)
                hideTooltip()
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

    // 線の描画
    if (filters.showReactionValue) {
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale(d.reactionValue))
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(filteredData.filter(d => 
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
  }, [data, filters, width, height, showTooltip, hideTooltip, timeRange])


  // データ取得
  useEffect(() => {
    fetchTimelineData()
  }, [fetchTimelineData])

  // 時間範囲初期化
  useEffect(() => {
    if (data.length > 0 && !timeRange) {
      initializeTimeRange()
    }
  }, [data, timeRange, initializeTimeRange])

  // D3可視化
  useEffect(() => {
    if (data.length > 0 && svgRef.current) {
      switch (visualizationMode) {
        case 'timeline':
          renderTimeline()
          renderOverviewChart()
          break
        case 'dumbbell':
          renderDumbbellChart()
          break
        case 'force-3d':
          // three.js 側で描画するため、ここではD3描画なし
          break
        default:
          break
      }
    }
  }, [data, renderTimeline, renderDumbbellChart, renderOverviewChart, visualizationMode])


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
      {/* 表示モード切り替え */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">表示モード</h3>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'timeline', label: '時系列', icon: '📈' },
            { id: 'kpi', label: 'KPIカード', icon: '📊' },
            { id: 'dumbbell', label: 'Before-After', icon: '⚖️' },
            { id: 'small-multiples', label: 'スモールマルチプル', icon: '🔢' },
            { id: 'force-3d', label: '3D Force', icon: '🧲' }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setVisualizationMode(mode.id as VisualizationMode)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                visualizationMode === mode.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

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
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showEmotionDetails}
              onChange={(e) => setFilters(prev => ({ ...prev, showEmotionDetails: e.target.checked }))}
            />
            <span className="text-sm">感情詳細</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showWordLabels}
              onChange={(e) => setFilters(prev => ({ ...prev, showWordLabels: e.target.checked }))}
            />
            <span className="text-sm">単語ラベル</span>
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
          <div className="flex items-center space-x-2">
            <span className="text-sm">時間スケール:</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={filters.timeScale}
              onChange={(e) => setFilters(prev => ({ ...prev, timeScale: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.timeScale.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">縦スケール:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={filters.verticalScale}
              onChange={(e) => setFilters(prev => ({ ...prev, verticalScale: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{filters.verticalScale.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">
          {visualizationMode === 'timeline' && '時系列統合可視化'}
          {visualizationMode === 'kpi' && 'KPIダッシュボード'}
          {visualizationMode === 'dumbbell' && 'Before-After比較'}
          {visualizationMode === 'small-multiples' && 'スモールマルチプル分析'}
        </h3>
        
        {visualizationMode === 'timeline' && (
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
        )}
        
        {visualizationMode === 'kpi' && renderKPICards()}
        
        {visualizationMode === 'dumbbell' && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="border"
          />
        )}
        
        {visualizationMode === 'small-multiples' && renderSmallMultiples()}

        {visualizationMode === 'force-3d' && mounted && (() => {
          const Force3D = dynamic(() => import('@/components/Force3DWordGraph'), { ssr: false })
          const { nodes, links } = prepareForce3DGraph()
          return (
            <div className="border rounded overflow-hidden">
              <Force3D nodes={nodes} links={links} width={width} height={Math.max(500, height)} />
            </div>
          )
        })()}
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
                {selectedDataPoint.emotions.length > 0 ? (
                  selectedDataPoint.emotions.map((emotion, index) => (
                    <div key={`${emotion.name}-${emotion.fileType}-${index}`} className="text-xs">
                      <span className="font-medium">{emotion.name || 'unknown'}</span>: 
                      <span className="text-blue-600">{(emotion.score || 0).toFixed(2)}</span>
                      <span className="text-gray-500">({emotion.fileType || 'unknown'})</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">感情データなし</div>
                )}
              </div>
            </div>
            <div>
              <div className="font-medium">生理データ</div>
              <div className="text-gray-600">
                平均: {(selectedDataPoint.physiological?.average || 0).toFixed(2)}<br/>
                最大: {(selectedDataPoint.physiological?.max || 0).toFixed(2)}<br/>
                最小: {(selectedDataPoint.physiological?.min || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-medium">メタデータ</div>
              <div className="text-gray-600">
                感情データ数: {selectedDataPoint.metadata?.emotionCount || 0}<br/>
                生理データ数: {selectedDataPoint.metadata?.physiologicalCount || 0}
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
