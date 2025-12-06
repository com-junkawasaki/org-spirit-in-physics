<script lang="ts">
	import type { WordDistancePair } from './types';

	const {
		distances = [],
		width = 1000,
		height = 600,
		topK = 20
	}: {
		distances?: WordDistancePair[];
		width?: number;
		height?: number;
		topK?: number;
	} = $props();

	let topDistances = $derived(
		[...distances]
			.sort((a, b) => b.totalDistance - a.totalDistance)
			.slice(0, topK)
	);

	let maxDistance = $derived(
		topDistances.length > 0
			? Math.max(...topDistances.map(d => d.totalDistance))
			: 1
	);
</script>

<div class="border rounded-lg p-4 bg-white dark:bg-gray-800" style="width: {width}px; height: {height}px">
	<h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
		Word Distance Visualization (Top {topK})
	</h3>
	{#if topDistances.length === 0}
		<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
			No distance data available
		</div>
	{:else}
		<div class="space-y-2 overflow-y-auto" style="max-height: {height - 80}px">
			{#each topDistances as pair, index}
				{@const barWidth = (pair.totalDistance / maxDistance) * 100}
				<div class="border rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
					<div class="flex items-center justify-between mb-1">
						<span class="font-medium text-sm text-gray-900 dark:text-gray-100">
							{pair.word1} ↔ {pair.word2}
						</span>
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{pair.totalDistance.toFixed(3)}
						</span>
					</div>
					<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
						<div
							class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
							style="width: {barWidth}%"
						></div>
					</div>
					<div class="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
						<div>
							<span class="font-semibold">Emotion:</span> {pair.emotionDistance.toFixed(3)}
						</div>
						<div>
							<span class="font-semibold">Reaction Value:</span> {pair.reactionValueDistance.toFixed(3)}
						</div>
						<div>
							<span class="font-semibold">Reaction Time:</span> {pair.reactionTimeDistance.toFixed(3)}
						</div>
						<div>
							<span class="font-semibold">Physiological:</span> {pair.physiologicalDistance.toFixed(3)}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

