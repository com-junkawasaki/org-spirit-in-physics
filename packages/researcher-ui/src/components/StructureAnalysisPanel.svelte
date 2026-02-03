<script lang="ts">
  import type { GapArea, DensityRegion, DuplicateCandidate, GhostPattern } from './types';

  interface Props {
    gapAreas: GapArea[];
    densityRegions: DensityRegion[];
    duplicates: DuplicateCandidate[];
    ghostPatterns?: GhostPattern[];
    overallDensity: number;
    onGapAreaClick?: (gapArea: GapArea) => void;
    onDensityRegionClick?: (region: DensityRegion) => void;
    onDuplicateClick?: (duplicate: DuplicateCandidate) => void;
    onGhostPatternClick?: (pattern: GhostPattern) => void;
  }

  let {
    gapAreas,
    densityRegions,
    duplicates,
    ghostPatterns = [],
    overallDensity,
    onGapAreaClick,
    onDensityRegionClick,
    onDuplicateClick,
    onGhostPatternClick
  }: Props = $props();
</script>

<div class="space-y-6">
  <!-- 全体密度 -->
  <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-bold text-[10px] text-gray-400 uppercase tracking-widest">Overall Density</h4>
      <span class="text-xs font-black text-gray-900 dark:text-white">{overallDensity.toFixed(4)}</span>
    </div>
    <div class="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
      <div class="bg-blue-500 h-full" style="width: {Math.min(100, overallDensity * 1000)}%"></div>
    </div>
  </div>

  <!-- Ghost Patterns (理論的な空間歪曲) -->
  {#if ghostPatterns.length > 0}
    <div class="space-y-3">
      <h4 class="font-bold text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
        <span>👻</span>
        <span>Ghost Patterns ({ghostPatterns.length})</span>
      </h4>
      <div class="grid grid-cols-1 gap-2">
        {#each ghostPatterns as ghost (ghost.id)}
          <button
            type="button"
            onclick={() => onGhostPatternClick?.(ghost)}
            class="analysis-item group w-full text-left p-3 bg-white dark:bg-gray-800/40 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-[9px] font-black rounded-md uppercase">
                {ghost.pattern_type}
              </span>
              <span class="text-[9px] font-bold text-gray-400">Int: {(ghost.intensity * 100).toFixed(0)}%</span>
            </div>
            <div class="text-[10px] font-bold text-gray-800 dark:text-gray-200 line-clamp-2">
              {ghost.description}
            </div>
            {#if (ghost.labels ?? []).length > 0}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each (ghost.labels ?? []).slice(0, 3) as label}
                  <span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[8px] rounded">
                    {label}
                  </span>
                {/each}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 空白エリア -->
  {#if gapAreas.length > 0}
    <div class="space-y-3">
      <h4 class="font-bold text-[10px] text-yellow-600 dark:text-yellow-500 uppercase tracking-widest flex items-center gap-2">
        <span>🔍</span>
        <span>Gap Discovery ({gapAreas.length})</span>
      </h4>
      <div class="grid grid-cols-1 gap-2">
        {#each gapAreas as gap (gap.id)}
          <button
            type="button"
            onclick={() => onGapAreaClick?.(gap)}
            class="analysis-item group w-full text-left p-3 bg-white dark:bg-gray-800/40 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-yellow-200 dark:hover:border-yellow-900/50 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-[9px] font-black rounded-md uppercase">
                Conf: {(gap.confidence * 100).toFixed(0)}%
              </span>
              <span class="text-[9px] font-bold text-gray-400">R: {gap.radius.toFixed(0)}</span>
            </div>
            {#if (gap.suggested_items ?? gap.suggestedItems ?? []).length > 0}
              <div class="text-[10px] font-bold text-gray-800 dark:text-gray-200 line-clamp-1">
                💡 {(gap.suggested_items ?? gap.suggestedItems ?? [])[0]}
              </div>
            {/if}
            <div class="mt-2 text-[9px] text-gray-400 group-hover:text-yellow-600 transition-colors">
              {(gap.nearby_nodes ?? gap.nearbyNodes ?? []).length} nearby nodes detected
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 密集領域 -->
  {#if densityRegions.filter(r => r.is_overcrowded ?? r.isOvercrowded).length > 0}
    <div class="space-y-3">
      <h4 class="font-bold text-[10px] text-red-600 dark:text-red-500 uppercase tracking-widest flex items-center gap-2">
        <span>⚠</span>
        <span>Clusters ({densityRegions.filter(r => r.is_overcrowded ?? r.isOvercrowded).length})</span>
      </h4>
      <div class="grid grid-cols-1 gap-2">
        {#each densityRegions.filter(r => r.is_overcrowded ?? r.isOvercrowded) as region (region.id)}
          <button
            type="button"
            onclick={() => onDensityRegionClick?.(region)}
            class="analysis-item group w-full text-left p-3 bg-white dark:bg-gray-800/40 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-black text-gray-800 dark:text-gray-100">{region.node_count ?? region.nodeCount} Nodes</span>
              <span class="text-[9px] font-bold text-red-500">D: {region.density.toFixed(3)}</span>
            </div>
            <div class="text-[9px] text-gray-400">Overcrowded area detected</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 重複候補 -->
  {#if duplicates.length > 0}
    <div class="space-y-3">
      <h4 class="font-bold text-[10px] text-orange-600 dark:text-orange-500 uppercase tracking-widest flex items-center gap-2">
        <span>🔄</span>
        <span>Duplicate Match ({duplicates.length})</span>
      </h4>
      <div class="grid grid-cols-1 gap-2">
        {#each duplicates as dup (dup.id)}
          <button
            type="button"
            onclick={() => onDuplicateClick?.(dup)}
            class="analysis-item group w-full text-left p-3 bg-white dark:bg-gray-800/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-[9px] font-black rounded-md uppercase">
                Sim: {(dup.similarity * 100).toFixed(0)}%
              </span>
            </div>
            <div class="text-[10px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span class="truncate">{dup.labels[0]}</span>
              <span class="text-gray-400">≈</span>
              <span class="truncate">{dup.labels[1]}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if gapAreas.length === 0 && densityRegions.length === 0 && duplicates.length === 0}
    <div class="p-12 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
      <div class="text-3xl mb-3 opacity-20">🧊</div>
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No structural issues</p>
    </div>
  {/if}
</div>

