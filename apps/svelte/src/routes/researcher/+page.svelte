<script lang="ts">
	import { onMount } from 'svelte';
	import { TimelineVisualization } from '$lib/visualization-components';
	import { Force3DWordGraph } from '$lib/visualization-components';
	
	let timelineData: any[] = [];
	let wordAggregates: any[] = [];
	let loading = true;
	
	onMount(async () => {
		// GraphQLクエリでデータを取得（実装予定）
		loading = false;
	});
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">研究者ダッシュボード</h1>
	{#if loading}
		<p>読み込み中...</p>
	{:else}
		<div class="space-y-8">
			<div class="bg-gray-100 dark:bg-gray-800 p-4 rounded">
				<h2 class="text-2xl font-bold mb-4">実装予定の機能</h2>
				<ul class="list-disc list-inside">
					<li>GraphQLクライアント統合</li>
					<li>ダッシュボードUI</li>
					<li>タイムライン可視化</li>
					<li>3D Force Graph可視化</li>
					<li>参加者管理</li>
					<li>データ分析</li>
				</ul>
			</div>
			<TimelineVisualization timelinePoints={timelineData} participantId="" sessionId="" />
			<Force3DWordGraph wordAggregates={wordAggregates} emotionVectors={[]} />
		</div>
	{/if}
</div>
