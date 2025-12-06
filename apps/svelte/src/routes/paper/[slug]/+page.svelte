<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { loadPaper, type PaperMetadata } from '$lib/paper/utils';
	import type { ComponentType } from 'svelte';

	let loading = true;
	let error: string | null = null;
	let metadata: PaperMetadata | null = null;
	let PaperComponent: ComponentType | null = null;

	$: slug = $page.params.slug;

	onMount(async () => {
		if (!slug) {
			error = '論文のスラッグが指定されていません';
			loading = false;
			return;
		}

		try {
			const paper = await loadPaper(slug);
			metadata = paper.metadata;
			PaperComponent = paper.component;
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : '論文の読み込みに失敗しました';
			loading = false;
		}
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
	{#if metadata}
		<title>{metadata.title}</title>
		<meta name="description" content={metadata.description} />
	{/if}
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else if error}
		<div class="bg-red-100 dark:bg-red-900 p-4 rounded text-red-800 dark:text-red-200">
			{error}
		</div>
	{:else if metadata && PaperComponent}
		<article class="prose prose-lg dark:prose-invert max-w-none">
			<PaperComponent />
		</article>
	{/if}
</div>

<style>
	:global(.katex-display) {
		margin: 1.5em 0;
		overflow-x: auto;
		overflow-y: hidden;
	}

	:global(.katex-inline) {
		margin: 0 0.2em;
	}
</style>
