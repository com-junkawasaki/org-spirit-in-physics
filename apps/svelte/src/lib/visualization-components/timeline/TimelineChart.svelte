<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { TimelineDataPoint, FilterSettings, TimeRange } from '../types';

	// D3はブラウザでのみ動的インポート
	let d3: typeof import('d3') | null = null;

	const {
		data = [],
		filters = {
			emotions: true,
			physiological: true,
			reactionValues: true,
			wordDisplay: true,
			reactionTime: true,
			physiologicalThreshold: true,
			emotionChange: true,
			range: 200,
			timeScale: 1.0,
			verticalScale: 1.0,
			showEmotionDetails: true,
			showWordLabels: true
		},
		width = 800,
		height = 400,
		timeRange = null as TimeRange | null,
		onDataPointSelect = undefined as ((point: TimelineDataPoint | null) => void) | undefined,
		onTooltipShow = undefined as ((event: MouseEvent, point: TimelineDataPoint) => void) | undefined,
		onTooltipHide = undefined as (() => void) | undefined,
		onTimeRangeChange = undefined as ((range: TimeRange | null) => void) | undefined,
		onRenderStateChange = undefined as ((state: any) => void) | undefined
	}: {
		data?: TimelineDataPoint[];
		filters?: FilterSettings;
		width?: number;
		height?: number;
		timeRange?: TimeRange | null;
		onDataPointSelect?: ((point: TimelineDataPoint | null) => void) | undefined;
		onTooltipShow?: ((event: MouseEvent, point: TimelineDataPoint) => void) | undefined;
		onTooltipHide?: (() => void) | undefined;
		onTimeRangeChange?: ((range: TimeRange | null) => void) | undefined;
		onRenderStateChange?: ((state: any) => void) | undefined;
	} = $props();

	let svgRef: SVGSVGElement;
	let overviewSvgRef: SVGSVGElement;
	let tooltipRef: HTMLDivElement;
	let brushRef: d3.BrushBehavior<unknown> | null = null;
	let isUpdatingBrush = false;

	/**
	 * タイムスタンプをDateオブジェクトに変換（ミリ秒単位を前提）
	 */
	function toDate(ts: number | null | undefined): Date {
		if (ts == null || typeof ts !== 'number' || isNaN(ts)) {
			console.warn('Invalid timestamp:', ts);
			return new Date();
		}
		const ms = ts > 1e12 ? ts : ts * 1000;
		const date = new Date(ms);
		if (isNaN(date.getTime())) {
			console.warn('Invalid timestamp:', ts);
			return new Date();
		}
		return date;
	}

	// D3はonMountで読み込む

	function renderOverviewChart() {
		if (!browser || !overviewSvgRef || !d3 || data.length === 0) return;

		const svg = d3.select(overviewSvgRef);
		svg.selectAll('*').remove();

		const margin = { top: 10, right: 20, bottom: 30, left: 20 };
		const overviewWidth = width - margin.left - margin.right;
		const overviewHeight = 80 - margin.top - margin.bottom;

		svg.attr('width', width).attr('height', 80);

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
		const extent = d3.extent(sorted, d => toDate(d.timestamp));
		if (!extent[0] || !extent[1]) return;
		const timeExtent = extent as [Date, Date];

		if (timeExtent[0].getTime() === timeExtent[1].getTime()) {
			timeExtent[1] = new Date(timeExtent[0].getTime() + 60000);
		}

		const xScale = d3.scaleTime()
			.domain(timeExtent)
			.range([0, overviewWidth])
			.nice();

		const reactionValueExtent = d3.extent(data, d => {
			const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
			return val;
		}) as [number, number];
		if (reactionValueExtent[0] === reactionValueExtent[1]) {
			reactionValueExtent[1] = reactionValueExtent[0] + 1;
		}
		const yScale = d3.scaleLinear()
			.domain(reactionValueExtent)
			.range([overviewHeight, 0]);

		const line = d3.line<TimelineDataPoint>()
			.x(d => {
				const date = toDate(d.timestamp);
				return isNaN(date.getTime()) ? 0 : xScale(date);
			})
			.y(d => {
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
				return yScale(val);
			})
			.defined(d => {
				const date = toDate(d.timestamp);
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue);
				return !isNaN(date.getTime()) && val;
			})
			.curve(d3.curveMonotoneX);

		g.append('path')
			.datum(sorted)
			.attr('class', 'overview-line')
			.attr('d', line)
			.style('fill', 'none')
			.style('stroke', '#666')
			.style('stroke-width', 1);

		if (timeRange) {
			const startDate = toDate(timeRange.start);
			const endDate = toDate(timeRange.end);
			g.append('rect')
				.attr('class', 'brush-area')
				.attr('x', xScale(startDate))
				.attr('y', 0)
				.attr('width', xScale(endDate) - xScale(startDate))
				.attr('height', overviewHeight)
				.style('fill', '#3b82f6')
				.style('opacity', 0.2)
				.style('stroke', '#3b82f6')
				.style('stroke-width', 1);
		}

		g.append('g')
			.attr('class', 'x-axis-overview')
			.attr('transform', `translate(0,${overviewHeight})`)
			.call(d3.axisBottom(xScale as any)
				.tickFormat(d3.timeFormat('%H:%M') as any)
				.ticks(5)
			)
			.selectAll('text')
			.style('font-size', '10px')
			.style('fill', '#666');

		const brush = d3.brushX()
			.extent([[0, 0], [overviewWidth, overviewHeight]])
			.on('brush end', function(event) {
				if (isUpdatingBrush) return;

				if (!event.selection) {
					if (onTimeRangeChange) {
						const fullRange: TimeRange = {
							start: timeExtent[0].getTime(),
							end: timeExtent[1].getTime()
						};
						onTimeRangeChange(fullRange);
					}
					return;
				}

				const [x0, x1] = event.selection as [number, number];
				const startDate = xScale.invert(x0);
				const endDate = xScale.invert(x1);
				const startTimestamp = startDate.getTime();
				const endTimestamp = endDate.getTime();

				if (onTimeRangeChange && startTimestamp !== endTimestamp) {
					onTimeRangeChange({
						start: startTimestamp,
						end: endTimestamp
					});
				}
			});

		brushRef = brush;

		const brushGroup = g.append('g')
			.attr('class', 'brush')
			.call(brush);

		if (timeRange) {
			const startDate = toDate(timeRange.start);
			const endDate = toDate(timeRange.end);
			const expectedX0 = xScale(startDate);
			const expectedX1 = xScale(endDate);

			const currentSelection = d3.brushSelection(brushGroup.node() as SVGGElement) as [number, number] | null;
			const sel0 = currentSelection?.[0];
			const sel1 = currentSelection?.[1];
			if (!currentSelection || currentSelection.length < 2 ||
				typeof sel0 !== 'number' || typeof sel1 !== 'number' ||
				Math.abs(sel0 - expectedX0) > 1 ||
				Math.abs(sel1 - expectedX1) > 1) {
				isUpdatingBrush = true;
				brushGroup.call(brush.move, [expectedX0, expectedX1]);
				requestAnimationFrame(() => {
					isUpdatingBrush = false;
				});
			}
		}
	}

	function renderTimeline() {
		if (!browser || !svgRef || !d3 || data.length === 0) {
			if (onRenderStateChange) {
				onRenderStateChange({
					canvasContextObtained: false,
					pointsRendered: 0,
					lastRenderTime: null,
					errors: ['Cannot render: missing browser, svgRef, d3, or data']
				});
			}
			return;
		}

		const svg = d3.select(svgRef);
		svg.selectAll('*').remove();

		const margin = { top: 20, right: 20, bottom: 60, left: 60 };
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		const filteredData = (timeRange
			? data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
			: data
		).filter(d => d.timestamp != null && typeof d.timestamp === 'number' && !isNaN(d.timestamp));
		const filteredDataSorted = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);

		if (filteredDataSorted.length === 0) {
			svg.append('text')
				.attr('x', width / 2)
				.attr('y', height / 2)
				.attr('text-anchor', 'middle')
				.style('font-size', '14px')
				.style('fill', '#666')
				.text('データがありません');
			return;
		}

		let timeExtent: [Date, Date];
		if (timeRange) {
			timeExtent = [toDate(timeRange.start), toDate(timeRange.end)];
		} else {
			const extent = d3.extent(filteredDataSorted, d => toDate(d.timestamp));
			if (!extent[0] || !extent[1]) {
				const now = new Date();
				timeExtent = [new Date(now.getTime() - 60000), now];
			} else {
				timeExtent = extent as [Date, Date];
			}
		}

		if (timeExtent[0].getTime() === timeExtent[1].getTime()) {
			timeExtent[1] = new Date(timeExtent[0].getTime() + 60000);
		}

		if (isNaN(timeExtent[0].getTime()) || isNaN(timeExtent[1].getTime())) {
			console.error('Invalid time extent:', timeExtent);
			return;
		}

		svg.attr('width', width).attr('height', height);

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const xScale = d3.scaleTime()
			.domain(timeExtent)
			.range([0, innerWidth]);

		const reactionValueExtent = d3.extent(filteredDataSorted, d => {
			const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
			return val;
		}) as [number, number];
		if (reactionValueExtent[0] === reactionValueExtent[1]) {
			reactionValueExtent[1] = reactionValueExtent[0] + 1;
		}
		const yScale = d3.scaleLinear()
			.domain(reactionValueExtent)
			.range([innerHeight, 0]);

		const line = d3.line<TimelineDataPoint>()
			.x(d => {
				const date = toDate(d.timestamp);
				return isNaN(date.getTime()) ? 0 : xScale(date);
			})
			.y(d => {
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
				return yScale(val);
			})
			.defined(d => {
				const date = toDate(d.timestamp);
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue);
				return !isNaN(date.getTime()) && val;
			})
			.curve(d3.curveMonotoneX);

		if (filters.reactionValues) {
			g.append('path')
				.datum(filteredDataSorted)
				.attr('class', 'timeline-line')
				.attr('d', line)
				.style('fill', 'none')
				.style('stroke', '#3b82f6')
				.style('stroke-width', 2);
		}

		if (filters.reactionValues) {
			g.selectAll('.data-point')
				.data(filteredDataSorted)
				.enter()
				.append('circle')
				.attr('class', 'data-point')
				.attr('cx', d => {
					const date = toDate(d.timestamp);
					return isNaN(date.getTime()) ? 0 : xScale(date);
				})
				.attr('cy', d => {
					const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
					return yScale(val);
				})
				.attr('r', 4)
				.style('fill', d => d.hasResponse ? '#10b981' : '#ef4444')
				.style('cursor', 'pointer')
				.on('mouseover', function(event, d) {
					d3.select(this).attr('r', 6);
					if (onTooltipShow) {
						onTooltipShow(event as MouseEvent, d);
					}
				})
				.on('mouseout', function() {
					d3.select(this).attr('r', 4);
					if (onTooltipHide) {
						onTooltipHide();
					}
				})
				.on('click', function(event, d) {
					if (onDataPointSelect) {
						onDataPointSelect(d);
					}
				});
		}

		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(d3.axisBottom(xScale as any)
				.tickFormat(d3.timeFormat('%H:%M:%S') as any)
			)
			.selectAll('text')
			.style('font-size', '12px')
			.style('fill', '#666');

		g.append('g')
			.attr('class', 'y-axis')
			.call(d3.axisLeft(yScale))
			.selectAll('text')
			.style('font-size', '12px')
			.style('fill', '#666');

		g.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', 0 - margin.left)
			.attr('x', 0 - (innerHeight / 2))
			.attr('dy', '1em')
			.style('text-anchor', 'middle')
			.style('font-size', '14px')
			.style('fill', '#666')
			.text('反応値');
		
		// レンダリング状態を通知
		if (onRenderStateChange) {
			onRenderStateChange({
				canvasContextObtained: true,
				pointsRendered: filteredDataSorted.length,
				lastRenderTime: Date.now(),
				errors: []
			});
		}
	}

	$effect(() => {
		if (browser && data.length > 0 && d3) {
			renderOverviewChart();
			renderTimeline();
		} else if (onRenderStateChange) {
			onRenderStateChange({
				canvasContextObtained: false,
				pointsRendered: 0,
				lastRenderTime: null,
				errors: [
					!browser ? 'Not in browser' : '',
					data.length === 0 ? 'No data' : '',
					!d3 ? 'D3 not loaded' : ''
				].filter(Boolean)
			});
		}
	});

	onMount(async () => {
		if (browser) {
			try {
				d3 = await import('d3');
				if (d3) {
					renderOverviewChart();
					renderTimeline();
					
					// レンダリング状態を通知
					if (onRenderStateChange) {
						onRenderStateChange({
							canvasContextObtained: true,
							pointsRendered: data.length,
							lastRenderTime: Date.now(),
							errors: []
						});
					}
				} else {
					if (onRenderStateChange) {
						onRenderStateChange({
							canvasContextObtained: false,
							pointsRendered: 0,
							lastRenderTime: null,
							errors: ['D3 import returned null']
						});
					}
				}
			} catch (error) {
				console.error('Failed to load d3:', error);
				if (onRenderStateChange) {
					onRenderStateChange({
						canvasContextObtained: false,
						pointsRendered: 0,
						lastRenderTime: null,
						errors: [`Failed to load D3: ${error}`]
					});
				}
			}
		} else {
			if (onRenderStateChange) {
				onRenderStateChange({
					canvasContextObtained: false,
					pointsRendered: 0,
					lastRenderTime: null,
					errors: ['Not in browser environment']
				});
			}
		}
	});
</script>

<div class="timeline-chart">
	<!-- Overview Chart -->
	<svg bind:this={overviewSvgRef} class="w-full mb-2"></svg>
	
	<!-- Main Timeline Chart -->
	<svg bind:this={svgRef} class="w-full"></svg>
	
	<!-- Tooltip -->
	{#if tooltipRef}
		<div bind:this={tooltipRef} class="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-2 shadow-lg pointer-events-none z-10" style="display: none;"></div>
	{/if}
</div>

<style>
	.timeline-chart {
		position: relative;
		width: 100%;
	}
</style>

