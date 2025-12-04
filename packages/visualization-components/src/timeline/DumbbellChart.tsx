import { useCallback, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TimelineDataPoint, DumbbellDataPoint } from './types'

// Merkle DAG: timeline.components.dumbbell_chart
// ダンベルチャートコンポーネント

interface DumbbellChartProps {
  data: TimelineDataPoint[]
  width: number
}

export default function DumbbellChart({ data, width }: DumbbellChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // ダンベルチャート用データ準備
  const prepareDumbbellData = useCallback((): DumbbellDataPoint[] => {
    if (data.length === 0) return []

    // 単語ごとにグループ化
    const wordGroups = data.reduce((acc, d) => {
      const word = d.word
      if (!word) return acc
      if (!acc[word]) acc[word] = []
      acc[word]!.push(d)
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

  // ダンベルチャートレンダリング
  const renderDumbbellChart = useCallback(() => {
    const dumbbellData = prepareDumbbellData()
    if (dumbbellData.length === 0) return <></>

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

    return () => {
      // cleanup if needed
    }
  }, [prepareDumbbellData, width])

  useEffect(() => {
    renderDumbbellChart()
  }, [renderDumbbellChart])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={400}
      className="border"
    />
  )
}

// Merkle DAG: timeline.components.dumbbell_chart -> implementation_complete
// ダンベルチャートコンポーネントの実装完了
