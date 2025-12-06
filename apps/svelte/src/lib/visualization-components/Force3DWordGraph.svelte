<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Force3DWordGraphTypeGPU from './Force3DWordGraphTypeGPU.svelte';
	import type { WordAggregate, EmotionVector, WordNode, WordLink } from './types';
	import { normalizeEmotionName } from './lib/emotion-normalization';

	const {
		wordAggregates = [],
		emotionVectors = [],
		onRenderStateChange = undefined
	}: {
		wordAggregates?: WordAggregate[];
		emotionVectors?: EmotionVector[];
		onRenderStateChange?: (state: any) => void;
	} = $props();

	// デバッグ情報
	let debugInfo = $state({
		receivedAggregates: 0,
		receivedVectors: 0,
		matchedVectors: 0,
		nodesCreated: 0,
		linksCreated: 0,
		errors: [] as string[]
	});
	
	// レンダリング状態（Force3DWordGraphTypeGPUから取得）
	let renderState = $state({
		webgpuSupported: false,
		webgpuInitialized: false,
		canvas2dFallback: false,
		canvas2dContextObtained: false,
		renderCount: 0,
		lastRenderTime: null as number | null,
		errors: [] as string[],
		nodesRendered: 0,
		linksRendered: 0,
		isRendering: false
	});

	let nodes: WordNode[] = $derived(browser ? convertToNodes(wordAggregates, emotionVectors) : []);
	let links: WordLink[] = $derived(browser ? generateLinks(nodes) : []);

	$effect(() => {
		console.log('[Force3DWordGraph] Props changed:', {
			wordAggregatesLength: wordAggregates.length,
			emotionVectorsLength: emotionVectors.length,
			wordAggregates: wordAggregates,
			emotionVectors: emotionVectors
		});

		// デバッグ情報を更新
		debugInfo.receivedAggregates = wordAggregates.length;
		debugInfo.receivedVectors = emotionVectors.length;
		debugInfo.matchedVectors = wordAggregates.filter(agg => 
			emotionVectors.some(v => v.word === agg.word)
		).length;
		debugInfo.nodesCreated = nodes.length;
		debugInfo.linksCreated = links.length;
		
		// レンダリング状態を親に通知
		if (onRenderStateChange) {
			onRenderStateChange(renderState);
		}

		console.log('[Force3DWordGraph] Debug info:', debugInfo);
		if (wordAggregates.length > 0) {
			console.log('[Force3DWordGraph] All Aggregates:', wordAggregates.map(agg => ({
				word: agg.word,
				count: agg.count,
				hasEmotionVector: emotionVectors.some(v => v.word === agg.word)
			})));
		}
		if (emotionVectors.length > 0) {
			console.log('[Force3DWordGraph] All Vectors:', emotionVectors.map(v => ({
				word: v.word,
				emotionEntryCount: v.emotionEntryCount,
				hasJoy: v.joySum > 0
			})));
		}
		console.log('[Force3DWordGraph] All Nodes created:', nodes.length, nodes);
		console.log('[Force3DWordGraph] Links created:', links.length);
	});

	function convertToNodes(
		aggregates: WordAggregate[],
		vectors: EmotionVector[]
	): WordNode[] {
		console.log('[Force3DWordGraph] convertToNodes: Starting conversion', {
			aggregatesCount: aggregates.length,
			vectorsCount: vectors.length
		});

		const nodeMap = new Map<string, WordNode>();
		let matchedCount = 0;
		let unmatchedCount = 0;

		aggregates.forEach((agg, index) => {
			const vector = vectors.find((v) => v.word === agg.word);
			const scale = Math.sqrt(agg.count || 1);

			console.log(`[Force3DWordGraph] convertToNodes: Processing aggregate ${index}:`, {
				word: agg.word,
				count: agg.count,
				hasVector: !!vector,
				vectorWord: vector?.word,
				emotionEntryCount: vector?.emotionEntryCount
			});

			const emotion: WordNode['emotion'] = vector
				? {
						joy: vector.joySum ? vector.joySum / vector.emotionEntryCount : 0,
						sadness: vector.sadnessSum ? vector.sadnessSum / vector.emotionEntryCount : 0,
						anger: vector.angerSum ? vector.angerSum / vector.emotionEntryCount : 0,
						fear: vector.fearSum ? vector.fearSum / vector.emotionEntryCount : 0,
						surprise: vector.surpriseSum ? vector.surpriseSum / vector.emotionEntryCount : 0,
						disgust: vector.disgustSum ? vector.disgustSum / vector.emotionEntryCount : 0,
						calm: vector.calmSum ? vector.calmSum / vector.emotionEntryCount : 0,
						focus: vector.focusSum ? vector.focusSum / vector.emotionEntryCount : 0,
						excitement: vector.excitementSum ? vector.excitementSum / vector.emotionEntryCount : 0,
						confusion: vector.confusionSum ? vector.confusionSum / vector.emotionEntryCount : 0
				  }
				: undefined;

			if (vector) matchedCount++;
			else unmatchedCount++;

			nodeMap.set(agg.word, {
				id: agg.word,
				label: agg.word,
				scale,
				color: getColorFromEmotion(emotion),
				emotion
			});
		});

		console.log('[Force3DWordGraph] convertToNodes: Conversion complete', {
			totalNodes: nodeMap.size,
			matchedVectors: matchedCount,
			unmatchedVectors: unmatchedCount
		});

		return Array.from(nodeMap.values());
	}

	function generateLinks(nodes: WordNode[]): WordLink[] {
		const links: WordLink[] = [];
		
		// Create links between all nodes (complete graph)
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const weight = calculateLinkWeight(nodes[i], nodes[j]);
				links.push({
					source: i,
					target: j,
					weight
				});
			}
		}

		return links;
	}

	function calculateLinkWeight(node1: WordNode, node2: WordNode): number {
		// Simple weight calculation based on scale similarity
		const scaleDiff = Math.abs(node1.scale - node2.scale);
		return Math.max(0.1, 1 - scaleDiff / 10);
	}

	function getColorFromEmotion(emotion?: WordNode['emotion']): string {
		if (!emotion) return '#3b82f6';

		// Find dominant emotion
		let maxScore = 0;
		let dominantEmotion = 'joy';

		Object.entries(emotion).forEach(([key, value]) => {
			if (value && value > maxScore) {
				maxScore = value;
				dominantEmotion = key;
			}
		});

		const colorMap: Record<string, string> = {
			joy: '#fbbf24',
			sadness: '#6b7280',
			anger: '#ef4444',
			fear: '#6366f1',
			surprise: '#10b981',
			disgust: '#22c55e',
			calm: '#3b82f6',
			focus: '#9333ea',
			excitement: '#f59e0b',
			confusion: '#0ea5e9'
		};

		return colorMap[dominantEmotion] || '#3b82f6';
	}
</script>

<div class="force-3d-word-graph">
	{#if nodes.length > 0}
		<Force3DWordGraphTypeGPU {nodes} {links} width={1000} height={600} renderState={renderState} />
	{:else}
		<div class="flex items-center justify-center p-8 text-gray-500">
			<p>データがありません。単語集計データを読み込んでください。</p>
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
		<div>受信単語集計: {debugInfo.receivedAggregates}</div>
		<div>受信感情ベクトル: {debugInfo.receivedVectors}</div>
		<div>マッチしたベクトル: {debugInfo.matchedVectors}</div>
		<div>作成されたノード: {debugInfo.nodesCreated}</div>
		<div>作成されたリンク: {debugInfo.linksCreated}</div>
	</div>
</div>
