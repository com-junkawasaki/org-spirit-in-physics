<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { TimelineDataPoint, FilterSettings, TimeRange } from './types';

  interface Props {
    data: TimelineDataPoint[];
    filters: FilterSettings;
    width: number;
    height: number;
    timeRange: TimeRange | null;
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

    const margin = { top: 30, right: 40, bottom: 40, left: 80 };
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

      // Label
      g.append('text')
        .attr('x', -15)
        .attr('y', y0 + sectionHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'fill-gray-400 text-[10px] font-bold uppercase tracking-wider')
        .text(s.label);
    });

    // Reaction Value Line
    if (filters.reactionValues) {
      const rvExtent = d3.extent(data, d => Number(d.reactionValue) || 0) as [number, number];
      if (rvExtent[0] === rvExtent[1]) rvExtent[1] += 0.1;
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

      // Points for RV
      g.selectAll('.rv-dot')
        .data(filteredData)
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
      const rtExtent = d3.extent(data, d => Number(d.reactionTime) || 0) as [number, number];
      if (rtExtent[0] === rtExtent[1]) rtExtent[1] += 100;
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
      const physScale = d3.scaleLinear().domain([0, 100]).range([sectionHeight * 3 - 10, sectionHeight * 2 + 10]);
      
      // Draw simulated phys line for now if real data is missing
      const line = d3.line<TimelineDataPoint>()
        .x(d => xScale(toDate(d.timestamp)))
        .y(d => physScale(50 + Math.sin(d.timestamp / 1000) * 20))
        .curve(d3.curveBasis);

      g.append('path')
        .datum(filteredData)
        .attr('d', line)
        .attr('class', 'fill-none stroke-emerald-500/50')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '4,4');
    }

    // Emotions (Modality lanes)
    const emoLanes = ['burst', 'face', 'language', 'prosody'];
    const emoLaneHeight = (sectionHeight - 20) / emoLanes.length;
    
    emoLanes.forEach((lane, i) => {
      const y0 = sectionHeight * 3 + 10 + i * emoLaneHeight;
      
      g.append('text')
        .attr('x', innerWidth + 5)
        .attr('y', y0 + emoLaneHeight / 2)
        .attr('class', 'fill-gray-300 text-[8px] uppercase font-medium')
        .attr('dominant-baseline', 'middle')
        .text(lane);

      filteredData.forEach(d => {
        const laneEmos = d.emotions.filter(e => e.fileType === lane);
        if (laneEmos.length > 0) {
          const maxEmo = laneEmos.sort((a, b) => b.score - a.score)[0];
          g.append('rect')
            .attr('x', xScale(toDate(d.timestamp)) - 2)
            .attr('y', y0)
            .attr('width', 4)
            .attr('height', emoLaneHeight - 2)
            .attr('rx', 1)
            .attr('class', 'fill-violet-500')
            .style('opacity', maxEmo.score);
        }
      });
    });

    // Final X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d3.timeFormat('%H:%M:%S') as any)
      .tickSize(-innerHeight)
      .tickPadding(15);

    const gx = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('class', 'text-gray-400 text-[10px]')
      .call(xAxis);

    gx.select('.domain').remove();
    gx.selectAll('.tick line').attr('class', 'stroke-gray-100 dark:stroke-gray-800').style('stroke-dasharray', '2,2');
  }
</script>

<div class="space-y-6">
  <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
    <svg bind:this={svgElement} {width} {height} class="w-full h-auto"></svg>
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
