'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

// WebGPU型定義（簡略版）
declare global {
  interface GPUDevice {
    createBuffer(descriptor: any): any
    createComputePipeline(descriptor: any): any
    createBindGroup(descriptor: any): any
    createCommandEncoder(): any
    createShaderModule(descriptor: any): any
    queue: any
  }
  
  interface GPUAdapter {
    requestDevice(): Promise<GPUDevice>
  }
  
  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>
  }
  
  interface Navigator {
    gpu: GPU
  }
  
  const GPUBufferUsage: {
    STORAGE: number
    COPY_DST: number
    COPY_SRC: number
    UNIFORM: number
    MAP_READ: number
  }
  
  const GPUMapMode: {
    READ: number
    WRITE: number
  }
}

// Merkle DAG: components.force3d_word_graph_typegpu
// TypeGPU版ユング単語連合の語ごとスケールを反映した完全グラフ3D可視化
// 依存: React, TypeGPU (WebGPU)
// BPMN: Force3DWordGraphTypeGPU

export interface WordNode {
  id: string
  label: string
  scale: number // 単語スケール（ノード半径・重み）
  axis?: [number, number, number] // 視覚方向
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
}

export default function Force3DWordGraphTypeGPU({
  nodes,
  links,
  width = 1000,
  height = 600,
  background = '#ffffff',
  physics
}: Force3DWordGraphTypeGPUProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const deviceRef = useRef<GPUDevice | null>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const animRef = useRef<number | null>(null)
  const nodesRef = useRef<WordNode[]>(nodes)
  const linksRef = useRef<WordLink[]>(links)
  
  // ズームレベル表示用のstate
  const [zoomLevel, setZoomLevel] = useState(600)
  
  // カメラ制御用の状態
  const cameraRef = useRef({
    distance: 600, // 初期距離を少し遠くに設定
    rotationX: 0.2, // 少し下から見上げる角度
    rotationY: 0.5, // 少し回転させて立体感を出す
    centerX: 0,
    centerY: 0,
    centerZ: 0
  })
  
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  
  // カメラ制御関数
  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDraggingRef.current = true
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return
    
    const deltaX = e.clientX - lastMouseRef.current.x
    const deltaY = e.clientY - lastMouseRef.current.y
    
    cameraRef.current.rotationY += deltaX * 0.01
    cameraRef.current.rotationX += deltaY * 0.01
    
    // 回転制限
    cameraRef.current.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRef.current.rotationX))
    
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])
  
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])
  
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    // 直感的なズーム: 上にスクロールでズームイン（距離を短く）、下にスクロールでズームアウト（距離を長く）
    const zoomSpeed = 0.05 // より細かい調整
    const delta = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed
    cameraRef.current.distance *= delta
    
    // ノード群のサイズに基づいて動的にズーム範囲を調整
    const nodes = nodesRef.current
    if (nodes.length > 0) {
      let maxDistance = 0
      for (let i = 0; i < nodes.length; i++) {
        const dx = nodes[i].initial?.[0] || 0 - cameraRef.current.centerX
        const dy = nodes[i].initial?.[1] || 0 - cameraRef.current.centerY
        const dz = nodes[i].initial?.[2] || 0 - cameraRef.current.centerZ
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        maxDistance = Math.max(maxDistance, distance)
      }
      
      const minDistance = Math.max(50, maxDistance * 0.5)
      const maxDistanceLimit = Math.max(1000, maxDistance * 5)
      cameraRef.current.distance = Math.max(minDistance, Math.min(maxDistanceLimit, cameraRef.current.distance))
    } else {
      cameraRef.current.distance = Math.max(100, Math.min(1500, cameraRef.current.distance))
    }
    
    // ズームレベル表示を更新
    setZoomLevel(cameraRef.current.distance)
  }, [])
  
  const physicsRef = useRef({
    springK: physics?.springK ?? 2.0,
    repulsionK: physics?.repulsionK ?? 3500.0,
    damping: physics?.damping ?? 0.93,
    restLength: physics?.restLength ?? 90,
    maxSpeed: physics?.maxSpeed ?? 220,
    shellRadius: physics?.shellRadius ?? 500,
    shellK: physics?.shellK ?? 1.2,
    shellRadiusOuter: physics?.shellRadiusOuter ?? (physics?.shellRadius ? physics.shellRadius * 1.6 : 800),
    shellKOuter: physics?.shellKOuter ?? 0.6,
    radialOutK: physics?.radialOutK ?? 120,
    constraintIters: physics?.constraintIters ?? 2,
    constraintStiffness: physics?.constraintStiffness ?? 0.5,
    torusR: physics?.torusR ?? 0,
    torusr: physics?.torusr ?? 0,
    torusK: physics?.torusK ?? 0,
    minSep: physics?.minSep ?? 60,
    sepK: physics?.sepK ?? 5000,
  })

  // カメラ制御イベントリスナーの設定
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel)
    
    // キャンバス外でのマウスアップも処理
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel])

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
        
        let centerX = 0, centerY = 0, centerZ = 0
        
        for (let i = 0; i < N; i++) {
          const init = nodesRef.current[i]?.initial
          if (init) {
            pos[i * 3] = init[0]
            pos[i * 3 + 1] = init[1]
            pos[i * 3 + 2] = init[2]
          } else {
            // より広い範囲に初期配置（半径200-400の球面）
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 200 + Math.random() * 200 // 半径を大幅に拡大
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            pos[i * 3 + 2] = r * Math.cos(phi)
          }
          centerX += pos[i * 3]
          centerY += pos[i * 3 + 1]
          centerZ += pos[i * 3 + 2]
          vel[i * 3] = 0
          vel[i * 3 + 1] = 0
          vel[i * 3 + 2] = 0
        }
        
        // カメラの中心点をノード群の重心に設定
        if (N > 0) {
          cameraRef.current.centerX = centerX / N
          cameraRef.current.centerY = centerY / N
          cameraRef.current.centerZ = centerZ / N
          
          // ノード群のサイズに基づいてカメラ距離を調整
          let maxDistance = 0
          for (let i = 0; i < N; i++) {
            const dx = pos[i * 3] - cameraRef.current.centerX
            const dy = pos[i * 3 + 1] - cameraRef.current.centerY
            const dz = pos[i * 3 + 2] - cameraRef.current.centerZ
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            maxDistance = Math.max(maxDistance, distance)
          }
          
          // ノード群の最大距離の2.5倍をカメラ距離に設定
          cameraRef.current.distance = Math.max(400, maxDistance * 2.5)
          setZoomLevel(cameraRef.current.distance)
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
              if (link.src != i && link.dst != i) { continue; }
              
              let otherIndex = select(link.dst, link.src, link.src == i);
              let other = nodes[otherIndex];
              
              let dx = other.position - node.position;
              let dist = length(dx) + 1e-6;
              
              let wClamped = clamp(link.weight, 0.0, 1.0);
              let wAmp = wClamped;
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
              
              let sign = select(-1.0, 1.0, link.src == i);
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
          const linkData = new Float32Array(l * 6) // src(1) + dst(1) + weight(1) + mode(1) + L0(1) + k(1)
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
            shellKOuter, radialOutK, minSep, sepK, delta, 0, 0, 0 // padding
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

            // CPU側での最小距離制約（Shannon: ノード間の識別可能性を維持）
            // 固定ノードは動かさず、可動ノードのみを押し広げる
            const pos = positionsRef.current
            if (pos) {
              const baseMin = physicsRef.current.minSep
              const stiffness = physicsRef.current.constraintStiffness ?? 0.5
              const iters = Math.max(1, Math.floor(physicsRef.current.constraintIters ?? 2))
              const scaleFactor = 6 // スケール→衝突半径への写像係数

              for (let iter = 0; iter < iters; iter++) {
                for (let i = 0; i < n; i++) {
                  const ni = nodesRef.current[i]
                  const ix = i * 3
                  for (let j = i + 1; j < n; j++) {
                    const nj = nodesRef.current[j]
                    const jx = j * 3

                    // 固定ノード同士はスキップ
                    if ((ni?.fixed) && (nj?.fixed)) continue

                    const dx = pos[ix] - pos[jx]
                    const dy = pos[ix + 1] - pos[jx + 1]
                    const dz = pos[ix + 2] - pos[jx + 2]
                    const dist = Math.hypot(dx, dy, dz) || 1

                    const ri = (ni?.scale ?? 1) * scaleFactor
                    const rj = (nj?.scale ?? 1) * scaleFactor
                    const minD = Math.max(10, baseMin + ri + rj)

                    if (dist < minD) {
                      const overlap = minD - dist
                      const ux = dx / dist
                      const uy = dy / dist
                      const uz = dz / dist
                      const corr = overlap * stiffness

                      // どちらかが固定なら、動ける方だけ動かす
                      if (ni?.fixed && !nj?.fixed) {
                        pos[jx] -= ux * corr
                        pos[jx + 1] -= uy * corr
                        pos[jx + 2] -= uz * corr
                      } else if (!ni?.fixed && nj?.fixed) {
                        pos[ix] += ux * corr
                        pos[ix + 1] += uy * corr
                        pos[ix + 2] += uz * corr
                      } else if (!ni?.fixed && !nj?.fixed) {
                        const half = corr * 0.5
                        pos[ix] += ux * half
                        pos[ix + 1] += uy * half
                        pos[ix + 2] += uz * half
                        pos[jx] -= ux * half
                        pos[jx + 1] -= uy * half
                        pos[jx + 2] -= uz * half
                      }
                    }
                  }
                }
              }
            }
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
                
                // 3D → 2D 投影（カメラ行列ベース）
                const camera = cameraRef.current
                
                // ワールド座標をカメラ座標に変換
                const wx = x - camera.centerX
                const wy = y - camera.centerY
                const wz = z - camera.centerZ
                
                // Y軸回転
                const cosY = Math.cos(camera.rotationY)
                const sinY = Math.sin(camera.rotationY)
                const rx = wx * cosY - wz * sinY
                const ry = wy
                const rz = wx * sinY + wz * cosY
                
                // X軸回転
                const cosX = Math.cos(camera.rotationX)
                const sinX = Math.sin(camera.rotationX)
                const cx = rx
                const cy = ry * cosX - rz * sinX
                const cz = ry * sinX + rz * cosX; void cz
                
                // 正射投影（魚眼感を抑制）
                const zoom = Math.max(0.05, 600 / Math.max(50, camera.distance))
                const screenX = width / 2 + cx * zoom
                const screenY = height / 2 + cy * zoom
                
                const node = nodesRef.current[i]
                const radius = Math.max(1, Math.min(10, 2 + node.scale)) * zoom // 最小半径を1に制限
                
                ctx.beginPath()
                ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
                ctx.fillStyle = node.color || '#1e40af'
                ctx.fill()
                
                // ラベル
                ctx.fillStyle = '#1f2937'
                ctx.font = '12px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(node.label, screenX, screenY + 4)
              }
              
              // エッジ描画
              ctx.strokeStyle = 'rgba(30, 64, 175, 0.4)'
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
                
                // カメラ参照を取得
                const camera = cameraRef.current
                
                // 三角関数値を計算
                const cosY = Math.cos(camera.rotationY)
                const sinY = Math.sin(camera.rotationY)
                const cosX = Math.cos(camera.rotationX)
                const sinX = Math.sin(camera.rotationX)
                
                // ソースノードのカメラ変換
                const swx = sx - camera.centerX
                const swy = sy - camera.centerY
                const swz = sz - camera.centerZ
                const srx = swx * cosY - swz * sinY
                const sry = swy
                const srz = swx * sinY + swz * cosY
                const scx = srx
                const scy = sry * cosX - srz * sinX
                const scz = sry * sinX + srz * cosX; void scz
                const zoom = Math.max(0.05, 600 / Math.max(50, camera.distance))
                const sScreenX = width / 2 + scx * zoom
                const sScreenY = height / 2 + scy * zoom
                
                // ターゲットノードのカメラ変換
                const twx = tx - camera.centerX
                const twy = ty - camera.centerY
                const twz = tz - camera.centerZ
                const trx = twx * cosY - twz * sinY
                const try_ = twy
                const trz = twx * sinY + twz * cosY
                const tcx = trx
                const tcy = try_ * cosX - trz * sinX
                const tcz = try_ * sinX + trz * cosX; void tcz
                const tScreenX = width / 2 + tcx * zoom
                const tScreenY = height / 2 + tcy * zoom
                
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
  }, [width, height, background])

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
    <div style={{ width, height, background, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab'
        }}
      />
      {/* ズームレベル表示 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        Zoom: {zoomLevel.toFixed(0)}
      </div>
      {/* 操作説明 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        Drag: Rotate | Wheel: Zoom
      </div>
    </div>
  )
}

// Merkle DAG: components.force3d_word_graph_typegpu -> implementation_complete