<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Force3DWordGraphTypeGPU from '$lib/visualization-components/Force3DWordGraphTypeGPU.svelte';
	import PhysicsControls from '$lib/visualization-components/PhysicsControls.svelte';
	import type { WordNode, WordLink } from '$lib/visualization-components/types';
	import type { PhysicsParams } from '$lib/visualization-components/lib/webgpu-physics';

	let nodes: WordNode[] = [];
	let links: WordLink[] = [];
	let loading = true;
	let physicsParams: Partial<PhysicsParams> = {
		springK: 2.0,
		repulsionK: 2000.0,
		damping: 0.92,
		restLength: 80,
		maxSpeed: 100,
		shellRadius: 300,
		shellK: 1.5,
		radialOutK: 120,
		minSep: 80,
		sepK: 8000,
		delta: 0.016
	};

	onMount(() => {
		// SSR回避: ブラウザでのみ実行
		if (!browser) return;
		
		// デモデータの生成
		// 実際の実装ではGraphQLからデータを取得
		nodes = [
			{ id: '1', label: '頭', scale: 1.0, color: '#3b82f6' },
			{ id: '2', label: '緑', scale: 0.8, color: '#10b981' },
			{ id: '3', label: '水', scale: 0.9, color: '#06b6d4' },
			{ id: '4', label: '火', scale: 0.7, color: '#ef4444' },
			{ id: '5', label: '風', scale: 0.85, color: '#8b5cf6' }
		];

		links = [
			{ source: 0, target: 1, weight: 0.5 },
			{ source: 1, target: 2, weight: 0.7 },
			{ source: 0, target: 2, weight: 0.6 },
			{ source: 2, target: 3, weight: 0.4 },
			{ source: 3, target: 4, weight: 0.5 },
			{ source: 1, target: 4, weight: 0.3 }
		];

		loading = false;
	});

	function handlePhysicsUpdate(params: Partial<PhysicsParams>) {
		physicsParams = { ...physicsParams, ...params };
	}
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">デモアプリケーション - 3D Force Graph可視化</h1>

	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
			<div class="lg:col-span-3">
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
					<Force3DWordGraphTypeGPU {nodes} {links} width={1000} height={600} physics={physicsParams} />
					<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						<p>💡 マウスでドラッグして回転、ホイールでズーム</p>
					</div>
				</div>
			</div>
			<div class="lg:col-span-1">
				<PhysicsControls physics={physicsParams} onUpdate={handlePhysicsUpdate} />
			</div>
		</div>

		<div class="bg-gray-100 dark:bg-gray-800 p-4 rounded mt-4">
			<h2 class="text-xl font-bold mb-2">実装状況</h2>
			<ul class="list-disc list-inside space-y-1">
				<li>✅ 3D Force Graph基本構造</li>
				<li>✅ WebGPU実装</li>
				<li>✅ 物理シミュレーション</li>
				<li>✅ インタラクティブコントロール（回転・ズーム）</li>
				<li>✅ パラメータ調整UI</li>
			</ul>
		</div>
	{/if}
</div>
