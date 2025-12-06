<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { TimelineDataPoint, SmallMultiplesDataPoint } from './types';

	// D3はブラウザでのみ動的インポート
	let d3: typeof import('d3') | null = null;

	onMount(async () => {
		if (browser) {
			try {
				d3 = await import('d3');
			} catch (error) {
				console.error('Failed to load d3:', error);
			}
		}
	});

	const {
		data = []
	}: {
		data?: TimelineDataPoint[];
	} = $props();

	function prepareSmallMultiplesData(): SmallMultiplesDataPoint[] {
		if (data.length === 0) return [];

		// 単語ごとにグループ化して時系列データを作成
		const wordGroups = data.reduce((acc, d) => {
			const word = d.word;
			if (!word) return acc;
			if (!acc[word]) acc[word] = [];
			acc[word]!.push(d);
			return acc;
		}, {} as Record<string, TimelineDataPoint[]>);

		return Object.entries(wordGroups)
			.map(([word, points]) => ({
				word,
				data: points.sort((a, b) => a.timestamp - b.timestamp),
				stats: {
					avgReactionTime: points.length > 0
						? points.reduce((sum, d) => sum + (d.reactionTime || 0), 0) / points.length
						: 0,
					avgReactionValue: points.length > 0
						? points.reduce((sum, d) => sum + (d.reactionValue || 0), 0) / points.length
						: 0,
					maxReactionValue: points.length > 0
						? Math.max(...points.map(d => d.reactionValue || 0))
						: 0,
					responseRate: points.length > 0
						? (points.filter(d => d.hasResponse).length / points.length) * 100
						: 0
				}
			}))
			.sort((a, b) => b.stats.avgReactionValue - a.stats.avgReactionValue)
			.slice(0, 12); // 上位12単語のみ表示
	}

	function generateSparklinePath(item: SmallMultiplesDataPoint): string {
		if (!browser || !d3 || item.data.length === 0) return '';

		const line = d3.line<TimelineDataPoint>()
			.x((_, i) => {
				const val = (i / Math.max(1, item.data.length - 1)) * 100;
				return isNaN(val) ? 0 : val;
			})
			.y(d => {
				const maxVal = Math.max(...item.data.map(x => {
					const val = typeof x.reactionValue === 'number' && !isNaN(x.reactionValue) ? x.reactionValue : 0;
					return val;
				}));
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue) ? d.reactionValue : 0;
				const y = maxVal > 0 ? 100 - (val / maxVal) * 100 : 50;
				return isNaN(y) ? 50 : y;
			})
			.defined(d => {
				const val = typeof d.reactionValue === 'number' && !isNaN(d.reactionValue);
				return val;
			})
			.curve(d3.curveMonotoneX);

		return line(item.data) || '';
	}

	let smallMultiplesData = $derived(prepareSmallMultiplesData());
</script>

{#if smallMultiplesData.length > 0}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each smallMultiplesData as item}
			<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{item.word}</h3>
					<div class="text-xs text-gray-500 dark:text-gray-400">{item.data.length}件</div>
				</div>

				<div class="h-16 mb-2">
					<svg width="100%" height="100%" class="text-blue-500">
						<title>スパークライン: {item.word}</title>
						<path
							d={generateSparklinePath(item)}
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						/>
					</svg>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs">
					<div>
						<div class="text-gray-500 dark:text-gray-400">平均反応値</div>
						<div class="font-semibold text-gray-900 dark:text-gray-100">{item.stats.avgReactionValue.toFixed(2)}</div>
					</div>
					<div>
						<div class="text-gray-500 dark:text-gray-400">反応率</div>
						<div class="font-semibold text-gray-900 dark:text-gray-100">{item.stats.responseRate.toFixed(1)}%</div>
					</div>
					<div>
						<div class="text-gray-500 dark:text-gray-400">最大値</div>
						<div class="font-semibold text-gray-900 dark:text-gray-100">{item.stats.maxReactionValue.toFixed(2)}</div>
					</div>
					<div>
						<div class="text-gray-500 dark:text-gray-400">平均時間</div>
						<div class="font-semibold text-gray-900 dark:text-gray-100">{item.stats.avgReactionTime.toFixed(0)}ms</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center text-gray-500 dark:text-gray-400 p-8">
		データがありません
	</div>
{/if}

