<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { OrbitControls, Text } from '@threlte/extras';
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force-3d';
  import type { WordNode, WordLink, GapArea, DensityRegion, GhostPattern } from './types';

  interface Props {
    nodes: WordNode[];
    links: WordLink[];
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
    physics,
    gapAreas = [],
    densityRegions = [],
    ghostPatterns = [],
    showAnalysis = false,
    onHover,
    onClick,
    pinnedItems = []
  }: Props = $props();

  // Simulation state
  let simulation: any;
  let d3Nodes = $state<any[]>([]);
  let d3Links = $state<any[]>([]);

  // Convert Props to D3 structure
  function initSimulation() {
    d3Nodes = nodes.map(n => ({ 
      ...n, 
      x: n.initial?.[0] ?? (Math.random() - 0.5) * 400,
      y: n.initial?.[1] ?? (Math.random() - 0.5) * 400,
      z: n.initial?.[2] ?? (Math.random() - 0.5) * 400,
      vx: 0, vy: 0, vz: 0
    }));

    d3Links = links.map(l => ({
      ...l,
      source: d3Nodes[l.source]?.id,
      target: d3Nodes[l.target]?.id,
    }));

    simulation = d3.forceSimulation(d3Nodes, 3)
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(physics?.restLength ?? 100))
      .force('charge', d3.forceManyBody().strength(-(physics?.repulsionK ?? 1000) / 5))
      .force('center', d3.forceCenter(0, 0, 0))
      .force('radial', d3.forceRadial(physics?.shellRadius ?? 500).strength(0.1))
      .velocityDecay(1 - (physics?.damping ?? 0.93));
  }

  onMount(() => {
    initSimulation();
  });

  // React to data changes
  $effect(() => {
    if (nodes && links && simulation) {
      // Simple re-init if count changes significantly, otherwise update forces
      initSimulation();
    }
  });

  useTask(() => {
    if (simulation) {
      simulation.tick();
      // Force UI update by triggering state refresh
      d3Nodes = [...d3Nodes];
      d3Links = [...d3Links];
    }
  });

  // Materials
  const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
  const anchorGeometry = new THREE.BoxGeometry(2, 2, 2);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.3 });

  function getLinkPoints(link: any) {
    if (!link.source || !link.target) return [];
    return [
      new THREE.Vector3(link.source.x || 0, link.source.y || 0, link.source.z || 0),
      new THREE.Vector3(link.target.x || 0, link.target.y || 0, link.target.z || 0)
    ];
  }
</script>

<T.PerspectiveCamera
  makeDefault
  position={[0, 0, 1000]}
  fov={45}
>
  <OrbitControls enableDamping />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.4} />
<T.DirectionalLight position={[100, 100, 100]} intensity={1} />
<T.PointLight position={[-100, -100, -100]} intensity={0.5} color="#4444ff" />

<!-- Links -->
{#each d3Links as link}
  {#if typeof link.source === 'object' && typeof link.target === 'object'}
    <T.Line
      points={getLinkPoints(link)}
    >
      <T.LineBasicMaterial 
        color={link.color || (link.mode === 'tension' ? '#666' : '#3b82f6')} 
        transparent 
        opacity={0.3} 
      />
    </T.Line>
  {/if}
{/each}

<!-- Nodes -->
{#each d3Nodes as node (node.id)}
  <T.Group position={[node.x || 0, node.y || 0, node.z || 0]}>
    <T.Mesh
      geometry={node.nodeType === 'anchor' ? anchorGeometry : nodeGeometry}
      scale={node.scale * 2 || 2}
      onpointerenter={() => onHover?.({ node })}
      onpointerleave={() => onHover?.(null)}
      onclick={() => onClick?.({ node })}
    >
      <T.MeshStandardMaterial 
        color={node.color || '#1e40af'} 
        emissive={node.color || '#1e40af'}
        emissiveIntensity={0.2}
      />
    </T.Mesh>

    {#if node.label && (node.scale > 5 || node.nodeType === 'anchor')}
      <Text
        text={node.label}
        position.y={(node.scale * 2 || 2) + 5}
        fontSize={12}
        anchorX="center"
        anchorY="bottom"
        color="white"
        outlineColor="black"
        outlineWidth={1}
      />
    {/if}
  </T.Group>
{/each}

<!-- Ghost Patterns / Analysis -->
{#if showAnalysis}
  {#each ghostPatterns as ghost}
    <T.Group position={ghost.center}>
      <T.Mesh>
        <T.SphereGeometry args={[ghost.radius, 32, 32]} />
        <T.MeshStandardMaterial 
          color={ghost.pattern_type === 'overcrowding' ? '#9333ea' : '#c026d3'} 
          transparent 
          opacity={0.1} 
          wireframe
        />
      </T.Mesh>
      <Text
        text={ghost.pattern_type.toUpperCase()}
        position.y={ghost.radius + 10}
        fontSize={16}
        color={ghost.pattern_type === 'overcrowding' ? '#9333ea' : '#c026d3'}
      />
    </T.Group>
  {/each}
{/if}

