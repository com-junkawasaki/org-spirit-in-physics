'use client'

import { useRef, useEffect } from 'react'

// Merkle DAG: components.force3d_word_graph_typegpu
// TypeGPU版ユング単語連合の語ごとスケールを反映した完全グラフ3D可視化
// 依存: React, TypeGPU (WebGPU)
// BPMN: Force3DWordGraphTypeGPU

export interface WordNode {
  id: string
  label: string
  scale: number // 単語スケール（ノード半径・重み）
  axis?: [number, number, number] // 視覚方向（emotion PCA等で与える）
  fixed?: boolean
  initial?: [number, number, number]
  color?: string
}

export interface WordLink {
  source: number // インデックス（ノード配列参照）
  target: number
  weight: number // 辺スケール（太さ）
  // テンセグリティ拡張: 片側拘束の種別とパラメータ
  mode?: 'tension' | 'compression' // 省略時は従来の両側バネとして扱う
  L0?: number // 目標長さ（与えられない場合は weight から推定）
  k?: number  // 個別バネ定数（省略可）
}

interface Force3DWordGraphTypeGPUProps {
  nodes: WordNode[]
  links: WordLink[]
  width?: number
  height?: number
  background?: string
  physics?: {
    springK: number
    repulsionK: number
    damping: number
    restLength: number
    maxSpeed: number
    shellRadius?: number
    shellK?: number
    shellRadiusOuter?: number
    shellKOuter?: number
    radialOutK?: number
    constraintIters?: number
    constraintStiffness?: number
    torusR?: number
    torusr?: number
    torusK?: number
    minSep?: number
    sepK?: number
  }
  // 感情類似の影響倍率（links.weight への指数影響）
  emotionPower?: number
  // 感情場（アンカーに基づく色分布）
  emotionField?: { enabled?: boolean; radius?: number; sigma?: number; alpha?: number }
}

