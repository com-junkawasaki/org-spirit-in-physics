<script lang="ts">
  import type { GapArea, DensityRegion, DuplicateCandidate } from './types';

  interface Props {
    gapAreas: GapArea[];
    densityRegions: DensityRegion[];
    duplicates: DuplicateCandidate[];
    overallDensity: number;
    onGapAreaClick?: (gapArea: GapArea) => void;
    onDensityRegionClick?: (region: DensityRegion) => void;
    onDuplicateClick?: (duplicate: DuplicateCandidate) => void;
  }

  let {
    gapAreas,
    densityRegions,
    duplicates,
    overallDensity,
    onGapAreaClick,
    onDensityRegionClick,
    onDuplicateClick
  }: Props = $props();
</script>

<div class="space-y-4">
  <!-- 全体密度 -->
  <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <h4 class="font-semibold text-sm mb-2">全体密度</h4>
    <div class="text-xs text-gray-600 dark:text-gray-400">
      密度: {overallDensity.toFixed(4)}
    </div>
  </div>

  <!-- 空白エリア -->
  {#if gapAreas.length > 0}
    <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
      <h4 class="font-semibold text-sm mb-2 flex items-center gap-2">
        <span class="text-yellow-600">?</span>
        <span>空白エリア（{gapAreas.length}箇所）</span>
      </h4>
      <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
        漏れた項目を発見できる可能性があります。
      </p>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each gapAreas as gap (gap.id)}
          <button
            type="button"
            onclick={() => onGapAreaClick?.(gap)}
            class="w-full text-left p-2 bg-white dark:bg-gray-800 rounded border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
          >
            <div class="flex items-start justify-between mb-1">
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200">
                信頼度: {(gap.confidence * 100).toFixed(0)}%
              </span>
              <span class="text-xs text-gray-500">
                半径: {gap.radius.toFixed(0)}
              </span>
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
              近接ノード: {gap.nearbyNodes.length}個
            </div>
            {#if gap.suggestedItems.length > 0}
              <div class="mt-1 text-xs text-blue-600 dark:text-blue-400">
                推奨: {gap.suggestedItems[0]}
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 密集領域 -->
  {#if densityRegions.filter(r => r.isOvercrowded).length > 0}
    <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <h4 class="font-semibold text-sm mb-2 flex items-center gap-2">
        <span class="text-red-600">⚠</span>
        <span>密集領域（{densityRegions.filter(r => r.isOvercrowded).length}箇所）</span>
      </h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each densityRegions.filter(r => r.isOvercrowded) as region (region.id)}
          <button
            type="button"
            onclick={() => onDensityRegionClick?.(region)}
            class="w-full text-left p-2 bg-white dark:bg-gray-800 rounded border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <div class="flex items-start justify-between mb-1">
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200">
                ノード数: {region.nodeCount}
              </span>
              <span class="text-xs text-gray-500">
                密度: {region.density.toFixed(4)}
              </span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 重複候補 -->
  {#if duplicates.length > 0}
    <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
      <h4 class="font-semibold text-sm mb-2 flex items-center gap-2">
        <span class="text-orange-600">🔄</span>
        <span>重複候補（{duplicates.length}組）</span>
      </h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each duplicates as dup (dup.id)}
          <button
            type="button"
            onclick={() => onDuplicateClick?.(dup)}
            class="w-full text-left p-2 bg-white dark:bg-gray-800 rounded border border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
          >
            <div class="flex items-start justify-between mb-1">
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200">
                {dup.labels.join(' ↔ ')}
              </span>
              <span class="text-xs text-gray-500">
                {(dup.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if gapAreas.length === 0 && densityRegions.length === 0 && duplicates.length === 0}
    <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400">分析結果がありません</p>
    </div>
  {/if}
</div>

