<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { OrbitControls, Text } from '@threlte/extras';
  import * as THREE from 'three';
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force-3d';
  import type { WordNode, WordLink, GapArea, DensityRegion, GhostPattern } from '@spirit/visualization';

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

  let simulation: any;
  let d3Nodes = $state<any[]>([]);
  let d3Links = $state<any[]>([]);
  let tickCount = 0;
  const MAX_TICKS = 300; // Limit simulation duration to prevent persistent CPU drain
  
  // Track references to Three.js objects for direct updates
  let nodeRefs: Record<string, THREE.Group> = {};
  let linkRefs: Array<{ ref: any; sourceIdx: number; targetIdx: number }> = [];

  // Convert Props to D3 structure
  function initSimulation() {
    tickCount = 0;
    nodeRefs = {};
    linkRefs = [];
    d3Nodes = nodes.map(n => {
      const x = n.initial?.[0] ?? (Math.random() - 0.5) * 400;
      const y = n.initial?.[1] ?? (Math.random() - 0.5) * 400;
      const z = n.initial?.[2] ?? (Math.random() - 0.5) * 400;
      return { 
        ...n, 
        x, y, z,
        fx: n.fixed ? x : undefined,
        fy: n.fixed ? y : undefined,
        fz: n.fixed ? z : undefined,
        vx: 0, vy: 0, vz: 0
      };
    });

    d3Links = links.map(l => ({
      ...l,
      source: d3Nodes[l.source]?.id,
      target: d3Nodes[l.target]?.id,
      sourceIdx: l.source,
      targetIdx: l.target
    }));

    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(d3Nodes, 3)
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(physics?.restLength ?? 100))
      .force('charge', d3.forceManyBody().strength(-(physics?.repulsionK ?? 1000) / 5))
      .force('center', d3.forceCenter(0, 0, 0).strength(0.05))
      .force('radial', d3.forceRadial(physics?.shellRadius ?? 500).strength(0.1))
      .velocityDecay(1 - (physics?.damping ?? 0.93))
      .alphaMin(0.01)  // Stop simulation when alpha drops below this threshold
      .alphaDecay(0.02)  // Increase decay rate for faster convergence
      .on('tick', () => {
        tickCount++;
        if (tickCount > MAX_TICKS) {
          simulation.stop();
          console.log('[DEBUG] Simulation auto-stopped after MAX_TICKS');
          return;
        }

        // Direct updates to Three.js objects
        for (const node of d3Nodes) {
          const ref = nodeRefs[node.id];
          if (ref) {
            ref.position.set(node.x, node.y, node.z);
          }
        }
        
        for (const link of linkRefs) {
          if (link.ref) {
            const s = d3Nodes[link.sourceIdx];
            const t = d3Nodes[link.targetIdx];
            if (s && t) {
              const positions = link.ref.geometry.attributes.position;
              positions.setXYZ(0, s.x, s.y, s.z);
              positions.setXYZ(1, t.x, t.y, t.z);
              positions.needsUpdate = true;
            }
          }
        }
      });
  }

  onMount(() => {
    initSimulation();
    return () => simulation?.stop();
  });

  // React to data changes - use a debounce-like approach to prevent re-initialization loops
  let lastNodesLength = 0;
  let lastLinksLength = 0;
  $effect(() => {
    // Only re-init if the actual data has meaningfully changed (length comparison to avoid infinite loops)
    const nodesChanged = nodes.length !== lastNodesLength;
    const linksChanged = links.length !== lastLinksLength;
    if ((nodesChanged || linksChanged) && nodes.length > 0) {
      console.log('[DEBUG] ThrelteGraph: Data changed, reinitializing simulation', {
        prevNodes: lastNodesLength, newNodes: nodes.length,
        prevLinks: lastLinksLength, newLinks: links.length
      });
      lastNodesLength = nodes.length;
      lastLinksLength = links.length;
      initSimulation();
    }
  });

  // NOTE: Removed useTask() that was calling simulation.tick() every frame.
  // The d3-force simulation already runs its own ticks via the 'tick' event handler in initSimulation().
  // Having both useTask and the simulation's internal tick caused double processing and memory issues.

  // Materials
  const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
  const anchorGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
</script>

<T.PerspectiveCamera
  makeDefault
  position={[0, 0, 1000]}
  fov={45}
>
  <OrbitControls enableDamping />
</T.PerspectiveCamera>

<!-- Visual Helpers for Vector Space -->
<T.AxesHelper args={[500]} />
<T.GridHelper args={[1000, 20, 0x444444, 0x222222]} rotation.x={Math.PI / 2} />

<T.AmbientLight intensity={0.4} />
<T.DirectionalLight position={[100, 100, 100]} intensity={1} />
<T.PointLight position={[-100, -100, -100]} intensity={0.5} color="#4444ff" />

<!-- Links -->
{#each d3Links as link, i}
  {#if typeof link.source === 'object' && typeof link.target === 'object'}
    <T.Line
      oncreate={(e: any) => {
        linkRefs[i] = { ref: e.ref, sourceIdx: link.sourceIdx, targetIdx: link.targetIdx };
      }}
    >
      <T.BufferGeometry
        oncreate={(e: any) => {
          const s = d3Nodes[link.sourceIdx];
          const t = d3Nodes[link.targetIdx];
          const vertices = new Float32Array([
            s.x || 0, s.y || 0, s.z || 0,
            t.x || 0, t.y || 0, t.z || 0
          ]);
          e.ref.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        }}
      />
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
  {#if node.nodeType === 'anchor'}
    <!-- Render Anchor as a 3D Vector (Arrow from origin) -->
    <T.ArrowHelper
      args={[
        new THREE.Vector3(node.x, node.y, node.z).normalize(),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(node.x, node.y, node.z).length(),
        node.color || '#ffffff',
        30, // headLength
        15  // headWidth
      ]}
    />
    
    <T.Group position={[node.x || 0, node.y || 0, node.z || 0]}>
      {#if node.label}
        <Text
          text={node.label}
          position.y={15}
          fontSize={14}
          anchorX="center"
          anchorY="bottom"
          color="white"
          outlineColor="black"
          outlineWidth={1}
        />
      {/if}
    </T.Group>
  {:else}
    <T.Group
      oncreate={(e: any) => {
        nodeRefs[node.id] = e.ref;
        e.ref.position.set(node.x || 0, node.y || 0, node.z || 0);
      }}
    >
      <T.Mesh
        geometry={nodeGeometry}
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

      {#if node.label && node.scale > 5}
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
  {/if}
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