export default function Force3DWordGraphTypeGPU({
  nodes,
  links,
  width = 1000,
  height = 600,
  background = '#0b1020',
  physics,
  emotionPower = 1
}: Force3DWordGraphTypeGPUProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const deviceRef = useRef<GPUDevice | null>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const animRef = useRef<number | null>(null)
  const nodesRef = useRef<WordNode[]>(nodes)
  const linksRef = useRef<WordLink[]>(links)
  
  const physicsRef = useRef({
    springK: physics?.springK ?? 3.0,
    repulsionK: physics?.repulsionK ?? 800.0,
    damping: physics?.damping ?? 0.95,
    restLength: physics?.restLength ?? 60,
    maxSpeed: physics?.maxSpeed ?? 120,
    shellRadius: physics?.shellRadius ?? 180,
    shellK: physics?.shellK ?? 3.0,
    shellRadiusOuter: physics?.shellRadiusOuter ?? (physics?.shellRadius ? physics.shellRadius * 1.6 : 288),
    shellKOuter: physics?.shellKOuter ?? 1.5,
    radialOutK: physics?.radialOutK ?? 0,
    constraintIters: physics?.constraintIters ?? 2,
    constraintStiffness: physics?.constraintStiffness ?? 0.5,
    torusR: physics?.torusR ?? 0,
    torusr: physics?.torusr ?? 0,
    torusK: physics?.torusK ?? 0,
    minSep: physics?.minSep ?? 20,
    sepK: physics?.sepK ?? 1500,
  })

  // WebGPU 初期化
  useEffect(() => {
    if (!canvasRef.current) return

    // WebGPUデバイスを取得
    const initWebGPU = async () => {
      try {
        if (!navigator.gpu) {
          console.error('WebGPU not supported')
          return
        }

        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
          console.error('WebGPU adapter not available')
          return
        }
        
        const device = await adapter.requestDevice()
        deviceRef.current = device

        // 初期位置設定
        const N = nodesRef.current.length
        positionsRef.current = new Float32Array(N * 3)
        velocitiesRef.current = new Float32Array(N * 3)
        
        const pos = positionsRef.current as Float32Array
        const vel = velocitiesRef.current as Float32Array
        
        for (let i = 0; i < N; i++) {
          const init = nodesRef.current[i]?.initial
          if (init) {
            pos[i * 3] = init[0]
            pos[i * 3 + 1] = init[1]
            pos[i * 3 + 2] = init[2]
          } else {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 120 + Math.random() * 40
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            pos[i * 3 + 2] = r * Math.cos(phi)
          }
          vel[i * 3] = 0
          vel[i * 3 + 1] = 0
          vel[i * 3 + 2] = 0
        }

        // WebGPUシェーダーコード
        const computeShader = `
          struct Node {
            position: vec3<f32>,
            velocity: vec3<f32>,
            scale: f32,
            fixed: u32,
          }
          
          struct Link {
            source: u32,
            target: u32,
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
            emotionPower: f32,
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
            
            // Repulsion forces
            for (var j = 0u; j < arrayLength(&nodes); j++) {
              if (i == j) { continue; }
              
              let other = nodes[j];
              let dx = node.position - other.position;
              let distSq = dot(dx, dx) + 1e-6;
              let dist = sqrt(distSq);
              
              var repulsionForce = params.repulsionK / distSq;
              
              // Separation force
              if (params.minSep > 0.0 && params.sepK > 0.0 && dist < params.minSep) {
                let s = (params.minSep - dist) / max(1.0, params.minSep);
                repulsionForce += params.sepK * s * s;
              }
              
              force += (repulsionForce / dist) * dx;
            }
            
            // Spring forces
            for (var k = 0u; k < arrayLength(&links); k++) {
              let link = links[k];
              if (link.source != i && link.target != i) { continue; }
              
              let otherIndex = select(link.target, link.source, link.source == i);
              let other = nodes[otherIndex];
              
              let dx = other.position - node.position;
              let dist = length(dx) + 1e-6;
              
              let wClamped = clamp(link.weight, 0.0, 1.0);
              let wAmp = pow(wClamped, max(0.1, params.emotionPower));
              let L0guess = max(10.0, params.restLength * select(
                1.0 - 0.7 * wClamped,
                1.0 + (1.0 - wClamped) * 1.2,
                link.mode == 2u
              ));
              let L0final = select(L0guess, link.L0, link.L0 > 0.0);
              let kFinal = select(params.springK * (0.1 + 0.9 * wAmp), link.k, link.k > 0.0);
              
              var springForce = 0.0;
              let x = dist - L0final;
              
              if (link.mode == 1u) { // tension
                if (x > 0.0) { springForce = kFinal * x; }
              } else if (link.mode == 2u) { // compression
                if (x < 0.0) { springForce = kFinal * x; }
              } else { // default
                springForce = kFinal * x;
              }
              
              let sign = select(-1.0, 1.0, link.source == i);
              force += sign * (springForce / dist) * dx;
            }
            
            // Shell forces
            let rlen = length(node.position) + 1e-6;
            let radialDir = node.position / rlen;
            
            // Radial force towards shell radius
            let fr = (params.shellRadius - rlen) * params.shellK;
            force += fr * radialDir * 0.016;
            
            // Outer shell attraction
            let frOuter = (params.shellRadiusOuter - rlen) * params.shellKOuter;
            force += frOuter * radialDir * 0.016;
            
            // Radial repulsion from center
            if (params.radialOutK > 0.0) {
              let frRadial = params.radialOutK / (1.0 + rlen);
              force += frRadial * radialDir * params.delta;
            }
            
            // Update velocity
            node.velocity += force * params.delta;
            
            // Apply damping
            node.velocity *= params.damping;
            
            // Limit speed
            let speed = length(node.velocity);
            if (speed > params.maxSpeed) {
              node.velocity = normalize(node.velocity) * params.maxSpeed;
            }
            
            // Update position
            node.position += node.velocity * params.delta;
            
            nodes[i] = node;
          }
        `
        
        // コンピュートパイプラインを作成
        const computePipeline = device.createComputePipeline({
          layout: 'auto',
          compute: {
            module: device.createShaderModule({
              code: computeShader
            }),
            entryPoint: 'main'
          }
        })

        // WebGPUバッファを作成
        const nodeBuffer = device.createBuffer({
          size: nodesRef.current.length * 32, // Node struct size
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        })
        
        const linkBuffer = device.createBuffer({
          size: linksRef.current.length * 24, // Link struct size
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })
        
        const paramsBuffer = device.createBuffer({
          size: 64, // PhysicsParams size
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        
        // バインディンググループを作成
        const bindGroup = device.createBindGroup({
          layout: computePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: nodeBuffer } },
            { binding: 1, resource: { buffer: linkBuffer } },
            { binding: 2, resource: { buffer: paramsBuffer } }
          ]
        })

        // アニメーションループ
        let lastTime = performance.now()
        const tick = () => {
          const now = performance.now()
          const delta = Math.min(0.05, (now - lastTime) / 1000)
          lastTime = now

          const n = nodesRef.current.length
          const l = linksRef.current.length

          if (n === 0) {
            animRef.current = requestAnimationFrame(tick)
            return
          }

          // ノードデータをWebGPUバッファに書き込み
          const nodeData = new Float32Array(n * 8) // position(3) + velocity(3) + scale(1) + fixed(1)
          for (let i = 0; i < n; i++) {
            const node = nodesRef.current[i]
            const pos = positionsRef.current
            const vel = velocitiesRef.current
            if (!pos || !vel) continue
            const ix = i * 3
            
            nodeData[i * 8] = pos[ix]
            nodeData[i * 8 + 1] = pos[ix + 1]
            nodeData[i * 8 + 2] = pos[ix + 2]
            nodeData[i * 8 + 3] = vel[ix]
            nodeData[i * 8 + 4] = vel[ix + 1]
            nodeData[i * 8 + 5] = vel[ix + 2]
            nodeData[i * 8 + 6] = node.scale
            nodeData[i * 8 + 7] = node.fixed ? 1 : 0
          }
          
          // リンクデータをWebGPUバッファに書き込み
          const linkData = new Float32Array(l * 6) // source(1) + target(1) + weight(1) + mode(1) + L0(1) + k(1)
          for (let k = 0; k < l; k++) {
            const link = linksRef.current[k]
            linkData[k * 6] = link.source
            linkData[k * 6 + 1] = link.target
            linkData[k * 6 + 2] = link.weight
            linkData[k * 6 + 3] = link.mode === 'tension' ? 1 : link.mode === 'compression' ? 2 : 0
            linkData[k * 6 + 4] = link.L0 || 0
            linkData[k * 6 + 5] = link.k || 0
          }
          
          // 物理パラメータをWebGPUバッファに書き込み
          const { springK, repulsionK, damping, restLength, maxSpeed, shellRadius, shellK, shellRadiusOuter, shellKOuter, radialOutK, minSep, sepK } = physicsRef.current
          const paramsData = new Float32Array([
            springK, repulsionK, damping, restLength, maxSpeed, shellRadius, shellK, shellRadiusOuter,
            shellKOuter, radialOutK, minSep, sepK, delta, emotionPower, 0, 0 // padding
          ])
          
          // バッファにデータを書き込み
          device.queue.writeBuffer(nodeBuffer, 0, nodeData)
          device.queue.writeBuffer(linkBuffer, 0, linkData)
          device.queue.writeBuffer(paramsBuffer, 0, paramsData)
          
          // コンピュートシェーダーを実行
          const commandEncoder = device.createCommandEncoder()
          const computePass = commandEncoder.beginComputePass()
          computePass.setPipeline(computePipeline)
          computePass.setBindGroup(0, bindGroup)
          computePass.dispatchWorkgroups(Math.ceil(n / 64))
          computePass.end()
          
          device.queue.submit([commandEncoder.finish()])
          
          // 結果を読み取り
          const readBuffer = device.createBuffer({
            size: nodeBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
          })
          
          const copyEncoder = device.createCommandEncoder()
          copyEncoder.copyBufferToBuffer(nodeBuffer, 0, readBuffer, 0, nodeBuffer.size)
          device.queue.submit([copyEncoder.finish()])
          
          readBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const result = new Float32Array(readBuffer.getMappedRange())
            
            // 結果を位置・速度配列に反映
            for (let i = 0; i < n; i++) {
              const node = nodesRef.current[i]
              const pos = positionsRef.current
              const vel = velocitiesRef.current
              if (!pos || !vel) continue
              const ix = i * 3
              
              if (node?.fixed && node.initial) {
                pos[ix] = node.initial[0]
                pos[ix + 1] = node.initial[1]
                pos[ix + 2] = node.initial[2]
                vel[ix] = 0
                vel[ix + 1] = 0
                vel[ix + 2] = 0
              } else {
                pos[ix] = result[i * 8]
                pos[ix + 1] = result[i * 8 + 1]
                pos[ix + 2] = result[i * 8 + 2]
                vel[ix] = result[i * 8 + 3]
                vel[ix + 1] = result[i * 8 + 4]
                vel[ix + 2] = result[i * 8 + 5]
              }
            }
            
            readBuffer.unmap()
          })

          // 2D描画（簡易版）
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = background
              ctx.fillRect(0, 0, width, height)
              
              const pos = positionsRef.current
              if (!pos) return
              
              // ノード描画
              for (let i = 0; i < n; i++) {
                const ix = i * 3
                const x = pos[ix]
                const y = pos[ix + 1]
                const z = pos[ix + 2]
                
                // 3D → 2D 投影
                const scale = 200 / (z + 200)
                const screenX = width / 2 + x * scale
                const screenY = height / 2 + y * scale
                
                const node = nodesRef.current[i]
                const radius = Math.max(2, Math.min(10, 2 + node.scale)) * scale
                
                ctx.beginPath()
                ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
                ctx.fillStyle = node.color || '#3b82f6'
                ctx.fill()
                
                // ラベル
                ctx.fillStyle = '#ffffff'
                ctx.font = '12px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(node.label, screenX, screenY + 4)
              }
              
              // エッジ描画
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
              ctx.lineWidth = 1
              for (let k = 0; k < l; k++) {
                const link = linksRef.current[k]
                const source = link.source
                const target = link.target
                
                const sx = pos[source * 3]
                const sy = pos[source * 3 + 1]
                const sz = pos[source * 3 + 2]
                const tx = pos[target * 3]
                const ty = pos[target * 3 + 1]
                const tz = pos[target * 3 + 2]
                
                const sScale = 200 / (sz + 200)
                const tScale = 200 / (tz + 200)
                const sScreenX = width / 2 + sx * sScale
                const sScreenY = height / 2 + sy * sScale
                const tScreenX = width / 2 + tx * tScale
                const tScreenY = height / 2 + ty * tScale
                
                ctx.beginPath()
                ctx.moveTo(sScreenX, sScreenY)
                ctx.lineTo(tScreenX, tScreenY)
                ctx.stroke()
              }
            }
          }

          animRef.current = requestAnimationFrame(tick)
        }

        animRef.current = requestAnimationFrame(tick)

      } catch (error) {
        console.error('WebGPU initialization failed:', error)
      }
    }

    initWebGPU()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [width, height, background, emotionPower])

  // 物理パラメータの差分反映
  useEffect(() => {
    physicsRef.current = {
      springK: physics?.springK ?? physicsRef.current.springK,
      repulsionK: physics?.repulsionK ?? physicsRef.current.repulsionK,
      damping: physics?.damping ?? physicsRef.current.damping,
      restLength: physics?.restLength ?? physicsRef.current.restLength,
      maxSpeed: physics?.maxSpeed ?? physicsRef.current.maxSpeed,
      shellRadius: physics?.shellRadius ?? physicsRef.current.shellRadius,
      shellK: physics?.shellK ?? physicsRef.current.shellK,
      shellRadiusOuter: physics?.shellRadiusOuter ?? physicsRef.current.shellRadiusOuter,
      shellKOuter: physics?.shellKOuter ?? physicsRef.current.shellKOuter,
      radialOutK: physics?.radialOutK ?? physicsRef.current.radialOutK,
      constraintIters: physics?.constraintIters ?? physicsRef.current.constraintIters,
      constraintStiffness: physics?.constraintStiffness ?? physicsRef.current.constraintStiffness,
      torusR: physics?.torusR ?? physicsRef.current.torusR,
      torusr: physics?.torusr ?? physicsRef.current.torusr,
      torusK: physics?.torusK ?? physicsRef.current.torusK,
      minSep: physics?.minSep ?? physicsRef.current.minSep,
      sepK: physics?.sepK ?? physicsRef.current.sepK,
    }
  }, [physics])

  // ノード・リンクの差分反映
  useEffect(() => {
    nodesRef.current = nodes
    linksRef.current = links
  }, [nodes, links])

  return (
    <div style={{ width, height, background }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

// Merkle DAG: components.force3d_word_graph_typegpu -> implementation_complete