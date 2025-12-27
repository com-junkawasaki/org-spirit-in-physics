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
  import type { 
    AnalysisResults,
    GapArea,
    DensityRegion,
    DuplicateCandidate
  } from './types';
  import { timelineClient } from '$lib/connect';
  import * as d3 from 'd3';
  import { normalizeEmotionName, EMOTION_KEYS } from '$lib/researcher/emotion-normalization';
  import { JUNG_STIMULUS_WORDS } from '$lib/researcher/jung';
  import type { 
    WordAggregate, 
    EmotionVector, 
    WordStatistics 
  } from '../../../generated/proto/timeline/v1/timeline_pb';
  
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
  let wordStatistics: WordStatistics[] = $state([]);
  let emotionVectors: EmotionVector[] = $state([]);
  let wordAggregates: WordAggregate[] = $state([]);
  
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
  let minSep = $state(60);
  let sepK = $state(5000.0);
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
      // Use the new integrated endpoint that runs on TS Temporal
      const response = await (timelineClient as any).getIntegratedTimeline({ 
        participantId, 
        sessionId: sessionId || undefined 
      });
      
      if (response && response.points && response.points.length > 0) {
        data = response.points.map((item: any) => ({
          timestamp: item.time ? (Number(item.time.seconds) * 1000 + (item.time.nanos / 1000000)) : 0,
          word: item.word || '',
          reactionTime: item.reactionTime ?? 0,
          hasResponse: item.hasResponse,
          emotions: (item.emotions || []).map((e: any) => ({
            name: e.name || '',
            score: e.score || 0,
            fileType: e.fileType || ''
          })),
          physiological: item.physiological || [],
          reactionValue: item.reactionValue || 0,
          eventType: item.eventType || '',
          metadata: item.metadata || {}
        }));

        if (response.analysis) {
          analysisResults = {
            gapAreas: (response.analysis.gapAreas || []) as any,
            densityRegions: (response.analysis.densityRegions || []) as any,
            duplicates: (response.analysis.duplicates || []) as any,
            overallDensity: response.analysis.overallDensity || 0
          };
        }

        if (data.length > 0) {
          const extent = d3.extent(data, d => d.timestamp) as [number, number];
          timeRange = { start: extent[0], end: extent[1] };
        }
      } else {
        error = "No timeline data found for this participant";
      }

      // Still fetch statistics and other data if needed, or we could integrate them too
      const [statsRes, vectorsRes, aggregatesRes] = await Promise.allSettled([
        timelineClient.getWordStatistics({ participantId, sessionId: sessionId || undefined }),
        timelineClient.getEmotionVectors({ participantId, sessionId: sessionId || undefined }),
        timelineClient.getWordAggregates({ participantId, sessionId: sessionId || undefined })
      ]);

      if (statsRes.status === 'fulfilled') {
        wordStatistics = statsRes.value.statistics || [];
      }
      if (vectorsRes.status === 'fulfilled') {
        emotionVectors = vectorsRes.value.vectors || [];
      }
      if (aggregatesRes.status === 'fulfilled') {
        wordAggregates = aggregatesRes.value.aggregates || [];
      }

    } catch (e: any) {
      error = e.message || "Failed to fetch visualization data";
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
  let analysisResults: AnalysisResults = $state({
    gapAreas: [],
    densityRegions: [],
    duplicates: [],
    overallDensity: 0
  });

  async function fetchAnalysis() {
    if (!participantId) return;
    try {
      const response = await timelineClient.getAnalysis({
        participantId,
        sessionId: sessionId || ''
      });
      if (response) {
        analysisResults = {
          gapAreas: (response.gapAreas || []) as any,
          densityRegions: (response.densityRegions || []) as any,
          duplicates: (response.duplicates || []) as any,
          overallDensity: response.overallDensity || 0
        };
      }
    } catch (e) {
      console.error("Failed to fetch analysis", e);
    }
  }

  $effect(() => {
    if (data.length > 0 && showAnalysis) {
      fetchAnalysis();
    }
  });
</script>

<div class="timeline-visualization-container flex flex-col space-y-8">
  <!-- Header / Tabs Section -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-200 dark:border-gray-700">
    <div class="flex p-1 bg-gray-200/50 dark:bg-gray-900/50 rounded-xl">
      <button 
        class="px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all {activeTab === 'timeline' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}"
        onclick={() => activeTab = 'timeline'}
      >
        Timeline
      </button>
      <button 
        class="px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all {activeTab === 'force3d' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}"
        onclick={() => activeTab = 'force3d'}
      >
        3D Space
      </button>
    </div>

    {#if activeTab === 'timeline' && !hideFilters}
      <div class="flex items-center gap-4 px-4">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Scale</span>
          <input type="range" bind:value={filters.timeScale} min="0.1" max="5.0" step="0.1" class="w-32 accent-blue-500" />
        </div>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-32 space-y-6">
      <div class="spinner"></div>
      <p class="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Analyzing Neural Patterns...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl p-12 text-center">
      <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Signal Interrupted</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">{error}</p>
      <button class="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all" onclick={fetchData}>
        Reconnect
      </button>
    </div>
  {:else}
    <div class="transition-all duration-500">
      {#if activeTab === 'timeline'}
        <div class="space-y-10">
          <KPICards {data} />
          
          <div class="bg-gray-50/50 dark:bg-gray-900/50 rounded-[40px] border border-gray-100 dark:border-gray-800 p-8">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-3">
                <div class="w-2 h-8 bg-blue-500 rounded-full"></div>
                <h3 class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Timeline Stream</h3>
              </div>
            </div>
            
            <div class="overflow-x-auto custom-scrollbar pb-4">
              <TimelineChart 
                {data} 
                {filters} 
                width={Math.max(width, 1000)} 
                {height} 
                {timeRange}
                analysisResults={analysisResults}
                onTimeRangeChange={(r) => timeRange = r}
                onDataPointSelect={() => {}}
                onTooltipShow={() => {}}
                onTooltipHide={() => {}}
              />
            </div>
          </div>
        </div>
      {:else if activeTab === 'force3d'}
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div class="xl:col-span-3 space-y-6">
            <Force3DControls 
              {forcePresets} {forcePresetId} {springK} {repulsionK} {restLength} {minSep} {sepK} {damping} {shellRadius} {shellK} {radialOutK} {alpha} {gamma} {lambda} {eta}
              onPresetChange={applyForcePreset} 
              onSpringKChange={(v) => springK = v} 
              onRepulsionKChange={(v) => repulsionK = v} 
              onRestLengthChange={(v) => restLength = v}
              onMinSepChange={(v) => minSep = v} 
              onSepKChange={(v) => sepK = v} 
              onShellRadiusChange={(v) => shellRadius = v} 
              onShellKChange={(v) => shellK = v}
              onRadialOutKChange={(v) => radialOutK = v} 
              onDampingChange={(v) => damping = v} 
              onAlphaChange={(v) => alpha = v} 
              onGammaChange={(v) => gamma = v}
              onLambdaChange={(v) => lambda = v} 
              onEtaChange={(v) => eta = v}
            />
            
            <div class="bg-black rounded-[48px] overflow-hidden relative shadow-2xl border-[12px] border-gray-100 dark:border-gray-800" style="height: 700px;">
              <Force3DWordGraphTypeGPU 
                nodes={graphData.nodes} links={graphData.links} width={width} height={700} 
                physics={{ springK, repulsionK, damping, restLength, maxSpeed: 200, shellRadius, shellK, radialOutK, minSep, sepK }}
                gapAreas={analysisResults.gapAreas} densityRegions={analysisResults.densityRegions} showAnalysis={showAnalysis}
              />
              
              <div class="absolute top-8 right-8 flex flex-col gap-4">
                <button 
                  class="px-6 py-3 {showAnalysis ? 'bg-blue-600 text-white shadow-blue-500/40' : 'bg-white/10 text-white hover:bg-white/20'} backdrop-blur-2xl border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl"
                  onclick={() => showAnalysis = !showAnalysis}
                >
                  {showAnalysis ? '✨ Analysis Active' : '🔍 Analyze Space'}
                </button>
                
                <div class="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-[10px] text-gray-400 space-y-2">
                  <div class="flex items-center justify-between gap-4">
                    <span class="font-bold">ROTATE</span>
                    <kbd class="px-2 py-1 bg-white/10 rounded-md">DRAG</kbd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span class="font-bold">ZOOM</span>
                    <kbd class="px-2 py-1 bg-white/10 rounded-md">SCROLL</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="xl:col-span-1">
            <div class="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-xl h-full flex flex-col">
              <div class="flex items-center justify-between mb-8">
                <h3 class="font-black text-xl text-gray-900 dark:text-white tracking-tighter uppercase">Space Insight</h3>
                <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full uppercase tracking-widest">AI Computed</span>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <StructureAnalysisPanel 
                  gapAreas={analysisResults.gapAreas} 
                  densityRegions={analysisResults.densityRegions} 
                  duplicates={analysisResults.duplicates} 
                  overallDensity={analysisResults.overallDensity}
                />
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.2);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.4);
  }
</style>
