<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { TimelinePoint, EmotionData, PhysiologicalData } from './types';

	const {
		timelinePoints = [],
		participantId = '',
		sessionId = '',
		width = 800,
		height = 400
	}: {
		timelinePoints?: TimelinePoint[];
		participantId?: string;
		sessionId?: string;
		width?: number;
		height?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
			drawTimeline();
		}
	});

	$effect(() => {
		if (browser && timelinePoints.length > 0 && ctx) {
			drawTimeline();
		}
	});

	function drawTimeline() {
		if (!ctx || !canvas || timelinePoints.length === 0) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw axes
		ctx.strokeStyle = '#374151';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(50, height - 50);
		ctx.lineTo(width - 50, height - 50);
		ctx.moveTo(50, 50);
		ctx.lineTo(50, height - 50);
		ctx.stroke();

		// Draw timeline points
		const timeRange = getTimeRange();
		const xScale = (width - 100) / timeRange;
		const yScale = (height - 100) / 100; // Assuming max value of 100

		timelinePoints.forEach((point, index) => {
			const x = 50 + (new Date(point.time).getTime() - timeRange) * xScale;
			const y = height - 50 - (point.reactionValue || 0) * yScale;

			// Draw point
			ctx.fillStyle = getPointColor(point);
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();

			// Draw line to next point
			if (index < timelinePoints.length - 1) {
				const nextPoint = timelinePoints[index + 1];
				const nextX = 50 + (new Date(nextPoint.time).getTime() - timeRange) * xScale;
				const nextY = height - 50 - (nextPoint.reactionValue || 0) * yScale;

				ctx.strokeStyle = '#9ca3af';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(nextX, nextY);
				ctx.stroke();
			}
		});
	}

	function getTimeRange(): number {
		if (timelinePoints.length === 0) return 1;
		const times = timelinePoints.map((p) => new Date(p.time).getTime());
		return Math.max(...times) - Math.min(...times) || 1;
	}

	function getPointColor(point: TimelinePoint): string {
		if (point.emotions && point.emotions.length > 0) {
			// Use dominant emotion color
			const dominantEmotion = point.emotions.reduce((max, e) =>
				e.score > max.score ? e : max
			);
			return dominantEmotion.color || '#3b82f6';
		}
		return point.hasResponse ? '#10b981' : '#ef4444';
	}
</script>

<div class="timeline-visualization">
	<canvas bind:this={canvas} width={width} height={height} class="border border-gray-300 rounded"></canvas>
	{#if timelinePoints.length === 0}
		<div class="mt-4 text-center text-gray-500">
			<p>タイムラインデータがありません</p>
		</div>
	{/if}
</div>

<style>
	.timeline-visualization {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
