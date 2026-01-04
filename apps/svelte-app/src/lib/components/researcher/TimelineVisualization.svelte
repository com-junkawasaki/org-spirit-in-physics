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
    height = 850,
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

  // Emotion Anchors
  const anchor2d: Array<{ name: string; x: number; y: number; color: string }> = [
    { name: 'Joy', x: 0.15, y: 0.85, color: '#f59e0b' },
    { name: 'Sadness', x: 0.70, y: 0.45, color: '#1f2937' },
    { name: 'Anger', x: 0.82, y: 0.25, color: '#ef4444' },
    { name: 'Fear', x: 0.92, y: 0.10, color: '#a78bfa' },
    { name: 'Disgust', x: 0.78, y: 0.52, color: '#10b981' },
    { name: 'Calmness', x: 0.28, y: 0.70, color: '#93c5fd' },
    { name: 'Interest', x: 0.35, y: 0.55, color: '#60a5fa' },
    { name: 'Surprise', x: 0.40, y: 0.20, color: '#22c55e' },
    { name: 'Confusion', x: 0.48, y: 0.35, color: '#64748b' },
    { name: 'Determination', x: 0.22, y: 0.85, color: '#f97316' },
  ];

  const anchorToKey: Record<string, string> = {
    Joy: 'joy',
    Sadness: 'sadness',
    Anger: 'anger',
    Fear: 'fear',
    Disgust: 'disgust',
    Calmness: 'calm',
    Interest: 'focus',
    Surprise: 'surprise',
    Confusion: 'confusion',
    Determination: 'excitement',
  };

  const toSphere = (x01: number, y01: number, radius: number): [number, number, number] => {
    const u = (x01 - 0.5) * Math.PI * 1.6; // 横回転
    const v = (y01 - 0.5) * Math.PI; // 縦
    const cx = Math.cos(v) * Math.cos(u);
    const cy = Math.cos(v) * Math.sin(u);
    const cz = Math.sin(v);
    return [radius * cx, radius * cy, radius * cz];
  };

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
      const response = await timelineClient.getIntegratedTimeline({ 
        participantId, 
        sessionId: sessionId || undefined 
      });
      
      if (response && response.points && response.points.length > 0) {
        let points = response.points;
        
        // If no sessionId was provided, filter to only show the most recent session
        // that has word data to avoid massive time gaps
        if (!sessionId) {
          const sessionsWithWords = [...new Set(points.filter((p: any) => p.word).map((p: any) => p.sessionId))];
          if (sessionsWithWords.length > 1) {
            // Find the session with the most recent timestamp
            const latestSessionId = sessionsWithWords.sort((a, b) => {
              const lastA = Math.max(...points.filter((p: any) => p.sessionId === a).map((p: any) => new Date(p.time).getTime()));
              const lastB = Math.max(...points.filter((p: any) => p.sessionId === b).map((p: any) => new Date(p.time).getTime()));
              return lastB - lastA;
            })[0];
            points = points.filter((p: any) => p.sessionId === latestSessionId);
            console.log(`Auto-selected latest session: ${latestSessionId}`);
          }
        }

        data = points.map((item: any) => {
          // Compact format from TS worker: { t: { s, n }, w, rt, hr, e, p, rv, et }
          let timestamp: number = 0;
          if (item.t) {
            timestamp = (Number(item.t.s) * 1000 + (item.t.n / 1000000));
          } else if (item.time) { // Fallback for standard Protobuf format
            if (typeof item.time === 'string') {
              timestamp = new Date(item.time).getTime();
            } else if (item.time.seconds !== undefined) {
              timestamp = (Number(item.time.seconds) * 1000 + (item.time.nanos / 1000000));
            }
          }

          if (!timestamp || isNaN(timestamp)) {
            return null;
          }

          // Compact emotions: Array<{ n, s, f }>
          const emotions = (item.e || []).map((e: any) => ({
            name: e.n,
            score: e.s,
            fileType: e.f
          }));

          // Compact physiological: Array<{ v, m }>
          const physiological = (item.p || []).map((p: any) => ({
            value: p.v,
            measurementType: p.m
          }));

          const mapped: TimelineDataPoint = {
            timestamp,
            word: item.w || item.word || '',
            reactionTime: (item.rt ?? item.reactionTime ?? item.reaction_time ?? 0) * 1000,
            hasResponse: item.hr ?? item.hasResponse ?? item.has_response ?? false,
            emotions,
            physiological,
            reactionValue: item.rv ?? item.reactionValue ?? item.reaction_value ?? 0,
            eventType: item.et ?? item.eventType ?? item.event_type ?? '',
            metadata: {}
          };
          return mapped;
        }).filter((d: any): d is TimelineDataPoint => d !== null);

        if (response.analysis) {
          const analysis = response.analysis as any;
          analysisResults = {
            gapAreas: (analysis.gapAreas ?? analysis.gap_areas ?? []) as any,
            densityRegions: (analysis.densityRegions ?? analysis.density_regions ?? []) as any,
            duplicates: (analysis.duplicates ?? analysis.duplicates ?? []) as any,
            ghostPatterns: (analysis.ghostPatterns ?? analysis.ghost_patterns ?? []) as any,
            overallDensity: analysis.overallDensity ?? analysis.overall_density ?? 0
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

    // 1. Emotion Anchors
    const anchorNodes: WordNode[] = anchor2d.map((a, idx) => {
      const [x, y, z] = toSphere(a.x, a.y, shellRadius);
      return {
        id: `anchor-${idx}`,
        label: a.name,
        scale: 6,
        fixed: true,
        nodeType: 'anchor',
        initial: [x, y, z],
        color: a.color
      };
    });

    // 2. Word Nodes (Only include stimulus words for 3D graph)
    const wordNodes: WordNode[] = data
      .filter(d => d.word && d.word !== 'Unknown')
      .map((d, i) => {
      // Find emotion vector for this word
      const vec = emotionVectors.find(v => v.word === d.word);
      const emotion: Record<string, number> = {};
      if (vec) {
        if (vec.joySum) emotion.joy = Number(vec.joySum);
        if (vec.sadnessSum) emotion.sadness = Number(vec.sadnessSum);
        if (vec.angerSum) emotion.anger = Number(vec.angerSum);
        if (vec.fearSum) emotion.fear = Number(vec.fearSum);
        if (vec.surpriseSum) emotion.surprise = Number(vec.surpriseSum);
        if (vec.disgustSum) emotion.disgust = Number(vec.disgustSum);
        if (vec.calmSum) emotion.calm = Number(vec.calmSum);
        if (vec.focusSum) emotion.focus = Number(vec.focusSum);
        if (vec.excitementSum) emotion.excitement = Number(vec.excitementSum);
        if (vec.confusionSum) emotion.confusion = Number(vec.confusionSum);
      }

      // 反応値（reactionValue）と生理反応（physiological）の強さをスケールに反映
      const rv = d.reactionValue || 0;
      const phys = Array.isArray(d.physiological) ? d.physiological.length : 0;
      const rt = (d.reactionTime || 0) / 5000; // 反応時間（5秒を基準に正規化）
      
      // スケール差を大幅に抑制（高密度な配置でも視認性を確保）
      const nodeScale = 0.5 + (rv * 3.0) + (phys * 0.2) + (rt * 0.8);

      return {
        id: `node-${i}`,
        label: d.word,
        scale: nodeScale,
        color: '#1e40af',
        emotion: Object.keys(emotion).length > 0 ? emotion : undefined
      };
    });

    const allNodes = [...anchorNodes, ...wordNodes];
    const links: WordLink[] = [];

    // 3. Sequential links between word nodes
    for (let i = 0; i < wordNodes.length - 1; i++) {
      links.push({ 
        source: anchorNodes.length + i, 
        target: anchorNodes.length + i + 1, 
        weight: 0.5 
      });
    }

    // 4. Emotion anchor links
    wordNodes.forEach((node, i) => {
      if (node.emotion) {
        anchorNodes.forEach((anchor, ai) => {
          const key = anchorToKey[anchor.label];
          if (key && (node.emotion as any)[key]) {
            const score = (node.emotion as any)[key];
            if (score > 0.1) { // Threshold for link visibility
              links.push({
                source: anchorNodes.length + i,
                target: ai,
                weight: score * 0.8,
                mode: 'tension'
              });
            }
          }
        });
      }
    });

    return { nodes: allNodes, links };
  });

  let showAnalysis = $state(false);
  let hoveredInfo = $state<{ node?: WordNode; link?: { source: WordNode; target: WordNode; weight: number } } | null>(null);
  let pinnedItems = $state<Array<{ node?: WordNode; link?: { source: WordNode; target: WordNode; weight: number } }>>([]);

  let analysisResults = $state<AnalysisResults>({
    gapAreas: [],
    densityRegions: [],
    duplicates: [],
    ghostPatterns: [],
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
          ghostPatterns: (response.ghostPatterns || []) as any,
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
          
          <div class="bg-gray-50/50 dark:bg-gray-900/50 rounded-[40px] border border-gray-100 dark:border-gray-800 p-8 timeline-stream-container">
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
            <div class="bg-black rounded-[48px] overflow-hidden relative shadow-2xl border-[12px] border-gray-100 dark:border-gray-800" style="height: 700px;">
              <Force3DWordGraphTypeGPU 
                nodes={graphData.nodes} links={graphData.links} width={width} height={700} 
                physics={{ springK, repulsionK, damping, restLength, maxSpeed: 200, shellRadius, shellK, radialOutK, minSep, sepK }}
                gapAreas={analysisResults.gapAreas} densityRegions={analysisResults.densityRegions} 
                ghostPatterns={analysisResults.ghostPatterns} showAnalysis={showAnalysis}
                onHover={(info) => hoveredInfo = info}
                pinnedItems={pinnedItems}
                onClick={(info) => {
                  const exists = pinnedItems.find(p => 
                    (info.node && p.node?.label === info.node.label) || 
                    (info.link && p.link?.source.label === info.link.source.label && p.link?.target.label === info.link.target.label)
                  );
                  if (!exists) {
                    pinnedItems = [info, ...pinnedItems];
                  }
                }}
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
          </div>
          
          <div class="xl:col-span-1">
            <div class="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-xl h-full flex flex-col">
              <div class="flex items-center justify-between mb-8">
                <h3 class="font-black text-xl text-gray-900 dark:text-white tracking-tighter uppercase">Space Insight</h3>
                <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full uppercase tracking-widest">AI Computed</span>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                <!-- Pinned Items -->
                {#each pinnedItems as item, idx}
                  <div class="bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4 duration-300 relative group/pinned">
                    <button 
                      class="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover/pinned:opacity-100 transition-opacity"
                      onclick={() => pinnedItems = pinnedItems.filter((_, i) => i !== idx)}
                      title="Remove pinned item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {#if item.node}
                      <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pinned Neuron</span>
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight {item.node.nodeType === 'anchor' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}">
                          {item.node.nodeType || 'word'}
                        </span>
                      </div>
                      <div class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">
                        {item.node.label}
                      </div>
                      <!-- detail section similar to hovered but smaller -->
                      {#if item.node.nodeType !== 'anchor'}
                        <div class="grid grid-cols-2 gap-3 mb-4">
                          <div class="bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-blue-50/50">
                            <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Scale</span>
                            <span class="text-md font-black text-gray-900 dark:text-white">{item.node.scale.toFixed(1)}</span>
                          </div>
                        </div>
                      {/if}
                    {:else if item.link}
                      <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-4">Pinned Synapse</span>
                      <div class="flex items-center justify-between gap-2 mb-4">
                        <div class="flex-1 text-center bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-blue-50/50">
                          <span class="text-[10px] font-black text-gray-900 dark:text-white truncate block">{item.link.source.label}</span>
                        </div>
                        <div class="flex-1 text-center bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-blue-50/50">
                          <span class="text-[10px] font-black text-gray-900 dark:text-white truncate block">{item.link.target.label}</span>
                        </div>
                      </div>
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Weight</span>
                        <span class="text-[10px] font-black text-blue-500">{(item.link.weight * 100).toFixed(1)}%</span>
                      </div>
                    {/if}
                  </div>
                {/each}

                <!-- Hovered Detail -->
                {#if hoveredInfo?.node}
                  <div class="bg-gray-50 dark:bg-black/40 rounded-3xl p-6 border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Entity</span>
                      <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight {hoveredInfo.node.nodeType === 'anchor' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}">
                        {hoveredInfo.node.nodeType || 'word'}
                      </span>
                    </div>
                    <div class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">
                      {hoveredInfo.node.label}
                    </div>

                    {#if hoveredInfo.node.nodeType !== 'anchor'}
                      <div class="grid grid-cols-2 gap-3 mb-6">
                        <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Scale</span>
                          <span class="text-lg font-black text-gray-900 dark:text-white">{hoveredInfo.node.scale.toFixed(1)}</span>
                        </div>
                        <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Emotion Sum</span>
                          <span class="text-lg font-black text-gray-900 dark:text-white">
                            {Object.values(hoveredInfo.node.emotion || {}).reduce((a, b) => a + (b || 0), 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {#if hoveredInfo.node.emotion}
                        <div class="space-y-2">
                          <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Emotional Vectors</span>
                          <div class="grid grid-cols-1 gap-1.5">
                            {#each Object.entries(hoveredInfo.node.emotion).filter(([_, v]) => (v || 0) > 0.05).sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [emo, val]}
                              <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold text-gray-500 uppercase">{emo}</span>
                                <div class="flex items-center gap-2">
                                  <div class="w-16 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 rounded-full" style="width: {(val || 0) * 100}%"></div>
                                  </div>
                                  <span class="text-[10px] font-black text-gray-900 dark:text-white w-8 text-right">{(val || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    {/if}
                  </div>
                {:else if hoveredInfo?.link}
                  <div class="bg-gray-50 dark:bg-black/40 rounded-3xl p-6 border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Synaptic Connection</span>
                    <div class="flex items-center justify-between gap-2 mb-6">
                      <div class="flex-1 text-center bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span class="text-[10px] font-black text-gray-900 dark:text-white truncate block">{hoveredInfo.link.source.label}</span>
                      </div>
                      <div class="flex-shrink-0 text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div class="flex-1 text-center bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span class="text-[10px] font-black text-gray-900 dark:text-white truncate block">{hoveredInfo.link.target.label}</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Connection Weight</span>
                      <span class="text-[10px] font-black text-blue-500">{(hoveredInfo.link.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500 rounded-full" style="width: {hoveredInfo.link.weight * 100}%"></div>
                    </div>
                  </div>
                {:else}
                  <div class="bg-gray-50/50 dark:bg-white/5 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-white/10 text-center space-y-4">
                    <div class="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mx-auto shadow-sm">
                      <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                      Interact with neurons<br/>to analyze geometry
                    </p>
                  </div>
                {/if}

                <div class="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Structural Analysis</h4>
                  <StructureAnalysisPanel 
                    gapAreas={analysisResults.gapAreas ?? []} 
                    densityRegions={analysisResults.densityRegions ?? []}
                    duplicates={analysisResults.duplicates} 
                    ghostPatterns={analysisResults.ghostPatterns}
                    overallDensity={analysisResults.overallDensity ?? 0}
                    onGhostPatternClick={(ghost) => {
                      // Center camera on ghost pattern center
                      // This would require camera control exposure, but for now we just pin the labels if any
                      if (ghost.labels && ghost.labels.length > 0) {
                        const node = graphData.nodes.find(n => ghost.labels?.includes(n.label));
                        if (node) {
                          pinnedItems = [{ node }, ...pinnedItems];
                        }
                      }
                    }}
                  />
                </div>
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
