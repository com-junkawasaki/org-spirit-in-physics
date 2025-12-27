<script lang="ts">
  import { page } from '$app/state';
  import TimelineVisualization from '$lib/components/researcher/TimelineVisualization.svelte';
  
  let participantId = $derived(page.params.id);
</script>

<svelte:head>
  <title>分析可視化 | Spirit in Physics</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">分析可視化</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">ID: {participantId}</p>
    </div>
    <a 
      href="/researcher" 
      class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      ← 戻る
    </a>
  </div>

  <div class="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4">
    {#if participantId}
      <TimelineVisualization {participantId} width={1200} height={600} />
    {/if}
  </div>
</div>

