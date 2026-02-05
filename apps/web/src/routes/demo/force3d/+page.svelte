<script lang="ts">
  import TimelineVisualization from '$lib/components/researcher/TimelineVisualization.svelte';
  import { runtimeConfig } from '$lib/env.svelte';
</script>

<svelte:head>
  <title>3D Force Demo | Spirit in Physics</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-8">
  <div class="max-w-[1800px] mx-auto space-y-8">
    <!-- Header -->
    <div class="text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
        <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        <span class="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Development Mode</span>
      </div>
      <h1 class="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
        3D Force Visualization
      </h1>
      <p class="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
        Neural topology visualization with emotion-driven spatial dynamics
      </p>
    </div>

    <!-- Visualization Card -->
    <div class="bg-white dark:bg-gray-900 rounded-[48px] shadow-2xl border-4 border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="p-8">
        <TimelineVisualization
          participantId="e41a9cd2-d803-49a8-9020-0260e55cd03e"
          width={runtimeConfig.IS_CAPACITOR ? 1200 : 1600}
          height={runtimeConfig.IS_CAPACITOR ? 600 : 900}
          forceMode="force-3d-threlte"
        />
      </div>
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
          <h3 class="font-black text-lg text-gray-900 dark:text-white">Emotion Anchors</h3>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          10 primary emotion dimensions mapped to 3D sphere surface using inverse distance weighting
        </p>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 class="font-black text-lg text-gray-900 dark:text-white">Word Nodes</h3>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Stimulus words positioned based on emotion vectors and modality-specific signals
        </p>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 class="font-black text-lg text-gray-900 dark:text-white">Physics Engine</h3>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          WebGPU-accelerated spring-mass system with shell constraints and emotion-driven forces
        </p>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl p-8 border border-blue-500/20">
      <h3 class="font-black text-xl text-gray-900 dark:text-white mb-4 flex items-center gap-3">
        <span class="text-2xl">💡</span> How to Use
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
        <div class="flex items-start gap-3">
          <span class="font-black text-blue-500">1.</span>
          <span><strong>Rotate:</strong> Click and drag on the 3D space</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="font-black text-blue-500">2.</span>
          <span><strong>Filter:</strong> Use left sidebar to select words and emotions</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="font-black text-blue-500">3.</span>
          <span><strong>Analyze:</strong> Click "Analyze Space" to detect patterns</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="font-black text-blue-500">4.</span>
          <span><strong>Pin:</strong> Click nodes or links to pin them to the sidebar</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>

