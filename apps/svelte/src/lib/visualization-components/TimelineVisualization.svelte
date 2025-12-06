<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { TimelinePoint, EmotionData, PhysiologicalData } from './types';

	const {
		timelinePoints = [],
		participantId = '',
		sessionId = '',
		width = 800,
		height = 400,
		onRenderStateChange = undefined
	}: {
		timelinePoints?: TimelinePoint[];
		participantId?: string;
		sessionId?: string;
		width?: number;
		height?: number;
		onRenderStateChange?: (state: any) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	// デバッグ情報
	let debugInfo = $state({
		receivedPoints: 0,
		validPoints: 0,
		pointsWithEmotions: 0,
		pointsWithReactionValue: 0,
		timeRange: { min: null as number | null, max: null as number | null },
		errors: [] as string[]
	});

	$effect(() => {
		console.log('[TimelineVisualization] Props changed:', {
			participantId,
			sessionId,
			timelinePointsLength: timelinePoints.length,
			width,
			height
		});

		// デバッグ情報を更新
		debugInfo.receivedPoints = timelinePoints.length;
		debugInfo.validPoints = timelinePoints.filter(p => p && p.time).length;
		debugInfo.pointsWithEmotions = timelinePoints.filter(p => p.emotions && p.emotions.length > 0).length;
		debugInfo.pointsWithReactionValue = timelinePoints.filter(p => p.reactionValue != null && p.reactionValue !== undefined).length;

		if (timelinePoints.length > 0) {
			const times = timelinePoints
				.map(p => new Date(p.time).getTime())
				.filter(t => !isNaN(t));
			if (times.length > 0) {
				debugInfo.timeRange.min = Math.min(...times);
				debugInfo.timeRange.max = Math.max(...times);
			}
		}

		console.log('[TimelineVisualization] Debug info:', debugInfo);
		console.log('[TimelineVisualization] All Points:', timelinePoints.map(p => ({
			time: p.time,
			word: p.word,
			reactionValue: p.reactionValue,
			hasResponse: p.hasResponse,
			emotionsCount: p.emotions?.length || 0,
			emotions: p.emotions
		})));
	});

	onMount(() => {
		console.log('[TimelineVisualization] onMount called');
		if (canvas) {
			ctx = canvas.getContext('2d');
			console.log('[TimelineVisualization] Canvas context:', ctx ? 'obtained' : 'failed');
			if (ctx) {
				if (onRenderStateChange) {
					onRenderStateChange({
						canvasContextObtained: true,
						pointsRendered: 0,
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
						errors: ['Failed to get canvas context']
					});
				}
			}
			drawTimeline();
		} else {
			console.error('[TimelineVisualization] Canvas element not found');
			debugInfo.errors.push('Canvas element not found');
			if (onRenderStateChange) {
				onRenderStateChange({
					canvasContextObtained: false,
					pointsRendered: 0,
					lastRenderTime: null,
					errors: ['Canvas element not found']
				});
			}
		}
	});

	$effect(() => {
		if (browser && timelinePoints.length > 0 && ctx) {
			console.log('[TimelineVisualization] Drawing timeline with', timelinePoints.length, 'points');
		drawTimeline();
		} else {
			if (!browser) {
				console.log('[TimelineVisualization] Not in browser, skipping draw');
			} else if (timelinePoints.length === 0) {
				console.log('[TimelineVisualization] No timeline points, skipping draw');
			} else if (!ctx) {
				console.log('[TimelineVisualization] No canvas context, skipping draw');
			}
		}
	});

	function drawTimeline() {
		if (!ctx || !canvas) {
			console.error('[TimelineVisualization] drawTimeline: Missing ctx or canvas');
			return;
		}
		if (timelinePoints.length === 0) {
			console.log('[TimelineVisualization] drawTimeline: No points to draw');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			return;
		}

		console.log('[TimelineVisualization] drawTimeline: Starting draw with', timelinePoints.length, 'points');
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

		let pointsRendered = 0;
		timelinePoints.forEach((point, index) => {
			const x = 50 + (new Date(point.time).getTime() - timeRange) * xScale;
			const y = height - 50 - (point.reactionValue || 0) * yScale;

			// Draw point
			ctx.fillStyle = getPointColor(point);
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
			pointsRendered++;

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
		
		// レンダリング状態を親に通知
		if (onRenderStateChange) {
			onRenderStateChange({
				canvasContextObtained: !!ctx,
				pointsRendered,
				lastRenderTime: Date.now(),
				errors: [...debugInfo.errors]
			});
		}
	}

	function getTimeRange(): number {
		if (timelinePoints.length === 0) {
			console.log('[TimelineVisualization] getTimeRange: No points, returning 1');
			return 1;
		}
		const times = timelinePoints
			.map((p) => {
				try {
					return new Date(p.time).getTime();
				} catch (e) {
					console.error('[TimelineVisualization] getTimeRange: Invalid time:', p.time, e);
					return null;
				}
			})
			.filter((t): t is number => t !== null && !isNaN(t));
		
		if (times.length === 0) {
			console.error('[TimelineVisualization] getTimeRange: No valid times found');
			return 1;
		}
		
		const range = Math.max(...times) - Math.min(...times) || 1;
		console.log('[TimelineVisualization] getTimeRange:', {
			min: new Date(Math.min(...times)).toISOString(),
			max: new Date(Math.max(...times)).toISOString(),
			rangeMs: range,
			rangeHours: range / (1000 * 60 * 60)
		});
		return range;
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
			{#if debugInfo.errors.length > 0}
				<div class="mt-2 text-xs text-red-600">
					<p>エラー:</p>
					<ul class="list-disc list-inside">
						{#each debugInfo.errors as error}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
	<!-- デバッグ情報表示 -->
	<div class="mt-2 text-xs text-gray-500 space-y-1">
		<div>受信ポイント数: {debugInfo.receivedPoints}</div>
		<div>有効ポイント数: {debugInfo.validPoints}</div>
		<div>感情データあり: {debugInfo.pointsWithEmotions}</div>
		<div>反応値あり: {debugInfo.pointsWithReactionValue}</div>
		{#if debugInfo.timeRange.min !== null && debugInfo.timeRange.max !== null}
			<div>
				時間範囲: {new Date(debugInfo.timeRange.min).toLocaleString()} ～ {new Date(debugInfo.timeRange.max).toLocaleString()}
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline-visualization {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
