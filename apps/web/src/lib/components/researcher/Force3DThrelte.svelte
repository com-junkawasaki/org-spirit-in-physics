<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { WebGPURenderer } from 'three/webgpu';
  import { WebGLRenderer } from 'three';
  import Scene from './ThrelteGraph.svelte';
  import type { WordNode, WordLink, GapArea, DensityRegion, GhostPattern } from '@spirit/visualization';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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
  // WebGPU is causing crashes on some environments, defaulting to WebGL for now.
  const isWebGPUSupported = false; // typeof navigator !== 'undefined' && 'gpu' in navigator;

  if (browser) {
    onMount(() => {
      console.log('[DEBUG] Force3DThrelte.svelte: onMount started');
      console.log('[DEBUG] Using WebGL renderer (WebGPU disabled)');
      console.log('[DEBUG] Nodes count:', nodes.length);
      console.log('[DEBUG] Links count:', links.length);
    });
  }
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
        console.log('[DEBUG] Force3DThrelte: Creating WebGL renderer');
        try {
          const renderer = new WebGLRenderer({
            canvas,
            antialias: true
          });
          console.log('[DEBUG] Force3DThrelte: WebGL renderer created successfully');
          return renderer;
        } catch (error) {
          console.error('[DEBUG] Force3DThrelte: Failed to create WebGL renderer:', error);
          throw error;
        }
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

