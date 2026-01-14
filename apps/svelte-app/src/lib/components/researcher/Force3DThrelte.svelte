<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { WebGPURenderer } from 'three/webgpu';
  import Scene from './ThrelteGraph.svelte';
  import type { WordNode, WordLink, GapArea, DensityRegion, GhostPattern } from './types';

  interface Props {
    nodes: WordNode[];
    links: WordLink[];
    width?: number;
    height?: number;
    background?: string;
    physics?: any;
    gapAreas?: GapArea[];
    densityRegions?: DensityRegion[];
    ghostPatterns?: GhostPattern[];
    showAnalysis?: boolean;
    onHover?: (info: { node?: WordNode; link?: { source: WordNode; target: WordNode; weight: number } } | null) => void;
    onClick?: (info: { node?: WordNode; link?: { source: WordNode; target: WordNode; weight: number } }) => void;
    pinnedItems?: Array<{ node?: WordNode; link?: { source: WordNode; target: WordNode; weight: number } }>;
  }

  let {
    nodes,
    links,
    width = 1000,
    height = 600,
    background = '#ffffff',
    physics,
    gapAreas = [],
    densityRegions = [],
    ghostPatterns = [],
    showAnalysis = false,
    onHover,
    onClick,
    pinnedItems = []
  }: Props = $props();

  // WebGPU support check
  const isWebGPUSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;
</script>

<div class="w-full relative overflow-hidden" style="height: {height}px; background: {background};">
  {#if isWebGPUSupported}
    <Canvas
      createRenderer={(canvas) => {
        return new WebGPURenderer({
          canvas,
          antialias: true,
          forceWebGL: false
        });
      }}
    >
      <Scene
        {nodes}
        {links}
        {physics}
        {gapAreas}
        {densityRegions}
        {ghostPatterns}
        {showAnalysis}
        {onHover}
        {onClick}
        {pinnedItems}
      />
    </Canvas>
  {:else}
    <div class="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8 text-center">
      <div class="bg-orange-500/20 border border-orange-500/50 rounded-2xl p-6 max-w-md">
        <h3 class="text-xl font-bold mb-2 text-orange-400">WebGPU Not Supported</h3>
        <p class="text-gray-400 text-sm">
          Your browser does not support WebGPU, which is required for this high-performance visualization. 
          Please try using a modern browser like Chrome, Edge, or Arc.
        </p>
      </div>
    </div>
  {/if}
</div>

