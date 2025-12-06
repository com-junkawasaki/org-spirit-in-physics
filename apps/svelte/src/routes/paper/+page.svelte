<script lang="ts">
	import { onMount } from 'svelte';
	import PaperContent from '$lib/paper/content/spirit-in-physics.mdx';

	let loading = true;

	onMount(() => {
		loading = false;
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else}
		<article class="prose prose-lg dark:prose-invert max-w-none">
			<PaperContent />
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
