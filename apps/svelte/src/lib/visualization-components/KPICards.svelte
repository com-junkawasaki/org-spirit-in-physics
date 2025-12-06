<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { TimelineDataPoint, KPICalculations } from './types';

	// D3はブラウザでのみインポート
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

	let kpis: KPICalculations | null = $derived(calculateKPIs());

	function calculateKPIs(): KPICalculations | null {
		if (data.length === 0) return null;

		const currentValues = {
			avgReactionTime: data.reduce((sum, d) => sum + (d.reactionTime || 0), 0) / data.length,
			avgReactionValue: data.reduce((sum, d) => sum + (d.reactionValue || 0), 0) / data.length,
			responseRate: (data.filter(d => d.hasResponse).length / data.length) * 100,
			totalResponses: data.filter(d => d.hasResponse).length
		};

		// 過去の値（デモ用：現在値の90-110%の範囲でランダム）
		const previousValues = {
			avgReactionTime: currentValues.avgReactionTime * (0.9 + Math.random() * 0.2),
			avgReactionValue: currentValues.avgReactionValue * (0.9 + Math.random() * 0.2),
			responseRate: currentValues.responseRate * (0.9 + Math.random() * 0.2),
			totalResponses: Math.floor(currentValues.totalResponses * (0.9 + Math.random() * 0.2))
		};

		// 変化率計算
		const changes = {
			avgReactionTime: previousValues.avgReactionTime !== 0
				? ((currentValues.avgReactionTime - previousValues.avgReactionTime) / previousValues.avgReactionTime) * 100
				: 0,
			avgReactionValue: previousValues.avgReactionValue !== 0
				? ((currentValues.avgReactionValue - previousValues.avgReactionValue) / previousValues.avgReactionValue) * 100
				: 0,
			responseRate: previousValues.responseRate !== 0
				? ((currentValues.responseRate - previousValues.responseRate) / previousValues.responseRate) * 100
				: 0,
			totalResponses: previousValues.totalResponses !== 0
				? ((currentValues.totalResponses - previousValues.totalResponses) / previousValues.totalResponses) * 100
				: 0
		};

		return { current: currentValues, previous: previousValues, changes };
	}

	function generateSparklinePath(sparkline: number[]): string {
		if (!browser || !d3 || sparkline.length === 0) return '';
		
		const line = d3.line<number>()
			.defined(d => typeof d === 'number' && !isNaN(d))
			.x((_, i) => {
				const val = (i / Math.max(1, sparkline.length - 1)) * 100;
				return isNaN(val) ? 0 : val;
			})
			.y(d => {
				const maxVal = Math.max(...sparkline.filter(v => typeof v === 'number' && !isNaN(v)));
				const val = typeof d === 'number' && !isNaN(d) ? d : 0;
				const y = maxVal > 0 ? 100 - (val / maxVal) * 100 : 50;
				return isNaN(y) ? 50 : y;
			})
			.curve(d3.curveMonotoneX);

		return line(sparkline) || '';
	}
</script>

{#if kpis}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- 平均反応時間 -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">平均反応時間</h3>
				<div class="flex items-center text-xs {
					kpis.changes.avgReactionTime > 0 ? 'text-green-600 dark:text-green-400' :
					kpis.changes.avgReactionTime < 0 ? 'text-red-600 dark:text-red-400' :
					'text-gray-500 dark:text-gray-400'
				}">
					{kpis.changes.avgReactionTime > 0 ? '↗' : kpis.changes.avgReactionTime < 0 ? '↘' : '→'} {Math.abs(kpis.changes.avgReactionTime).toFixed(1)}%
				</div>
			</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
				{kpis.current.avgReactionTime.toFixed(0)}ms
			</div>
			<div class="h-8">
				<svg width="100%" height="100%" class="text-blue-500">
					<title>スパークライン: 平均反応時間</title>
					<path
						d={generateSparklinePath(data.map(d => d.reactionTime || 0).slice(-20))}
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</div>
		</div>

		<!-- 平均反応値 -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">平均反応値</h3>
				<div class="flex items-center text-xs {
					kpis.changes.avgReactionValue > 0 ? 'text-green-600 dark:text-green-400' :
					kpis.changes.avgReactionValue < 0 ? 'text-red-600 dark:text-red-400' :
					'text-gray-500 dark:text-gray-400'
				}">
					{kpis.changes.avgReactionValue > 0 ? '↗' : kpis.changes.avgReactionValue < 0 ? '↘' : '→'} {Math.abs(kpis.changes.avgReactionValue).toFixed(1)}%
				</div>
			</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
				{kpis.current.avgReactionValue.toFixed(2)}
			</div>
			<div class="h-8">
				<svg width="100%" height="100%" class="text-blue-500">
					<title>スパークライン: 平均反応値</title>
					<path
						d={generateSparklinePath(data.map(d => d.reactionValue || 0).slice(-20))}
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</div>
		</div>

		<!-- 反応率 -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">反応率</h3>
				<div class="flex items-center text-xs {
					kpis.changes.responseRate > 0 ? 'text-green-600 dark:text-green-400' :
					kpis.changes.responseRate < 0 ? 'text-red-600 dark:text-red-400' :
					'text-gray-500 dark:text-gray-400'
				}">
					{kpis.changes.responseRate > 0 ? '↗' : kpis.changes.responseRate < 0 ? '↘' : '→'} {Math.abs(kpis.changes.responseRate).toFixed(1)}%
				</div>
			</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
				{kpis.current.responseRate.toFixed(1)}%
			</div>
			<div class="h-8">
				<svg width="100%" height="100%" class="text-blue-500">
					<title>スパークライン: 反応率</title>
					<path
						d={generateSparklinePath(data.map(d => d.hasResponse ? 1 : 0).slice(-20))}
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</div>
		</div>

		<!-- 総反応数 -->
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">総反応数</h3>
				<div class="flex items-center text-xs {
					kpis.changes.totalResponses > 0 ? 'text-green-600 dark:text-green-400' :
					kpis.changes.totalResponses < 0 ? 'text-red-600 dark:text-red-400' :
					'text-gray-500 dark:text-gray-400'
				}">
					{kpis.changes.totalResponses > 0 ? '↗' : kpis.changes.totalResponses < 0 ? '↘' : '→'} {Math.abs(kpis.changes.totalResponses).toFixed(1)}%
				</div>
			</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
				{kpis.current.totalResponses}件
			</div>
			<div class="h-8">
				<svg width="100%" height="100%" class="text-blue-500">
					<title>スパークライン: 総反応数</title>
					<path
						d={generateSparklinePath(Array.from({ length: 20 }, () => Math.floor(kpis!.current.totalResponses * (0.8 + Math.random() * 0.4))))}
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</div>
		</div>
	</div>
{:else}
	<div class="text-center text-gray-500 dark:text-gray-400 p-8">
		データがありません
	</div>
{/if}

