<script lang="ts">
  import { page } from '$app/state';
  import TimelineVisualization from '$lib/components/researcher/TimelineVisualization.svelte';
  
  let participantId = $derived(page.params.id);
</script>

<svelte:head>
  <title>分析可視化 | Spirit in Physics</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded uppercase tracking-widest">Participant Analysis</span>
      </div>
      <p class="text-sm font-mono text-gray-500">{participantId}</p>
    </div>
    
    <div class="flex items-center gap-3">
      <button class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all">
        Export Report
      </button>
      <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all">
        Share Insights
      </button>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
    {#if participantId}
      <TimelineVisualization {participantId} width={1200} height={600} />
    {/if}
  </div>
</div>
