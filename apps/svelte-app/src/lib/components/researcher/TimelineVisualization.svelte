<script lang="ts">
  import { onMount } from 'svelte';
  import type { 
    TimelineVisualizationProps, 
    TimelineDataPoint, 
    FilterSettings, 
    TimeRange,
    ForcePreset,
    WordNode,
    WordLink
  } from './types';
  import KPICards from './KPICards.svelte';
  import TimelineChart from './TimelineChart.svelte';
  import Force3DControls from './Force3DControls.svelte';
  import Force3DWordGraphTypeGPU from './Force3DWordGraphTypeGPU.svelte';
  import StructureAnalysisPanel from './StructureAnalysisPanel.svelte';
  import { timelineClient } from '$lib/connect';
  import * as d3 from 'd3';
  import { normalizeEmotionName, EMOTION_KEYS } from '$lib/researcher/emotion-normalization';
  import { JUNG_STIMULUS_WORDS } from '$lib/researcher/jung';
  import { detectGapAreas, analyzeDensity, detectDuplicates } from '$lib/researcher/structure-analysis';
  
  let {
    participantId,
    sessionId,
    width = 800,
    height = 400,
    hideFilters = false,
    forceMode
  }: TimelineVisualizationProps = $props();

  // State
  let data: TimelineDataPoint[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);
  let timeRange: TimeRange | null = $state(null);
  let filters: FilterSettings = $state({
    emotions: true,
    physiological: true,
    reactionValues: true,
    wordDisplay: true,
    reactionTime: true,
    physiologicalThreshold: true,
    emotionChange: true,
    range: 200,
    timeScale: 1.0,
    verticalScale: 1.0,
    showEmotionDetails: true,
    showWordLabels: true
  });

  // Force parameters
  let springK = $state(2.0);
  let repulsionK = $state(2000.0);
  let restLength = $state(80);
  let damping = $state(0.92);
  let shellRadius = $state(300);
  let shellK = $state(1.5);
  let radialOutK = $state(120);
  let alpha = $state(1.0);
  let gamma = $state(1.0);
  let lambda = $state(1.0);
  let eta = $state(1.0);

  let activeTab: 'timeline' | 'force3d' | 'words' | 'distance' = $state('timeline');

  $effect(() => {
    if (forceMode === 'force-3d-typegpu') {
      activeTab = 'force3d';
    } else {
      activeTab = 'timeline';
    }
  });

  const forcePresets: readonly ForcePreset[] = [
    { id: 'balanced', label: 'Balanced', springK: 2.0, repulsionK: 2000, restLength: 80, damping: 0.92, emoWeak: 0.6, emoStrong: 1.6, emoGain: 1.5 },
    { id: 'tight', label: 'Tight clusters', springK: 3.0, repulsionK: 3000, restLength: 60, damping: 0.90, emoWeak: 0.6, emoStrong: 1.8, emoGain: 2.5 },
    { id: 'loose', label: 'Loose clusters', springK: 1.5, repulsionK: 1500, restLength: 100, damping: 0.94, emoWeak: 0.7, emoStrong: 1.4, emoGain: 1.0 },
    { id: 'slow', label: 'Slow precise', springK: 2.0, repulsionK: 2500, restLength: 80, damping: 0.96, emoWeak: 0.6, emoStrong: 1.6, emoGain: 2.0 },
  ];
  let forcePresetId = $state('balanced');

  function applyForcePreset(id: string) {
    const p = forcePresets.find(x => x.id === id);
    if (!p) return;
    forcePresetId = id;
    springK = p.springK;
    repulsionK = p.repulsionK;
    restLength = p.restLength;
    damping = p.damping;
  }

  async function fetchData() {
    if (!participantId) return;
    loading = true;
    error = null;
    try {
      const response = await timelineClient.getTimeline({
        participantId,
        sessionId: sessionId || ''
      });
      
      if (response.success && response.data?.timelineData) {
        data = response.data.timelineData.map((item: any) => ({
          timestamp: Number(item.ts || item.t || item.timestamp),
          word: item.w || item.word || '',
          reactionTime: item.rt ?? item.reactionTime ?? 0,
          hasResponse: item.rt != null || item.reactionTime != null,
          emotions: (item.em || item.emotions || []).map((e: any) => ({
            name: e.n || e.name || '',
            score: e.s || e.score || 0,
            fileType: e.t || e.fileType || ''
          })),
          physiological: item.ph || item.physiological || { average: 0, max: 0, min: 0 },
          reactionValue: item.rv || item.reactionValue || 0,
          eventType: item.e || item.eventType || '',
          metadata: item.md || item.m || item.metadata || {}
        }));

        if (data.length > 0) {
          const extent = d3.extent(data, d => d.timestamp) as [number, number];
          timeRange = { start: extent[0], end: extent[1] };
        }
      } else {
        error = "No data found for this participant";
      }
    } catch (e: any) {
      error = e.message || "Failed to fetch timeline data";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchData();
  });

  let graphData = $derived.by(() => {
    if (data.length === 0) return { nodes: [], links: [] };
    const nodes: WordNode[] = data.map((d, i) => ({
      id: `node-${i}`,
      label: d.word,
      scale: 1 + (d.reactionValue || 0) * 5,
      color: '#1e40af'
    }));
    const links: WordLink[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({ source: i, target: i + 1, weight: 0.5 });
    }
    return { nodes, links };
  });

  let showAnalysis = $state(false);
  let analysisResults = $derived.by(() => {
    if (graphData.nodes.length === 0) return { gapAreas: [], densityRegions: [], duplicates: [], overallDensity: 0 };
    const { overcrowdedRegions, sparseRegions, overallDensity } = analyzeDensity(graphData.nodes);
    return {
      gapAreas: detectGapAreas(graphData.nodes, graphData.links, {}, data),
      densityRegions: [...overcrowdedRegions, ...sparseRegions],
      duplicates: detectDuplicates(graphData.nodes, {}, data),
      overallDensity
    };
  });
