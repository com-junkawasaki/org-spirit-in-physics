<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { WordNode, WordLink, GapArea, DensityRegion } from './types';

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
    showAnalysis?: boolean;
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
    showAnalysis = false
  }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  
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
    distance: 600,
    rotationX: 0.2,
    rotationY: 0.5,
    centerX: 0,
    centerY: 0,
    centerZ: 0
  });

  let isDragging = $state(false);
  let lastMouse = { x: 0, y: 0 };

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

  function mixEmotionColor(node: WordNode, alpha: number): string {
    const emo = node.emotion;
    if (!emo) return node.color || '#1e40af';
    const palette: any = { joy: [255, 171, 0], sadness: [107, 114, 128], anger: [239, 68, 68], fear: [99, 102, 241], surprise: [16, 185, 129], disgust: [34, 197, 94], calm: [59, 130, 246], focus: [147, 51, 234], excitement: [245, 158, 11], confusion: [14, 165, 233] };
    let r = 0, g = 0, b = 0, w = 0;
    for (const key in emo) {
      const v = (emo as any)[key] ?? 0;
      if (v <= 0) continue;
      const c = palette[key];
      if (!c) continue;
      r += c[0] * v; g += c[1] * v; b += c[2] * v; w += v;
    }
    if (w <= 0) return node.color || '#1e40af';
    return `rgba(${Math.round(r/w)}, ${Math.round(g/w)}, ${Math.round(b/w)}, ${alpha})`;
  }

  async function initWebGPU() {
    if (!(navigator as any).gpu) return;
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) return;
    device = await adapter.requestDevice();

    const shaderModule = device.createShaderModule({ code: computeShader });
    computePipeline = device.createComputePipeline({ layout: 'auto', compute: { module: shaderModule, entryPoint: 'main' } });

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
    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!device || !canvas) { animId = requestAnimationFrame(tick); return; }

      const nodeData = new Float32Array(nodes.length * 8);
      nodes.forEach((n, i) => {
        nodeData[i*8] = positions![i*3]; nodeData[i*8+1] = positions![i*3+1]; nodeData[i*8+2] = positions![i*3+2];
        nodeData[i*8+3] = velocities![i*3]; nodeData[i*8+4] = velocities![i*3+1]; nodeData[i*8+5] = velocities![i*3+2];
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

      // Simple 2D rendering for now
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
        const zoom = 600 / camera.distance;

        // Links
        links.forEach(l => {
          const s = positions!.slice(l.source * 3, l.source * 3 + 3);
          const t = positions!.slice(l.target * 3, l.target * 3 + 3);
          
          if (!s || !t || s.length < 3 || t.length < 3) return;

          const project = (p: Float32Array) => {
            const x = p[0], y = p[1], z = p[2];
            const cosY = Math.cos(camera.rotationY), sinY = Math.sin(camera.rotationY);
            const rx = x * cosY - z * sinY, rz = x * sinY + z * cosY;
            const cosX = Math.cos(camera.rotationX), sinX = Math.sin(camera.rotationX);
            const cy = y * cosX - rz * sinX, cz = y * sinX + rz * cosX;
            return { x: width/2 + rx * zoom, y: height/2 + cy * zoom, z: cz };
          };

          const sp = project(s as any);
          const tp = project(t as any);

          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(tp.x, tp.y);
          
          const isAnchorLink = l.mode === 'tension';
          ctx.strokeStyle = l.color || (isAnchorLink ? 'rgba(100, 100, 100, 0.2)' : 'rgba(30, 64, 175, 0.4)');
          ctx.lineWidth = (isAnchorLink ? l.weight * 2 : 1) * zoom;
          ctx.stroke();
        });

        // Nodes
        nodes.forEach((n, i) => {
          const x = positions![i*3], y = positions![i*3+1], z = positions![i*3+2];
          // Simple projection
          const cosY = Math.cos(camera.rotationY), sinY = Math.sin(camera.rotationY);
          const rx = x * cosY - z * sinY, rz = x * sinY + z * cosY;
          const cosX = Math.cos(camera.rotationX), sinX = Math.sin(camera.rotationX);
          const cy = y * cosX - rz * sinX, cz = y * sinX + rz * cosX;
          const sx = width/2 + rx * zoom, sy = height/2 + cy * zoom;

          const isAnchor = n.nodeType === 'anchor';
          const radius = Math.max(1, (isAnchor ? n.scale * 1.5 : n.scale) * zoom);

          ctx.beginPath(); 
          ctx.arc(sx, sy, radius, 0, Math.PI*2);
          
          if (isAnchor) {
            // アンカーは外枠付きで描画
            ctx.fillStyle = n.color || '#000';
            ctx.globalAlpha = 0.9;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * zoom;
            ctx.stroke();
          } else {
            ctx.fillStyle = mixEmotionColor(n, 0.8);
            ctx.globalAlpha = 0.8;
            ctx.fill();
          }
          
          // ラベル
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = isAnchor ? (n.color || '#000') : '#fff';
          ctx.font = `${isAnchor ? 'bold ' : ''}${Math.round((isAnchor ? 14 : 10) * zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.label, sx, sy + (isAnchor ? radius + 10 : 0));
        });
      }

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
  }

  onMount(() => {
    initWebGPU();
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
    onmousedown={(e) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; }}
    onmousemove={(e) => {
      if (!isDragging) return;
      camera.rotationY += (e.clientX - lastMouse.x) * 0.01;
      camera.rotationX += (e.clientY - lastMouse.y) * 0.01;
      lastMouse = { x: e.clientX, y: e.clientY };
    }}
    onmouseup={() => isDragging = false}
    onwheel={(e) => {
      e.preventDefault();
      camera.distance *= e.deltaY > 0 ? 1.05 : 0.95;
    }}
  ></canvas>
</div>

