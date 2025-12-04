import React, { useCallback, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { TimelineDataPoint, FilterSettings, TimeRange } from './types'
import { getEmotionColor } from '@/lib/utils'

// Merkle DAG: timeline.components.timeline_chart
// 時系列チャートコンポーネント

/**
 * タイムスタンプをDateオブジェクトに変換（ミリ秒単位を前提）
 */
function toDate(ts: number | null | undefined): Date {
  // undefined/nullのチェック
  if (ts == null || typeof ts !== 'number' || isNaN(ts)) {
    console.warn('Invalid timestamp:', ts)
    return new Date() // フォールバック
  }
  // timestampがミリ秒単位であることを確認（1e12 = 2001-09-09 01:46:40 UTC）
  // それより小さい場合は秒単位とみなして1000倍
  const ms = ts > 1e12 ? ts : ts * 1000
  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp:', ts)
    return new Date() // フォールバック
  }
  return date
}
interface TimelineChartProps {
  data: TimelineDataPoint[]
  filters: FilterSettings
  width: number
  height: number
  timeRange: TimeRange | null
  onDataPointSelect: (point: TimelineDataPoint | null) => void
  onTooltipShow: (event: MouseEvent, point: TimelineDataPoint) => void
  onTooltipHide: () => void
  onTimeRangeChange?: (range: TimeRange | null) => void
}

