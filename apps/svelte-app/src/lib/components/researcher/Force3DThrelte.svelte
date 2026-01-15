<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { WebGPURenderer } from 'three/webgpu';
  import { WebGLRenderer } from 'three';
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
    <Canvas
      createRenderer={(canvas) => {
        return new WebGLRenderer({
          canvas,
          antialias: true
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
  {/if}
</div>

