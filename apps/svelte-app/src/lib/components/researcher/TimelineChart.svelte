<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { TimelineDataPoint, FilterSettings, TimeRange } from './types';
  import { normalizeEmotionName } from '$lib/researcher/emotion-normalization';

  interface Props {
    data: TimelineDataPoint[];
    filters: FilterSettings;
    width: number;
    height: number;
    timeRange: TimeRange | null;
    analysisResults?: {
      gap_areas?: any[];
      gapAreas?: any[];
      density_regions?: any[];
      densityRegions?: any[];
    };
    onDataPointSelect: (point: TimelineDataPoint | null) => void;
    onTooltipShow: (event: any, point: TimelineDataPoint) => void;
    onTooltipHide: () => void;
    onTimeRangeChange?: (range: TimeRange | null) => void;
  }

  let {
    data,
    filters,
    width,
    height,
    timeRange,
    analysisResults,
    onDataPointSelect,
    onTooltipShow,
    onTooltipHide,
    onTimeRangeChange
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined = $state();
  let overviewSvgElement: SVGSVGElement | undefined = $state();
  
  let isUpdatingBrush = false;

  function toDate(ts: number | null | undefined): Date {
    if (ts == null || typeof ts !== 'number' || isNaN(ts)) return new Date();
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms);
  }

  $effect(() => {
    if (svgElement && data.length > 0) renderTimeline();
  });

  $effect(() => {
    if (overviewSvgElement && data.length > 0) renderOverviewChart();
  });

  function renderOverviewChart() {
    if (!overviewSvgElement) return;
    const svg = d3.select(overviewSvgElement);
    svg.selectAll('*').remove();

    const margin = { top: 5, right: 30, bottom: 25, left: 50 };
    const overviewWidth = width - margin.left - margin.right;
    const overviewHeight = 80 - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const extent = d3.extent(sorted, d => toDate(d.timestamp)) as [Date, Date];
    if (!extent[0] || !extent[1]) return;
    
    if (extent[0].getTime() === extent[1].getTime()) {
      extent[1] = new Date(extent[0].getTime() + 60000);
    }

    const xScale = d3.scaleTime().domain(extent).range([0, overviewWidth]);
    const reactionValueExtent = d3.extent(data, d => Number(d.reactionValue) || 0) as [number, number];
    if (reactionValueExtent[0] === reactionValueExtent[1]) reactionValueExtent[1] += 1;
    const yScale = d3.scaleLinear().domain(reactionValueExtent).range([overviewHeight, 0]);

    // Area chart for overview
    const area = d3.area<TimelineDataPoint>()
      .x(d => xScale(toDate(d.timestamp)))
      .y0(overviewHeight)
      .y1(d => yScale(Number(d.reactionValue) || 0))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sorted)
      .attr('d', area)
      .attr('class', 'fill-blue-500/10 stroke-blue-500/30')
      .style('stroke-width', 1);

    const brush = d3.brushX().extent([[0, 0], [overviewWidth, overviewHeight]])
      .on('brush end', (event) => {
        if (isUpdatingBrush) return;
        if (!event.selection) {
          onTimeRangeChange?.({ start: extent[0].getTime(), end: extent[1].getTime() });
          return;
        }
        const [x0, x1] = event.selection;
        onTimeRangeChange?.({ start: xScale.invert(x0).getTime(), end: xScale.invert(x1).getTime() });
      });

    const brushGroup = g.append('g').attr('class', 'brush').call(brush);

    // Style the brush selection
    brushGroup.selectAll('.selection')
      .attr('stroke', 'none')
      .attr('fill', 'rgba(59, 130, 246, 0.2)');

    if (timeRange) {
      const x0 = xScale(toDate(timeRange.start));
      const x1 = xScale(toDate(timeRange.end));
      isUpdatingBrush = true;
      brushGroup.call(brush.move, [x0, x1]);
      requestAnimationFrame(() => isUpdatingBrush = false);
    }

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d3.timeFormat('%H:%M') as any)
      .tickSize(0)
      .tickPadding(10);

    g.append('g')
      .attr('transform', `translate(0,${overviewHeight})`)
      .attr('class', 'text-gray-400 text-[10px]')
      .call(xAxis)
      .select('.domain').remove();
  }

  function renderTimeline() {
    if (!svgElement) return;
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 60, bottom: 40, left: 200 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const filteredData = (timeRange ? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end) : data)
      .filter(d => d.timestamp != null && !isNaN(d.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    const extent = timeRange ? [toDate(timeRange.start), toDate(timeRange.end)] : (d3.extent(filteredData, d => toDate(d.timestamp)) as [Date, Date]);
    if (extent[0].getTime() === extent[1].getTime()) extent[1] = new Date(extent[0].getTime() + 60000);

    const xScale = d3.scaleTime().domain(extent).range([0, innerWidth]);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const sections = [
      { id: 'rv', label: 'Reaction Value', color: '#3b82f6' },
      { id: 'rt', label: 'Reaction Time', color: '#ef4444' },
      { id: 'phys', label: 'Physiological', color: '#10b981' },
      { id: 'emo', label: 'Emotions', color: '#8b5cf6' }
    ];

    const sectionHeight = innerHeight / sections.length;

    // Draw grid and labels
    sections.forEach((s, i) => {
      const y0 = i * sectionHeight;
      const y1 = (i + 1) * sectionHeight;
      
      // Section background
      if (i % 2 === 0) {
        g.append('rect')
          .attr('x', 0)
          .attr('y', y0)
          .attr('width', innerWidth)
          .attr('height', sectionHeight)
          .attr('class', 'fill-gray-50/50 dark:fill-gray-800/20');
      }

      // Horizontal separator
      if (i > 0) {
        g.append('line')
          .attr('x1', 0)
          .attr('y1', y0)
          .attr('x2', innerWidth)
          .attr('y2', y0)
          .attr('class', 'stroke-gray-100 dark:stroke-gray-800');
      }

      // Label with Color Indicator
      const labelGroup = g.append('g')
        .attr('transform', `translate(-30, ${y0 + sectionHeight / 2})`);

      labelGroup.append('text')
        .attr('x', -15)
        .attr('y', 0)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'fill-gray-600 dark:fill-gray-300 text-[11px] font-black uppercase tracking-widest')
        .style('font-family', 'Inter, system-ui, sans-serif')
        .text(s.label);

      labelGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('fill', s.color)
        .attr('class', 'filter drop-shadow-sm');
    });

    // Reaction Value Line
    if (filters.reactionValues) {
      const rvExtent = [0, d3.max(data, d => Number(d.reactionValue) || 0) || 1] as [number, number];
      const rvScale = d3.scaleLinear().domain(rvExtent).range([sectionHeight - 10, 10]);

      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(toDate(d.timestamp)))
        .y(d => rvScale(Number(d.reactionValue) || 0))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(filteredData)
        .attr('d', line)
        .attr('class', 'fill-none stroke-blue-500')
        .style('stroke-width', 2.5)
        .style('stroke-linecap', 'round');

      // Points for RV (Only show for stimulus words to avoid clutter)
      g.selectAll('.rv-dot')
        .data(filteredData.filter(d => d.word && d.word !== 'Unknown'))
        .enter()
        .append('circle')
        .attr('cx', d => xScale(toDate(d.timestamp)))
        .attr('cy', d => rvScale(Number(d.reactionValue) || 0))
        .attr('r', 4)
        .attr('class', 'fill-white stroke-blue-500')
        .style('stroke-width', 2);
    }

    // Reaction Time (Points)
    if (filters.reactionTime) {
      const rtExtent = [0, d3.max(data, d => Number(d.reactionTime) || 0) || 5000] as [number, number];
      const rtScale = d3.scaleLinear().domain(rtExtent).range([sectionHeight * 2 - 10, sectionHeight + 10]);

      g.selectAll('.rt-dot')
        .data(filteredData.filter(d => d.hasResponse))
        .enter()
        .append('circle')
        .attr('cx', d => xScale(toDate(d.timestamp)))
        .attr('cy', d => rtScale(Number(d.reactionTime) || 0))
        .attr('r', 4)
        .attr('class', 'fill-red-500');
    }

    // Physiological
    if (filters.physiological) {
      // Scale for Ch3 (arousal proxy)
      const physScale = d3.scaleLinear().domain([0, 3]).range([sectionHeight * 3 - 10, sectionHeight * 2 + 10]);
      
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(toDate(d.timestamp)))
        .y(d => {
          // physiological is now a compact number array (first element is Ch3)
          const ch3 = (d.physiological && d.physiological.length > 0) ? (d.physiological[0] as number) : 0;
          return physScale(ch3);
        })
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(filteredData)
        .attr('d', line)
        .attr('class', 'fill-none stroke-emerald-500')
        .style('stroke-width', 2);
        
      // Add background for physiological lane
      g.append('path')
        .datum(filteredData)
        .attr('d', d3.area<TimelineDataPoint>()
          .x(d => xScale(toDate(d.timestamp)))
          .y0(sectionHeight * 3 - 5)
          .y1(d => {
            const ch3 = (d.physiological && d.physiological.length > 0) ? (d.physiological[0] as number) : 0;
            return physScale(ch3);
          })
          .curve(d3.curveMonotoneX)
        )
        .attr('class', 'fill-emerald-500/10 stroke-none');
    }

    // Emotions (Detailed classification)
    const emotionConfig = [
      { key: 'joy', label: 'Joy', color: '#f59e0b' },
      { key: 'sadness', label: 'Sadness', color: '#374151' },
      { key: 'anger', label: 'Anger', color: '#ef4444' },
      { key: 'fear', label: 'Fear', color: '#a78bfa' },
      { key: 'surprise', label: 'Surprise', color: '#22c55e' },
      { key: 'disgust', label: 'Disgust', color: '#10b981' },
      { key: 'calm', label: 'Calm', color: '#93c5fd' },
      { key: 'focus', label: 'Focus', color: '#60a5fa' },
      { key: 'excitement', label: 'Excitement', color: '#f97316' },
      { key: 'confusion', label: 'Confusion', color: '#64748b' }
    ];
    
    const emoLaneHeight = (sectionHeight - 20) / emotionConfig.length;
    
    emotionConfig.forEach((config, i) => {
      const y0 = sectionHeight * 3 + 10 + i * emoLaneHeight;
      
      g.append('text')
        .attr('x', innerWidth + 5)
        .attr('y', y0 + emoLaneHeight / 2)
        .attr('class', 'fill-gray-400 text-[7px] uppercase font-bold')
        .attr('dominant-baseline', 'middle')
        .text(config.label);

      filteredData.forEach(d => {
        // Group emotions by normalized name and take the max score
        const normalizedEmos: Record<string, number> = {};
        d.emotions.forEach(e => {
          const normName = normalizeEmotionName(e.name);
          if (normName) {
            normalizedEmos[normName] = Math.max(normalizedEmos[normName] || 0, e.score);
          }
        });

        const score = normalizedEmos[config.key];
        if (score && score > 0.05) {
          g.append('rect')
            .attr('x', xScale(toDate(d.timestamp)) - 1)
            .attr('y', y0)
            .attr('width', 2)
            .attr('height', emoLaneHeight - 1)
            .attr('rx', 0.5)
            .attr('fill', config.color)
            .style('opacity', Math.max(0.3, score));
        }
      });
    });

    // Final X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(innerWidth > 800 ? 10 : 5)
      .tickFormat(d3.timeFormat('%H:%M:%S') as any)
      .tickSize(-innerHeight)
      .tickPadding(15);

    const gx = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('class', 'text-gray-400 text-[10px]')
      .call(xAxis);

    gx.select('.domain').remove();
    gx.selectAll('.tick line').attr('class', 'stroke-gray-100 dark:stroke-gray-800').style('stroke-dasharray', '2,2');

    // Analysis Overlays
    if (analysisResults) {
      const analysisG = g.append('g').attr('class', 'analysis-overlays');

      // Highlight Gap Areas on Timeline
      const gapAreas = analysisResults.gap_areas ?? analysisResults.gapAreas ?? [];
      gapAreas.forEach((gap: any) => {
        const nearbyNodes = gap.nearby_nodes ?? gap.nearbyNodes ?? [];
        const nodeLabels = nearbyNodes.map((n: any) => n.label) || [];
        const gapPoints = data.filter(d => nodeLabels.includes(d.word));
        if (gapPoints.length >= 2) {
          const tMin = Math.min(...gapPoints.map(p => p.timestamp));
          const tMax = Math.max(...gapPoints.map(p => p.timestamp));
          
          analysisG.append('rect')
            .attr('x', xScale(toDate(tMin)))
            .attr('y', 0)
            .attr('width', Math.max(2, xScale(toDate(tMax)) - xScale(toDate(tMin))))
            .attr('height', innerHeight)
            .attr('class', 'fill-yellow-400/5 stroke-yellow-400/20')
            .style('stroke-dasharray', '4,2');
            
          analysisG.append('text')
            .attr('x', xScale(toDate(tMin)))
            .attr('y', -5)
            .attr('class', 'fill-yellow-600 text-[8px] font-black uppercase')
            .text('Potential Gap');
        }
      });
    }
  }
</script>

<div class="space-y-6">
  <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
    <svg bind:this={svgElement} {width} {height} class="w-full h-auto timeline-chart-svg"></svg>
  </div>
  
  <div class="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold">🔍</span>
        <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest">Time Range Navigator</h4>
      </div>
      {#if timeRange}
        <div class="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
          {toDate(timeRange.start).toLocaleTimeString()} — {toDate(timeRange.end).toLocaleTimeString()}
        </div>
      {/if}
    </div>
    <div class="relative">
      <svg bind:this={overviewSvgElement} {width} height="80" class="w-full h-auto overflow-visible"></svg>
    </div>
  </div>
</div>
