<script lang="ts">
	import { onMount } from 'svelte';
	import Force3DWordGraphTypeGPU from '$lib/visualization-components/Force3DWordGraphTypeGPU.svelte';
	import type { WordNode, WordLink } from '$lib/visualization-components/types';

	let nodes: WordNode[] = [];
	let links: WordLink[] = [];
	let loading = true;

	onMount(async () => {
		// デモデータの生成
		// 実際の実装ではGraphQLからデータを取得
		nodes = [
			{ id: '1', label: '頭', scale: 1.0, color: '#3b82f6' },
			{ id: '2', label: '緑', scale: 0.8, color: '#10b981' },
			{ id: '3', label: '水', scale: 0.9, color: '#06b6d4' }
		];

		links = [
			{ source: 0, target: 1, weight: 0.5 },
			{ source: 1, target: 2, weight: 0.7 },
			{ source: 0, target: 2, weight: 0.6 }
		];

		loading = false;
	});
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">デモアプリケーション - 3D Force Graph可視化</h1>

	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
			<Force3DWordGraphTypeGPU {nodes} {links} width={1000} height={600} />
		</div>

		<div class="bg-gray-100 dark:bg-gray-800 p-4 rounded">
			<h2 class="text-xl font-bold mb-2">実装状況</h2>
			<ul class="list-disc list-inside space-y-1">
				<li>✅ 3D Force Graph基本構造</li>
				<li>⏳ WebGPU実装（進行中）</li>
				<li>⏳ 物理シミュレーション</li>
				<li>⏳ インタラクティブコントロール</li>
			</ul>
		</div>
	{/if}
</div>