</script>

<div class="flex flex-col space-y-6">
  <div class="flex border-b border-gray-200 dark:border-gray-700">
    <button 
      class="px-4 py-2 {activeTab === 'timeline' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'timeline'}
    >
      Timeline
    </button>
    <button 
      class="px-4 py-2 {activeTab === 'force3d' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'force3d'}
    >
      3D Force
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center p-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center text-red-600 dark:text-red-400">
      <p class="font-medium mb-2">Error</p>
      <p>{error}</p>
      <button class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" onclick={fetchData}>Retry</button>
    </div>
  {:else}
    {#if activeTab === 'timeline'}
      <KPICards {data} />
      <TimelineChart 
        {data} 
        {filters} 
        {width} 
        {height} 
        {timeRange}
        onTimeRangeChange={(r) => timeRange = r}
        onDataPointSelect={() => {}}
        onTooltipShow={() => {}}
        onTooltipHide={() => {}}
      />
    {:else if activeTab === 'force3d'}
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div class="lg:col-span-3">
          <Force3DControls 
            {forcePresets} {forcePresetId} {springK} {repulsionK} {restLength} {damping} {shellRadius} {shellK} {radialOutK} {alpha} {gamma} {lambda} {eta}
            onPresetChange={applyForcePreset} onSpringKChange={(v) => springK = v} onRepulsionKChange={(v) => repulsionK = v} onRestLengthChange={(v) => restLength = v}
            onMinSepChange={() => {}} onSepKChange={() => {}} onShellRadiusChange={(v) => shellRadius = v} onShellKChange={(v) => shellK = v}
            onRadialOutKChange={(v) => radialOutK = v} onDampingChange={(v) => damping = v} onAlphaChange={(v) => alpha = v} onGammaChange={(v) => gamma = v}
            onLambdaChange={(v) => lambda = v} onEtaChange={(v) => eta = v}
          />
          <div class="bg-black rounded-lg overflow-hidden relative" style="height: 600px;">
            <Force3DWordGraphTypeGPU 
              nodes={graphData.nodes} links={graphData.links} {width} height={600} 
              physics={{ springK, repulsionK, damping, restLength, maxSpeed: 200, shellRadius, shellK, radialOutK }}
              gapAreas={analysisResults.gapAreas} densityRegions={analysisResults.densityRegions} showAnalysis={showAnalysis}
            />
            <div class="absolute top-4 right-4 flex gap-2">
              <button class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded backdrop-blur-md border border-white/20 transition-colors" onclick={() => showAnalysis = !showAnalysis}>
                {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-1">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-full">
            <h3 class="font-bold text-lg mb-4 dark:text-white">Structure Analysis</h3>
            <StructureAnalysisPanel 
              gapAreas={analysisResults.gapAreas} 
              densityRegions={analysisResults.densityRegions} 
              duplicates={analysisResults.duplicates} 
              overallDensity={analysisResults.overallDensity}
            />
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