export default function TimelineChart({
  data,
  filters,
  width,
  height,
  timeRange,
  onDataPointSelect,
  onTooltipShow,
  onTooltipHide,
  onTimeRangeChange
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const overviewSvgRef = useRef<SVGSVGElement>(null)
  const onTimeRangeChangeRef = useRef(onTimeRangeChange)
  const isUpdatingBrushRef = useRef(false)
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null)
  
  // onTimeRangeChangeの参照を最新に保つ
  useEffect(() => {
    onTimeRangeChangeRef.current = onTimeRangeChange
  }, [onTimeRangeChange])

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

    // 時間範囲（x は単調増加前提のため昇順に整列）
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)
    const extent = d3.extent(sorted, d => toDate(d.timestamp))
    if (!extent[0] || !extent[1]) {
      return // データが無効な場合は何も描画しない
    }
    const timeExtent = extent as [Date, Date]
    
    // 時間範囲が同じ場合の処理
    if (timeExtent[0].getTime() === timeExtent[1].getTime()) {
      timeExtent[1] = new Date(timeExtent[0].getTime() + 60000) // 1分追加
    }
    
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, overviewWidth])
      .nice()

    // 反応値のスケール（NaNを防ぐ）
    const reactionValueExtent = d3.extent(data, d => {
      const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
      return val;
    }) as [number, number];
    // 最小値と最大値が同じ場合の処理
    if (reactionValueExtent[0] === reactionValueExtent[1]) {
      reactionValueExtent[1] = reactionValueExtent[0] + 1;
    }
    const yScale = d3.scaleLinear()
      .domain(reactionValueExtent)
      .range([overviewHeight, 0])

    // メインライン（NaNを防ぐ）
    const line = d3.line<TimelineDataPoint>()
      .x(d => {
        const date = toDate(d.timestamp)
        return isNaN(date.getTime()) ? 0 : xScale(date)
      })
      .y(d => {
        const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0
        return yScale(val)
      })
      .defined(d => {
        const date = toDate(d.timestamp)
        const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue)
        return !isNaN(date.getTime()) && val
      })
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(sorted)
      .attr('class', 'overview-line')
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', '#666')
      .style('stroke-width', 1)

    // 選択範囲のハイライト
    if (timeRange) {
      const startDate = toDate(timeRange.start)
      const endDate = toDate(timeRange.end)
      g.append('rect')
        .attr('class', 'brush-area')
        .attr('x', xScale(startDate))
        .attr('y', 0)
        .attr('width', xScale(endDate) - xScale(startDate))
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
        .tickFormat(d3.timeFormat('%H:%M') as (domainValue: Date | d3.NumberValue, index: number) => string)
        .ticks(5)
      )
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666')

    // Brush機能を追加
    const brush = d3.brushX()
      .extent([[0, 0], [overviewWidth, overviewHeight]])
      .on('brush end', function(event) {
        // brush.moveによる更新中はイベントを無視（無限ループ防止）
        if (isUpdatingBrushRef.current) {
          return
        }
        
        if (!event.selection) {
          // 選択範囲が空の場合は全範囲にリセット
          if (onTimeRangeChangeRef.current) {
            const fullRange: TimeRange = {
              start: timeExtent[0].getTime(),
              end: timeExtent[1].getTime()
            }
            onTimeRangeChangeRef.current(fullRange)
          }
          return
        }

        const [x0, x1] = event.selection
        const startDate = xScale.invert(x0)
        const endDate = xScale.invert(x1)
        
        // Dateからtimestampに変換
        const startTimestamp = startDate.getTime()
        const endTimestamp = endDate.getTime()

        if (onTimeRangeChangeRef.current && startTimestamp !== endTimestamp) {
          onTimeRangeChangeRef.current({
            start: startTimestamp,
            end: endTimestamp
          })
        }
      })

    // Brushの参照を保存
    brushRef.current = brush

    // Brushを適用
    const brushGroup = g.append('g')
      .attr('class', 'brush')
      .call(brush)

    // 現在のtimeRangeに基づいてbrushの選択範囲を設定
    if (timeRange) {
      const startDate = toDate(timeRange.start)
      const endDate = toDate(timeRange.end)
      const expectedX0 = xScale(startDate)
      const expectedX1 = xScale(endDate)
      
      // 現在のbrushの選択範囲を取得
      const currentSelection = d3.brushSelection(brushGroup.node() as SVGGElement) as [number, number] | null
      
      // 選択範囲が異なる場合のみ更新（無限ループを防ぐ）
      if (!currentSelection || 
          Math.abs((currentSelection[0] as number) - expectedX0) > 1 || 
          Math.abs((currentSelection[1] as number) - expectedX1) > 1) {
        isUpdatingBrushRef.current = true
        brushGroup.call(brush.move, [expectedX0, expectedX1])
        // 次のフレームでフラグをリセット
        requestAnimationFrame(() => {
          isUpdatingBrushRef.current = false
        })
      }
    }

  }, [data, width, timeRange, onTimeRangeChange])

  const renderTimeline = useCallback(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // フィルタリングされたデータ（無効なtimestampを除外）
    const filteredData = (timeRange
      ? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data
    ).filter(d => d.timestamp != null && typeof d.timestamp === 'number' && !isNaN(d.timestamp))
    const filteredDataSorted = [...filteredData].sort((a, b) => a.timestamp - b.timestamp)

    // データがない場合の処理
    if (filteredDataSorted.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text('データがありません')
      return
    }

    // スケール設定
    let timeExtent: [Date, Date]
    if (timeRange) {
      timeExtent = [toDate(timeRange.start), toDate(timeRange.end)]
    } else {
      const extent = d3.extent(filteredDataSorted, d => toDate(d.timestamp))
      if (!extent[0] || !extent[1]) {
        // データが無効な場合のフォールバック
        const now = new Date()
        timeExtent = [new Date(now.getTime() - 60000), now]
      } else {
        timeExtent = extent as [Date, Date]
      }
    }

    // 時間範囲が同じ場合の処理（最小幅を確保）
    if (timeExtent[0].getTime() === timeExtent[1].getTime()) {
      timeExtent[1] = new Date(timeExtent[0].getTime() + 60000) // 1分追加
    }

    // 時間範囲が無効な場合の処理
    if (isNaN(timeExtent[0].getTime()) || isNaN(timeExtent[1].getTime())) {
      console.error('Invalid time extent:', timeExtent)
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#dc2626')
        .text('時間範囲が無効です')
      return
    }

    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth])
      .nice() // 目盛りを自動調整

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
    const yAxisCount = 7; // 反応値、反応時間、生理閾値、Burst感情、Face感情、Language感情、Prosody感情
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

    // 感情データをfileTypeで分類
    const burstEmotions = filteredDataSorted.flatMap(d => 
      d.emotions.filter(e => e.fileType === 'burst').map(e => e.score)
    );
    const faceEmotions = filteredDataSorted.flatMap(d => 
      d.emotions.filter(e => e.fileType === 'face').map(e => e.score)
    );
    const languageEmotions = filteredDataSorted.flatMap(d => 
      d.emotions.filter(e => e.fileType === 'language').map(e => e.score)
    );
    const prosodyEmotions = filteredDataSorted.flatMap(d => 
      d.emotions.filter(e => e.fileType === 'prosody').map(e => e.score)
    );

    // domainの計算を統一（最小値と最大値の両方を考慮）
    const burstEmotionExtent = burstEmotions.length > 0 
      ? (d3.extent(burstEmotions) as [number, number])
      : [0, 1];
    const faceEmotionExtent = faceEmotions.length > 0 
      ? (d3.extent(faceEmotions) as [number, number])
      : [0, 1];
    const languageEmotionExtent = languageEmotions.length > 0 
      ? (d3.extent(languageEmotions) as [number, number])
      : [0, 1];
    const prosodyEmotionExtent = prosodyEmotions.length > 0 
      ? (d3.extent(prosodyEmotions) as [number, number])
      : [0, 1];

    const burstEmotionScale = d3.scaleLinear()
      .domain(burstEmotionExtent[0] === burstEmotionExtent[1] 
        ? [0, Math.max(1, burstEmotionExtent[1])] 
        : burstEmotionExtent)
      .range([axisHeight * 3.5, axisHeight * 3.1]);

    const faceEmotionScale = d3.scaleLinear()
      .domain(faceEmotionExtent[0] === faceEmotionExtent[1] 
        ? [0, Math.max(1, faceEmotionExtent[1])] 
        : faceEmotionExtent)
      .range([axisHeight * 4.5, axisHeight * 4.1]);

    const languageEmotionScale = d3.scaleLinear()
      .domain(languageEmotionExtent[0] === languageEmotionExtent[1] 
        ? [0, Math.max(1, languageEmotionExtent[1])] 
        : languageEmotionExtent)
      .range([axisHeight * 5.5, axisHeight * 5.1]);

    const prosodyEmotionScale = d3.scaleLinear()
      .domain(prosodyEmotionExtent[0] === prosodyEmotionExtent[1] 
        ? [0, Math.max(1, prosodyEmotionExtent[1] ?? 0)] 
        : prosodyEmotionExtent as [number, number])
      .range([axisHeight * 6.5, axisHeight * 6.1]);

    // 単語表示（時間軸上）
    if (filters.wordDisplay && filters.showWordLabels) {
      g.selectAll('.word-label')
        .data(filteredDataSorted.filter(d => d.word))
        .enter()
        .append('text')
        .attr('class', 'word-label')
        .attr('x', d => {
          const x = xScale(toDate(d.timestamp))
          return x != null && !isNaN(x) ? x : 0
        })
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
        .data(filteredDataSorted.filter(d => d.reactionValue != null))
        .enter()
        .append('circle')
        .attr('class', 'reaction-value-point')
        .attr('cx', d => {
          const x = xScale(toDate(d.timestamp))
          return x != null && !isNaN(x) ? x : 0
        })
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
        .data(filteredDataSorted.filter(d => d.hasResponse && d.reactionTime != null))
        .enter()
        .append('circle')
        .attr('class', 'reaction-time-point')
        .attr('cx', d => {
          const x = xScale(toDate(d.timestamp))
          return x != null && !isNaN(x) ? x : 0
        })
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
        .data(filteredDataSorted.filter(d => {
          const p = d.physiological as unknown
          return Array.isArray(p) ? p.length > 0 : typeof p === 'object'
        }))
        .enter()
        .append('circle')
        .attr('class', 'physiological-point')
        .attr('cx', d => {
          const x = xScale(toDate(d.timestamp))
          return x != null && !isNaN(x) ? x : 0
        })
        .attr('cy', d => {
          const p = d.physiological as unknown
          if (Array.isArray(p)) return physiologicalScale(0)
          if (p && typeof p === 'object') {
            const avg = (p as Record<string, unknown>).average
            return physiologicalScale(typeof avg === 'number' ? avg : 0)
          }
          return physiologicalScale(0)
        })
        .attr('r', 3)
        .style('fill', '#16a34a')
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer');
    }

    // 感情変化（4種類に分けて表示）
    if (filters.emotionChange) {
      // Burst感情
      filteredDataSorted.forEach(d => {
        if (d.timestamp == null || typeof d.timestamp !== 'number' || isNaN(d.timestamp)) return
        d.emotions.filter(e => e.fileType === 'burst').forEach(emotion => {
          const x = xScale(toDate(d.timestamp))
          if (x == null || isNaN(x)) return
          g.append('circle')
            .attr('class', 'emotion-burst-point')
            .attr('cx', x)
            .attr('cy', burstEmotionScale(emotion.score))
            .attr('r', 3)
            .style('fill', '#9333ea')
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              onDataPointSelect(d)
              onTooltipShow(event, d)
            })
            .on('mouseout', () => {
              onDataPointSelect(null)
              onTooltipHide()
            });
        });
      });

      // Face感情
      filteredDataSorted.forEach(d => {
        if (d.timestamp == null || typeof d.timestamp !== 'number' || isNaN(d.timestamp)) return
        d.emotions.filter(e => e.fileType === 'face').forEach(emotion => {
          const x = xScale(toDate(d.timestamp))
          if (x == null || isNaN(x)) return
          g.append('circle')
            .attr('class', 'emotion-face-point')
            .attr('cx', x)
            .attr('cy', faceEmotionScale(emotion.score))
            .attr('r', 3)
            .style('fill', '#ec4899')
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              onDataPointSelect(d)
              onTooltipShow(event, d)
            })
            .on('mouseout', () => {
              onDataPointSelect(null)
              onTooltipHide()
            });
        });
      });

      // Language感情
      filteredDataSorted.forEach(d => {
        if (d.timestamp == null || typeof d.timestamp !== 'number' || isNaN(d.timestamp)) return
        d.emotions.filter(e => e.fileType === 'language').forEach(emotion => {
          const x = xScale(toDate(d.timestamp))
          if (x == null || isNaN(x)) return
          g.append('circle')
            .attr('class', 'emotion-language-point')
            .attr('cx', x)
            .attr('cy', languageEmotionScale(emotion.score))
            .attr('r', 3)
            .style('fill', '#10b981')
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              onDataPointSelect(d)
              onTooltipShow(event, d)
            })
            .on('mouseout', () => {
              onDataPointSelect(null)
              onTooltipHide()
            });
        });
      });

      // Prosody感情
      filteredDataSorted.forEach(d => {
        if (d.timestamp == null || typeof d.timestamp !== 'number' || isNaN(d.timestamp)) return
        d.emotions.filter(e => e.fileType === 'prosody').forEach(emotion => {
          const x = xScale(toDate(d.timestamp))
          if (x == null || isNaN(x)) return
          g.append('circle')
            .attr('class', 'emotion-prosody-point')
            .attr('cx', x)
            .attr('cy', prosodyEmotionScale(emotion.score))
            .attr('r', 3)
            .style('fill', '#f59e0b')
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              onDataPointSelect(d)
              onTooltipShow(event, d)
            })
            .on('mouseout', () => {
              onDataPointSelect(null)
              onTooltipHide()
            });
        });
      });
    }

    // 感情データの詳細表示（fileTypeに応じて適切なスケールを使用）
    if (filters.showEmotionDetails) {
      filteredDataSorted.forEach(d => {
        // timestampが無効な場合はスキップ
        if (d.timestamp == null || typeof d.timestamp !== 'number' || isNaN(d.timestamp)) {
          return
        }
        
        if (d.emotions.length > 0) {
          // 感情データポイントを個別に表示
          d.emotions.forEach((emotion) => {
            // fileTypeに応じて適切なスケールを選択
            let emotionYScale: d3.ScaleLinear<number, number>;
            
            switch (emotion.fileType) {
              case 'burst':
                emotionYScale = burstEmotionScale;
                break;
              case 'face':
                emotionYScale = faceEmotionScale;
                break;
              case 'language':
                emotionYScale = languageEmotionScale;
                break;
              case 'prosody':
                emotionYScale = prosodyEmotionScale;
                break;
              default:
                emotionYScale = burstEmotionScale;
            }

            const xPos = xScale(toDate(d.timestamp))
            const yPos = emotionYScale(emotion.score)
            
            // xPosまたはyPosが無効な場合はスキップ
            if (xPos == null || isNaN(xPos) || yPos == null || isNaN(yPos)) {
              return
            }

            const emotionGroup = g.append('g')
              .attr('class', 'emotion-detail-group')
              .attr('transform', `translate(${xPos}, ${yPos})`)

            // 感情の色を決定（データベースから取得した色情報を優先、フォールバックはgetEmotionColor）
            const color = emotion.color || getEmotionColor(emotion.name || 'unknown')

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

    // 線の描画（反応値）（NaNを防ぐ）
    if (filters.reactionValues) {
      const line = d3.line<TimelineDataPoint>()
        .x(d => {
          const date = toDate(d.timestamp)
          return isNaN(date.getTime()) ? 0 : xScale(date)
        })
        .y(d => {
          const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0
          return yScale(val)
        })
        .defined(d => {
          const date = toDate(d.timestamp)
          const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue)
          return !isNaN(date.getTime()) && val
        })
        .curve(d3.curveMonotoneX)

      g.append('path')
        .datum(filteredDataSorted)
        .attr('class', 'reaction-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2)
    }

    // 軸の描画
    // 時間範囲に応じてフォーマットを変更
    const timeSpan = timeExtent[1].getTime() - timeExtent[0].getTime()
    const hours = timeSpan / (1000 * 60 * 60)
    
    let timeFormat: (date: Date) => string
    let tickCount: number
    
    if (hours < 1) {
      // 1時間未満: 分:秒
      timeFormat = d3.timeFormat('%M:%S') as (date: Date) => string
      tickCount = Math.min(10, Math.max(5, Math.floor(innerWidth / 80)))
    } else if (hours < 24) {
      // 24時間未満: 時:分:秒
      timeFormat = d3.timeFormat('%H:%M:%S') as (date: Date) => string
      tickCount = Math.min(12, Math.max(6, Math.floor(innerWidth / 100)))
    } else {
      // 24時間以上: 日付 + 時:分
      timeFormat = d3.timeFormat('%m/%d %H:%M') as (date: Date) => string
      tickCount = Math.min(15, Math.max(8, Math.floor(innerWidth / 120)))
    }

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(timeFormat as (domainValue: Date | d3.NumberValue, index: number) => string)
        .ticks(tickCount)
      )
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#666')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em')

    // 各Y軸の描画
    // 反応値軸
    g.append('g')
      .attr('class', 'y-axis-reaction-value')
      .attr('transform', `translate(0,${axisHeight * 0.3})`)
      .call(d3.axisLeft(reactionValueScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('opacity', filters.reactionValues ? 1 : 0.3);

    // 反応時間軸
    g.append('g')
      .attr('class', 'y-axis-reaction-time')
      .attr('transform', `translate(0,${axisHeight * 1.3})`)
      .call(d3.axisLeft(reactionTimeScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('opacity', filters.reactionTime ? 1 : 0.3);

    // 生理閾値軸
    g.append('g')
      .attr('class', 'y-axis-physiological')
      .attr('transform', `translate(0,${axisHeight * 2.3})`)
      .call(d3.axisLeft(physiologicalScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('opacity', filters.physiologicalThreshold ? 1 : 0.3);

    // Burst感情軸
    g.append('g')
      .attr('class', 'y-axis-emotion-burst')
      .attr('transform', `translate(0,${axisHeight * 3.3})`)
      .call(d3.axisLeft(burstEmotionScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#9333ea')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    // Face感情軸
    g.append('g')
      .attr('class', 'y-axis-emotion-face')
      .attr('transform', `translate(0,${axisHeight * 4.3})`)
      .call(d3.axisLeft(faceEmotionScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#ec4899')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    // Language感情軸
    g.append('g')
      .attr('class', 'y-axis-emotion-language')
      .attr('transform', `translate(0,${axisHeight * 5.3})`)
      .call(d3.axisLeft(languageEmotionScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#10b981')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    // Prosody感情軸
    g.append('g')
      .attr('class', 'y-axis-emotion-prosody')
      .attr('transform', `translate(0,${axisHeight * 6.3})`)
      .call(d3.axisLeft(prosodyEmotionScale).ticks(3))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#f59e0b')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

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

    // 感情変化のY軸ラベル（4種類）
    g.append('text')
      .attr('class', 'y-label-emotion-burst')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 3.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#9333ea')
      .text('Burst感情')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-emotion-face')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 4.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#ec4899')
      .text('Face感情')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-emotion-language')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 5.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#10b981')
      .text('Language感情')
      .style('opacity', filters.emotionChange ? 1 : 0.3);

    g.append('text')
      .attr('class', 'y-label-emotion-prosody')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (axisHeight * 6.5))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#f59e0b')
      .text('Prosody感情')
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
        .style('fill', (d: string) => emotionColors[d] ?? '#ccc')
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
  }, [data, filters, width, height, timeRange, onDataPointSelect, onTooltipShow, onTooltipHide, svgRef])

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
