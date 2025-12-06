<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Force3DWordGraphTypeGPU from './Force3DWordGraphTypeGPU.svelte';
	import type { WordAggregate, EmotionVector, WordNode, WordLink } from './types';
	import { normalizeEmotionName } from './lib/emotion-normalization';

	const {
		wordAggregates = [],
		emotionVectors = []
	}: {
		wordAggregates?: WordAggregate[];
		emotionVectors?: EmotionVector[];
	} = $props();

	let nodes: WordNode[] = $derived(browser ? convertToNodes(wordAggregates, emotionVectors) : []);
	let links: WordLink[] = $derived(browser ? generateLinks(nodes) : []);

	function convertToNodes(
		aggregates: WordAggregate[],
		vectors: EmotionVector[]
	): WordNode[] {
		const nodeMap = new Map<string, WordNode>();

		aggregates.forEach((agg) => {
			const vector = vectors.find((v) => v.word === agg.word);
			const scale = Math.sqrt(agg.count || 1);

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

			nodeMap.set(agg.word, {
				id: agg.word,
				label: agg.word,
				scale,
				color: getColorFromEmotion(emotion),
				emotion
			});
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
		<Force3DWordGraphTypeGPU {nodes} {links} width={1000} height={600} />
	{:else}
		<div class="flex items-center justify-center p-8 text-gray-500">
			<p>データがありません。単語集計データを読み込んでください。</p>
		</div>
	{/if}
</div>
