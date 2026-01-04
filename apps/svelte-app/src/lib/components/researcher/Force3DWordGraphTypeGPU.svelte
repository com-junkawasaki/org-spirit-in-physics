<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { WordNode, WordLink, GapArea, DensityRegion, GhostPattern } from './types';
  import { runtimeConfig } from '$lib/env.svelte';

  interface Props {
    nodes: WordNode[];
    links: WordLink[];
    width?: number;
    height?: number;
    background?: string;
    maxFps?: number;
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
    maxFps = 0,
    physics,
    gapAreas = [],
    densityRegions = [],
    ghostPatterns = [],
    showAnalysis = false,
    onHover,
    onClick,
    pinnedItems = []
  }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let isWebGPUSupported = $state(true);
  
  let device: any = null;
  let positions: Float32Array | null = null;
  let velocities: Float32Array | null = null;
  let animId: number | null = null;
  let connectivity: Float32Array | null = null;
  
  let nodeBuffer: any = null;
  let linkBuffer: any = null;
  let paramsBuffer: any = null;
  let bindGroup: any = null;
  let computePipeline: any = null;

  let camera = $state({
    distance: runtimeConfig.IS_CAPACITOR ? 900 : 700,
    rotationX: 0.4,
    rotationY: 0.6,
    centerX: 0,
    centerY: 0,
    centerZ: 0
  });

  let isDragging = $state(false);
  let lastMouse = { x: 0, y: 0 };
  let currentMouse = $state({ x: 0, y: 0 });
  let hoveredNodeIdx = $state<number | null>(null);
  let hoveredLinkIdx = $state<number | null>(null);

  const physicsParams = $derived({
    springK: physics?.springK ?? 2.0,
    repulsionK: physics?.repulsionK ?? 3500.0,
    damping: physics?.damping ?? 0.93,
    restLength: physics?.restLength ?? 90,
    maxSpeed: physics?.maxSpeed ?? 220,
    shellRadius: physics?.shellRadius ?? 500,
    shellK: physics?.shellK ?? 1.2,
    shellRadiusOuter: physics?.shellRadiusOuter ?? 800,
    shellKOuter: physics?.shellKOuter ?? 0.6,
    radialOutK: physics?.radialOutK ?? 120,
    constraintIters: physics?.constraintIters ?? 2,
    constraintStiffness: physics?.constraintStiffness ?? 0.5,
    minSep: physics?.minSep ?? 60,
    sepK: physics?.sepK ?? 5000,
  });

  const computeShader = `
    struct Node {
      position: vec3<f32>,
      velocity: vec3<f32>,
      scale: f32,
      fixed: u32,
    }
    
    struct Link {
      src: u32,
      dst: u32,
      weight: f32,
      mode: u32,
      L0: f32,
      k: f32,
    }
    
    struct PhysicsParams {
      springK: f32,
      repulsionK: f32,
      damping: f32,
      restLength: f32,
      maxSpeed: f32,
      shellRadius: f32,
      shellK: f32,
      shellRadiusOuter: f32,
      shellKOuter: f32,
      radialOutK: f32,
      minSep: f32,
      sepK: f32,
      delta: f32,
    }
    
    @group(0) @binding(0) var<storage, read_write> nodes: array<Node>;
    @group(0) @binding(1) var<storage, read> links: array<Link>;
    @group(0) @binding(2) var<uniform> params: PhysicsParams;
    
    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let i = global_id.x;
      if (i >= arrayLength(&nodes)) { return; }
      
      var node = nodes[i];
      if (node.fixed == 1u) { return; }
      
      var force = vec3<f32>(0.0);
      
      // Repulsion
      for (var j = 0u; j < arrayLength(&nodes); j++) {
        if (i == j) { continue; }
        let other = nodes[j];
        let dx = node.position - other.position;
        let distSq = dot(dx, dx) + 1e-6;
        let dist = sqrt(distSq);
        var repulsionForce = params.repulsionK / distSq;
        if (params.minSep > 0.0 && params.sepK > 0.0 && dist < params.minSep) {
          let s = (params.minSep - dist) / max(1.0, params.minSep);
          repulsionForce += params.sepK * s * s;
        }
        force += (repulsionForce / dist) * dx;
      }
      
      // Spring
      for (var k = 0u; k < arrayLength(&links); k++) {
        let link = links[k];
        if (link.src != i && link.dst != i) { continue; }
        let otherIndex = select(link.dst, link.src, link.src == i);
        let other = nodes[otherIndex];
        let dx = other.position - node.position;
        let dist = length(dx) + 1e-6;
        let wClamped = clamp(link.weight, 0.0, 1.0);
        let L0guess = params.restLength * select(1.0 - 0.7 * wClamped, 1.0 + (1.0 - wClamped) * 1.2, link.mode == 2u);
        let L0final = select(L0guess, link.L0, link.L0 > 0.0);
        let kFinal = select(params.springK * (0.1 + 0.9 * wClamped), link.k, link.k > 0.0);
        var springForce = kFinal * (dist - L0final);
        let sign = select(-1.0, 1.0, link.src == i);
        force += sign * (springForce / dist) * dx;
      }
      
      // Shell
      let rlen = length(node.position) + 1e-6;
      let radialDir = node.position / rlen;
      force += (params.shellRadius - rlen) * params.shellK * radialDir * 0.016;
      force += (params.shellRadiusOuter - rlen) * params.shellKOuter * radialDir * 0.016;
      if (params.radialOutK > 0.0) {
        force += (params.radialOutK / (1.0 + rlen)) * radialDir * params.delta;
      }
      
      node.velocity = (node.velocity + force * params.delta) * params.damping;
      if (length(node.velocity) > params.maxSpeed) {
        node.velocity = normalize(node.velocity) * params.maxSpeed;
      }
      node.position += node.velocity * params.delta;
      nodes[i] = node;
    }
  `;

  function getSpatialRGB(nodeIdx: number, positions: Float32Array): [number, number, number] {
    const node = nodes[nodeIdx];
    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      if (h.length === 3) return [parseInt(h[0]+h[0], 16), parseInt(h[1]+h[1], 16), parseInt(h[2]+h[2], 16)];
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };

    if (node.nodeType === 'anchor') return hexToRgb(node.color || '#000000');

    const nx = positions[nodeIdx * 3];
    const ny = positions[nodeIdx * 3 + 1];
    const nz = positions[nodeIdx * 3 + 2];

    let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

    nodes.forEach((anchor, ai) => {
      if (anchor.nodeType !== 'anchor' || !anchor.color) return;

      const ax = positions[ai * 3];
      const ay = positions[ai * 3 + 1];
      const az = positions[ai * 3 + 2];

      const dx = nx - ax;
      const dy = ny - ay;
      const dz = nz - az;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
      const weight = 1 / Math.pow(dist / 100, 2);

      const [r, g, b] = hexToRgb(anchor.color);
      rSum += r * weight;
      gSum += g * weight;
      bSum += b * weight;
      wSum += weight;
    });

    if (wSum <= 0) return hexToRgb(node.color || '#1e40af');
    return [rSum/wSum, gSum/wSum, bSum/wSum];
  }

  function mixSpatialColor(nodeIdx: number, positions: Float32Array, alpha: number): string {
    const [r, g, b] = getSpatialRGB(nodeIdx, positions);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
  }

  async function initWebGPU() {
    // Always initialize positions/velocities for CPU fallback
    if (!positions) {
      positions = new Float32Array(nodes.length * 3);
      velocities = new Float32Array(nodes.length * 3);
      nodes.forEach((n, i) => {
        if (n.initial) {
          positions![i*3] = n.initial[0]; positions![i*3+1] = n.initial[1]; positions![i*3+2] = n.initial[2];
        } else {
          const r = 200 + Math.random() * 200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions![i*3] = r * Math.sin(phi) * Math.cos(theta);
          positions![i*3+1] = r * Math.sin(phi) * Math.sin(theta);
          positions![i*3+2] = r * Math.cos(phi);
        }
      });
    }

    if (!(navigator as any).gpu) {
      console.warn("WebGPU not supported, falling back to CPU physics");
      isWebGPUSupported = false;
      startLoop();
      return;
    }
    
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      isWebGPUSupported = false;
      startLoop();
      return;
    }
    device = await adapter.requestDevice();
    isWebGPUSupported = true;

    const shaderModule = device.createShaderModule({ code: computeShader });
    computePipeline = device.createComputePipeline({ layout: 'auto', compute: { module: shaderModule, entryPoint: 'main' } });

    nodeBuffer = device.createBuffer({ size: nodes.length * 32, usage: 0x0008 | 0x0002 | 0x0004 });
    linkBuffer = device.createBuffer({ size: Math.max(links.length * 24, 24), usage: 0x0008 | 0x0002 });
    paramsBuffer = device.createBuffer({ size: 64, usage: 0x0040 | 0x0002 });

    bindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: nodeBuffer } }, { binding: 1, resource: { buffer: linkBuffer } }, { binding: 2, resource: { buffer: paramsBuffer } }]
    });

    startLoop();
  }

  function startLoop() {
    if (animId) return; // Prevent multiple loops
    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!canvas) { animId = requestAnimationFrame(tick); return; }

      // CPU Fallback for Physics if WebGPU is not available
      const currentPositions = positions;
      const currentVelocities = velocities;
      if (!device && currentPositions && currentVelocities) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].fixed) continue;
          
          let fx = 0, fy = 0, fz = 0;
          const px = currentPositions[i*3], py = currentPositions[i*3+1], pz = currentPositions[i*3+2];
          
          // Repulsion (simplified for performance)
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const dx = px - currentPositions[j*3], dy = py - currentPositions[j*3+1], dz = pz - currentPositions[j*3+2];
            const d2 = dx*dx + dy*dy + dz*dz + 1e-3;
            if (d2 < 1000000) {
              const f = physicsParams.repulsionK / d2;
              fx += f * dx / Math.sqrt(d2);
              fy += f * dy / Math.sqrt(d2);
              fz += f * dz / Math.sqrt(d2);
            }
          }
          
          // Spring
          links.forEach(l => {
            if (l.source === i || l.target === i) {
              const other = l.source === i ? l.target : l.source;
              const dx = currentPositions[other*3] - px, dy = currentPositions[other*3+1] - py, dz = currentPositions[other*3+2] - pz;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 1e-3;
              const f = physicsParams.springK * (dist - physicsParams.restLength);
              fx += f * dx / dist;
              fy += f * dy / dist;
              fz += f * dz / dist;
            }
          });

          // Shell constraint
          const dist = Math.sqrt(px*px + py*py + pz*pz) + 1e-3;
          const shellF = (physicsParams.shellRadius - dist) * physicsParams.shellK;
          fx += shellF * px / dist;
          fy += shellF * py / dist;
          fz += shellF * pz / dist;

          currentVelocities[i*3] = (currentVelocities[i*3] + fx * delta) * physicsParams.damping;
          currentVelocities[i*3+1] = (currentVelocities[i*3+1] + fy * delta) * physicsParams.damping;
          currentVelocities[i*3+2] = (currentVelocities[i*3+2] + fz * delta) * physicsParams.damping;
          
          currentPositions[i*3] += currentVelocities[i*3] * delta;
          currentPositions[i*3+1] += currentVelocities[i*3+1] * delta;
          currentPositions[i*3+2] += currentVelocities[i*3+2] * delta;
        }
      }

      if (device && currentPositions && currentVelocities) {
        const nodeData = new Float32Array(nodes.length * 8);
        nodes.forEach((n, i) => {
          nodeData[i*8] = currentPositions[i*3]; nodeData[i*8+1] = currentPositions[i*3+1]; nodeData[i*8+2] = currentPositions[i*3+2];
          nodeData[i*8+3] = currentVelocities[i*3]; nodeData[i*8+4] = currentVelocities[i*3+1]; nodeData[i*8+5] = currentVelocities[i*3+2];
          nodeData[i*8+6] = n.scale; nodeData[i*8+7] = n.fixed ? 1 : 0;
        });

        const linkData = new Float32Array(links.length * 6);
        links.forEach((l, i) => {
          linkData[i*6] = l.source; linkData[i*6+1] = l.target; linkData[i*6+2] = l.weight;
          linkData[i*6+3] = l.mode === 'tension' ? 1 : l.mode === 'compression' ? 2 : 0;
          linkData[i*6+4] = l.L0 || 0; linkData[i*6+5] = l.k || 0;
        });

        const paramsData = new Float32Array([
          physicsParams.springK, physicsParams.repulsionK, physicsParams.damping, physicsParams.restLength,
          physicsParams.maxSpeed, physicsParams.shellRadius, physicsParams.shellK, physicsParams.shellRadiusOuter,
          physicsParams.shellKOuter, physicsParams.radialOutK, physicsParams.minSep, physicsParams.sepK, delta, 0, 0, 0
        ]);

        device.queue.writeBuffer(nodeBuffer, 0, nodeData);
        device.queue.writeBuffer(linkBuffer, 0, linkData);
        device.queue.writeBuffer(paramsBuffer, 0, paramsData);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(nodes.length / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);
      }

      // Simple 2D rendering - now OUTSIDE if (device)
      const ctx = canvas.getContext('2d');
      if (ctx && currentPositions) {
        if (background === 'transparent') {
          ctx.clearRect(0, 0, width, height);
        } else {
          ctx.fillStyle = background; 
          ctx.fillRect(0, 0, width, height);
        }
        
        const zoom = 800 / camera.distance; // Increased base zoom

        // Pre-calculate node RGBs for current frame
        const nodeRGBs = nodes.map((_, i) => getSpatialRGB(i, currentPositions));

        // Pre-calculate pinned status for performance and safety
        const pinnedNodeIds = new Set(pinnedItems.filter(p => p.node).map(p => p.node?.id));
        const pinnedLinkKeys = new Set(pinnedItems.filter(p => p.link).map(p => {
          const l = p.link!;
          return `${l.source.id}-${l.target.id}`;
        }));

        let newHoveredNodeIdx: number | null = null;
        let newHoveredLinkIdx: number | null = null;

        const isLightMode = background !== 'transparent' && background !== '#000' && background !== '#000000' && background !== 'black';

        // Projection utility
        const project = (p: {x: number, y: number, z: number}) => {
          const cosY = Math.cos(camera.rotationY), sinY = Math.sin(camera.rotationY);
          const rx = p.x * cosY - p.z * sinY, rz = p.x * sinY + p.z * cosY;
          const cosX = Math.cos(camera.rotationX), sinX = Math.sin(camera.rotationX);
          const cy = p.y * cosX - rz * sinX, rz_ = p.y * sinX + rz * cosX;
          return { x: width/2 + rx * zoom, y: height/2 + cy * zoom, z: rz_ };
        };

        const projectedNodes = nodes.map((_, i) => project({
          x: currentPositions[i*3], y: currentPositions[i*3+1], z: currentPositions[i*3+2]
        }));

        // 1. Draw Space Glow (Background atmosphere)
        if (!isLightMode) {
          ctx.globalCompositeOperation = 'lighter';
          ghostPatterns.forEach(ghost => {
            const p = project({ x: ghost.center[0], y: ghost.center[1], z: ghost.center[2] });
            const radius = ghost.radius * zoom * 2.5;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            const color = ghost.pattern_type === 'overcrowding' ? '147, 51, 234' : '192, 38, 211';
            g.addColorStop(0, `rgba(${color}, 0.15)`);
            g.addColorStop(1, `rgba(${color}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalCompositeOperation = 'source-over';
        }

        // 2. Draw Ghost Patterns (Theory based space distortion)
        if (showAnalysis && ghostPatterns.length > 0) {
          ghostPatterns.forEach(ghost => {
            const p = project({ x: ghost.center[0], y: ghost.center[1], z: ghost.center[2] });
            const radius = ghost.radius * zoom;
            
            // Core Glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            const color = ghost.pattern_type === 'overcrowding' ? 'rgba(147, 51, 234, ' : 'rgba(192, 38, 211, ';
            gradient.addColorStop(0, color + '0.3)');
            gradient.addColorStop(0.7, color + '0.1)');
            gradient.addColorStop(1, color + '0.0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Border/Ring
            ctx.strokeStyle = color + '0.5)';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = color + '1.0)';
            ctx.font = `bold ${Math.round(12 * zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(ghost.pattern_type.toUpperCase(), p.x, p.y - radius - 10);
          });
        }

        // 3. Links
        links.forEach((l, li) => {
          const sp = projectedNodes[l.source];
          const tp = projectedNodes[l.target];
          if (!sp || !tp) return;

          const dx = tp.x - sp.x;
          const dy = tp.y - sp.y;
          const l2 = dx * dx + dy * dy;
          let distToLine = Infinity;
          if (l2 > 0) {
            let t = ((currentMouse.x - sp.x) * dx + (currentMouse.y - sp.y) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            distToLine = Math.hypot(currentMouse.x - (sp.x + t * dx), currentMouse.y - (sp.y + t * dy));
          }

          const isHovered = distToLine < 5;
          if (isHovered) newHoveredLinkIdx = li;

          const linkKey = `${nodes[l.source].id}-${nodes[l.target].id}`;
          const isPinned = pinnedLinkKeys.has(linkKey);
          const isHighlighted = isHovered || isPinned;

          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(tp.x, tp.y);
          
          const isAnchorLink = l.mode === 'tension';
          const rgbS = nodeRGBs[l.source];
          const rgbT = nodeRGBs[l.target];
          
          let alpha = isHighlighted ? 0.9 : (isAnchorLink ? 0.15 : 0.3);
          if (isLightMode) alpha *= 0.8;

          if (rgbS && rgbT) {
            const lkr = (rgbS[0] + rgbT[0]) / 2;
            const lkg = (rgbS[1] + rgbT[1]) / 2;
            const lkb = (rgbS[2] + rgbT[2]) / 2;
            ctx.strokeStyle = `rgba(${Math.round(lkr)}, ${Math.round(lkg)}, ${Math.round(lkb)}, ${alpha})`;
          } else {
            ctx.strokeStyle = l.color || (isAnchorLink ? `rgba(100, 100, 100, ${alpha})` : `rgba(30, 64, 175, ${alpha})`);
          }
          
          ctx.lineWidth = ((isAnchorLink ? l.weight * 3 : 1.5) * zoom) + (isHighlighted ? 2 : 0);
          ctx.stroke();
        });

        // 4. Nodes
        projectedNodes.forEach((p, i) => {
          const n = nodes[i];
          const isAnchor = n.nodeType === 'anchor';
          const radius = Math.max(2, (isAnchor ? n.scale * 2.2 : n.scale * 1.8) * zoom);

          const dist = Math.hypot(currentMouse.x - p.x, currentMouse.y - p.y);
          const isHovered = dist < radius + 10;
          if (isHovered) newHoveredNodeIdx = i;

          const isPinned = pinnedNodeIds.has(n.id);
          const isHighlighted = isHovered || isPinned;

          // Node Glow (if dark)
          if (!isLightMode && !isAnchor) {
            const nodeRgb = nodeRGBs[i];
            if (nodeRgb) {
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
              g.addColorStop(0, `rgba(${nodeRgb[0]}, ${nodeRgb[1]}, ${nodeRgb[2]}, 0.3)`);
              g.addColorStop(1, `rgba(${nodeRgb[0]}, ${nodeRgb[1]}, ${nodeRgb[2]}, 0)`);
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(p.x, p.y, radius * 3, 0, Math.PI*2); ctx.fill();
            }
          }

          ctx.beginPath(); 
          ctx.arc(p.x, p.y, radius, 0, Math.PI*2);
          
          if (isAnchor) {
            ctx.fillStyle = n.color || '#000';
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.strokeStyle = isHighlighted ? (isPinned ? '#3b82f6' : '#ff0') : 'rgba(255,255,255,0.8)';
            ctx.lineWidth = (isHighlighted ? 6 : 3) * zoom;
            ctx.stroke();
          } else {
            const nodeRgb = nodeRGBs[i];
            if (nodeRgb) {
              const [nr, ng, nb] = nodeRgb;
              ctx.fillStyle = `rgba(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)}, ${isHighlighted ? 1.0 : 0.9})`;
            } else {
              ctx.fillStyle = 'rgba(100, 100, 255, 0.9)';
            }
            ctx.globalAlpha = 1.0;
            ctx.fill();
            
            if (isHighlighted) {
              ctx.strokeStyle = isPinned ? '#3b82f6' : '#fff';
              ctx.lineWidth = (isPinned ? 4 : 3) * zoom;
              ctx.stroke();
            }
          }
          
          // Label Rendering
          ctx.globalAlpha = 1.0;
          const labelRgb = isAnchor ? getSpatialRGB(i, currentPositions) : nodeRGBs[i];
          const [txtR, txtG, txtB] = labelRgb || [255, 255, 255];
          
          let textColor = isHighlighted ? '#fff' : `rgb(${Math.max(150, Math.round(txtR))}, ${Math.max(150, Math.round(txtG))}, ${Math.max(150, Math.round(txtB))})`;
          if (isLightMode && !isHighlighted) {
            textColor = `rgb(${Math.min(100, Math.round(txtR))}, ${Math.min(100, Math.round(txtG))}, ${Math.min(100, Math.round(txtB))})`;
          }
          
          const fontSize = Math.round((isAnchor ? 22 : 14) * zoom);
          if (fontSize > 4) {
            ctx.font = `${isAnchor || isHighlighted ? 'bold ' : ''}${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Outline
            ctx.strokeStyle = isLightMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
            ctx.lineWidth = isHighlighted ? 4 : 3;
            ctx.strokeText(n.label, p.x, p.y + (isAnchor ? radius + 18 : 0));

            ctx.fillStyle = textColor;
            if (isHighlighted) {
              ctx.shadowColor = isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.9)';
              ctx.shadowBlur = isPinned ? 10 : 8;
            }
            ctx.fillText(n.label, p.x, p.y + (isAnchor ? radius + 18 : 0));
            ctx.shadowBlur = 0;
          }
        });

        // Handle hover state change
        if (hoveredNodeIdx !== newHoveredNodeIdx || hoveredLinkIdx !== newHoveredLinkIdx) {
          hoveredNodeIdx = newHoveredNodeIdx;
          hoveredLinkIdx = newHoveredLinkIdx;
          if (onHover) {
            if (hoveredNodeIdx !== null) {
              onHover({ node: nodes[hoveredNodeIdx] });
            } else if (hoveredLinkIdx !== null) {
              const l = links[hoveredLinkIdx];
              onHover({ link: { source: nodes[l.source], target: nodes[l.target], weight: l.weight } });
            } else {
              onHover(null);
            }
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
  }

  onMount(() => {
    initWebGPU();
  });

  // Watch for nodes/links changes to re-initialize buffers
  $effect(() => {
    if (nodes.length > 0 && canvas) {
      // Re-initialize if node count changed
      if (!positions || positions.length !== nodes.length * 3) {
        console.log("Nodes changed, re-initializing WebGPU buffers", nodes.length);
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        positions = null;
        velocities = null;
        initWebGPU();
      }
    }
  });

  onDestroy(() => {
    if (animId) cancelAnimationFrame(animId);
  });
</script>

<div class="w-full relative overflow-hidden" style="height: {height}px; background: {background};">
  <canvas
    bind:this={canvas}
    {width}
    {height}
    class="w-full h-full"
    style="cursor: {isDragging ? 'grabbing' : 'grab'}"
    onmousedown={(e) => { 
      isDragging = true; 
      lastMouse = { x: e.clientX, y: e.clientY }; 
    }}
    ontouchstart={(e) => {
      isDragging = true;
      lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }}
    onmousemove={(e) => {
      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        currentMouse = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
      if (isDragging) {
        camera.rotationY += (e.clientX - lastMouse.x) * 0.01;
        camera.rotationX += (e.clientY - lastMouse.y) * 0.01;
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    }}
    ontouchmove={(e) => {
      if (isDragging) {
        camera.rotationY += (e.touches[0].clientX - lastMouse.x) * 0.01;
        camera.rotationX += (e.touches[0].clientY - lastMouse.y) * 0.01;
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }}
    onmouseup={(e) => { 
      isDragging = false; 
      if (onClick) {
        if (hoveredNodeIdx !== null) {
          onClick({ node: nodes[hoveredNodeIdx] });
        } else if (hoveredLinkIdx !== null) {
          const l = links[hoveredLinkIdx];
          onClick({ link: { source: nodes[l.source], target: nodes[l.target], weight: l.weight } });
        }
      }
    }}
    ontouchend={() => { isDragging = false; }}
  ></canvas>

  {#if !isWebGPUSupported}
    <div class="absolute bottom-4 right-4 px-3 py-1 bg-gray-900/50 backdrop-blur-md rounded-full border border-white/10">
      <p class="text-[8px] font-black uppercase tracking-widest text-gray-400">
        <span class="text-orange-500 mr-1">●</span> CPU Physics Mode
      </p>
    </div>
  {/if}
</div>

