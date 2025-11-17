// Merkle DAG: components.force3d_word_graph_typegpu_subscription
// Subscription版ユング単語連合の語ごとスケールを反映した完全グラフ3D可視化
// 依存: React, Apollo Client (GraphQL Subscription)
// BPMN: Force3DWordGraphTypeGPUSubscription
// サーバー側（Rust）で物理計算を実行し、Subscriptionでリアルタイムに位置データを受信

'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useSubscription, useMutation } from '@apollo/client'
import {
  ForceGraphUpdatesDocument,
  CreateForceGraphSimulationDocument,
  UpdateForceGraphPhysicsDocument,
  StopForceGraphSimulationDocument,
  type ForceGraphUpdatesSubscriptionResult,
  type ForceGraphUpdatesSubscriptionVariables,
  type CreateForceGraphSimulationMutationVariables,
  type UpdateForceGraphPhysicsMutationVariables,
  type StopForceGraphSimulationMutationVariables,
} from '@/generated/graphql-apollo'

export interface WordNode {
  id: string
  label: string
  scale: number
  axis?: [number, number, number]
  fixed?: boolean
  initial?: [number, number, number]
  color?: string
  emotion?: Partial<Record<'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion', number>>
}

export interface WordLink {
  source: number
  target: number
  weight: number
  mode?: 'tension' | 'compression'
  L0?: number
  k?: number
  color?: string
}

interface Force3DWordGraphTypeGPUSubscriptionProps {
  nodes: WordNode[]
  links: WordLink[]
  width?: number
  height?: number
  background?: string
  maxFps?: number
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
    minSep?: number
    sepK?: number
    constraintIters?: number
    constraintStiffness?: number
  }
  gapAreas?: Array<{
    id: string
    center: [number, number, number]
    radius: number
    confidence: number
  }>
  densityRegions?: Array<{
    id: string
    center: [number, number, number]
    radius: number
    isOvercrowded: boolean
  }>
  showAnalysis?: boolean
}

function Force3DWordGraphTypeGPUSubscription({
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
}: Force3DWordGraphTypeGPUSubscriptionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const animRef = useRef<number | null>(null)
  const nodesRef = useRef<WordNode[]>(nodes)
  const linksRef = useRef<WordLink[]>(links)
  const [simulationId, setSimulationId] = useState<string | null>(null)
  
  // GraphQL Mutations
  const [createSimulation] = useMutation<
    { createForceGraphSimulation: string },
    CreateForceGraphSimulationMutationVariables
  >(CreateForceGraphSimulationDocument)
  
  const [updatePhysics] = useMutation<
    { updateForceGraphPhysics: boolean },
    UpdateForceGraphPhysicsMutationVariables
  >(UpdateForceGraphPhysicsDocument)
  
  const [stopSimulation] = useMutation<
    { stopForceGraphSimulation: boolean },
    StopForceGraphSimulationMutationVariables
  >(StopForceGraphSimulationDocument)
  
  // GraphQL Subscription
  const { data: subscriptionData, error: subscriptionError } = useSubscription<
    ForceGraphUpdatesSubscriptionResult,
    ForceGraphUpdatesSubscriptionVariables
  >(ForceGraphUpdatesDocument, {
    variables: {
      simulationId: simulationId || '',
      maxFps: maxFps > 0 ? maxFps : undefined,
    },
    skip: !simulationId,
  })
  
  // カメラ制御用の状態
  const cameraRef = useRef({
    distance: 600,
    rotationX: 0.2,
    rotationY: 0.5,
    centerX: 0,
    centerY: 0,
    centerZ: 0
  })
  
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const zoomLevelRef = useRef(600)
  const isInitializedRef = useRef(false)
  const userZoomSetRef = useRef(false)
  const zoomLevelDisplayRef = useRef<HTMLDivElement | null>(null)
  const isVisibleRef = useRef(true)
  const connectivityRef = useRef<Float32Array | null>(null)
  
  // シミュレーション作成
  useEffect(() => {
    if (nodes.length === 0) return
    
    const createSim = async () => {
      try {
        // ノードとリンクをGraphQL Input形式に変換
        const input = {
          nodes: nodes.map(node => ({
            id: node.id,
            label: node.label,
            scale: node.scale,
            axis: node.axis ? { x: node.axis[0], y: node.axis[1], z: node.axis[2] } : undefined,
            fixed: node.fixed,
            initial: node.initial ? { x: node.initial[0], y: node.initial[1], z: node.initial[2] } : undefined,
            color: node.color,
          })),
          links: links.map(link => ({
            source: link.source,
            target: link.target,
            weight: link.weight,
            mode: link.mode,
            l0: link.L0,
            k: link.k,
          })),
          physics: physics ? {
            springK: physics.springK,
            repulsionK: physics.repulsionK,
            damping: physics.damping,
            restLength: physics.restLength,
            maxSpeed: physics.maxSpeed,
            shellRadius: physics.shellRadius,
            shellK: physics.shellK,
            shellRadiusOuter: physics.shellRadiusOuter,
            shellKOuter: physics.shellKOuter,
            radialOutK: physics.radialOutK,
            minSep: physics.minSep,
            sepK: physics.sepK,
            constraintIters: physics.constraintIters,
            constraintStiffness: physics.constraintStiffness,
          } : undefined,
          maxFps: maxFps > 0 ? maxFps : undefined,
        }
        
        const result = await createSimulation({ variables: { input } })
        if (result.data?.createForceGraphSimulation) {
          setSimulationId(result.data.createForceGraphSimulation)
          
          // 初期位置を設定
          const N = nodes.length
          positionsRef.current = new Float32Array(N * 3)
          const pos = positionsRef.current
          
          // カメラの中心点を計算
          let centerX = 0, centerY = 0, centerZ = 0
          for (let i = 0; i < N; i++) {
            const init = nodes[i]?.initial
            if (init) {
              pos[i * 3] = init[0]
              pos[i * 3 + 1] = init[1]
              pos[i * 3 + 2] = init[2]
              centerX += init[0]
              centerY += init[1]
              centerZ += init[2]
            } else {
              pos[i * 3] = 0
              pos[i * 3 + 1] = 0
              pos[i * 3 + 2] = 0
            }
          }
          
          if (N > 0) {
            cameraRef.current.centerX = centerX / N
            cameraRef.current.centerY = centerY / N
            cameraRef.current.centerZ = centerZ / N
            
            // 初期化時のみカメラ距離を自動調整
            if (!isInitializedRef.current && !userZoomSetRef.current) {
              let maxDistance = 0
              for (let i = 0; i < N; i++) {
                const dx = pos[i * 3] - cameraRef.current.centerX
                const dy = pos[i * 3 + 1] - cameraRef.current.centerY
                const dz = pos[i * 3 + 2] - cameraRef.current.centerZ
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
                maxDistance = Math.max(maxDistance, distance)
              }
              
              cameraRef.current.distance = Math.max(400, maxDistance * 2.5)
              zoomLevelRef.current = cameraRef.current.distance
              isInitializedRef.current = true
            }
          }
        }
      } catch (error) {
        console.error('Failed to create simulation:', error)
      }
    }
    
    createSim()
    
    // クリーンアップ: コンポーネントアンマウント時にシミュレーションを停止
    return () => {
      if (simulationId) {
        stopSimulation({ variables: { simulationId } }).catch(console.error)
      }
    }
  }, [nodes, links, physics, maxFps, createSimulation, stopSimulation])
  
  // Subscriptionから位置データを受信して更新
  useEffect(() => {
    if (!subscriptionData?.forceGraphUpdates) return
    
    const update = subscriptionData.forceGraphUpdates
    const N = nodes.length
    
    if (positionsRef.current && positionsRef.current.length === N * 3) {
      const pos = positionsRef.current
      
      // ノード位置を更新
      for (let i = 0; i < update.nodes.length; i++) {
        const nodeUpdate = update.nodes[i]
        const nodeIndex = nodes.findIndex(n => n.id === nodeUpdate.id)
        if (nodeIndex >= 0 && nodeIndex < N) {
          const ix = nodeIndex * 3
          // 固定ノードは更新しない
          const node = nodes[nodeIndex]
          if (node?.fixed && node.initial) {
            pos[ix] = node.initial[0]
            pos[ix + 1] = node.initial[1]
            pos[ix + 2] = node.initial[2]
          } else {
            pos[ix] = nodeUpdate.position.x
            pos[ix + 1] = nodeUpdate.position.y
            pos[ix + 2] = nodeUpdate.position.z
          }
        }
      }
    }
    
    // 接続度を計算
    if (N > 0) {
      const deg = new Float32Array(N)
      let maxDeg = 0
      for (let k = 0; k < links.length; k++) {
        const link = links[k]
        const w = Math.max(1e-3, link.weight || 1)
        if (link.source >= 0 && link.source < N) deg[link.source] += w
        if (link.target >= 0 && link.target < N) deg[link.target] += w
      }
      for (let i = 0; i < N; i++) maxDeg = Math.max(maxDeg, deg[i])
      const conn = connectivityRef.current && connectivityRef.current.length === N
        ? connectivityRef.current
        : new Float32Array(N)
      for (let i = 0; i < N; i++) conn[i] = maxDeg > 0 ? deg[i] / maxDeg : 0
      connectivityRef.current = conn
    }
  }, [subscriptionData, nodes, links])
  
  // 物理パラメータの更新
  useEffect(() => {
    if (!simulationId || !physics) return
    
    updatePhysics({
      variables: {
        simulationId,
        physics: {
          springK: physics.springK,
          repulsionK: physics.repulsionK,
          damping: physics.damping,
          restLength: physics.restLength,
          maxSpeed: physics.maxSpeed,
          shellRadius: physics.shellRadius,
          shellK: physics.shellK,
          shellRadiusOuter: physics.shellRadiusOuter,
          shellKOuter: physics.shellKOuter,
          radialOutK: physics.radialOutK,
          minSep: physics.minSep,
          sepK: physics.sepK,
          constraintIters: physics.constraintIters,
          constraintStiffness: physics.constraintStiffness,
        },
      },
    }).catch(console.error)
  }, [simulationId, physics, updatePhysics])
  
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
    cameraRef.current.rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRef.current.rotationX))
    
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])
  
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])
  
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    userZoomSetRef.current = true
    
    const zoomSpeed = 0.05
    const delta = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed
    cameraRef.current.distance *= delta
    
    const nodes = nodesRef.current
    if (nodes.length > 0) {
      const pos = positionsRef.current
      if (pos) {
        let maxDistance = 0
        for (let i = 0; i < nodes.length; i++) {
          const ix = i * 3
          const dx = pos[ix] - cameraRef.current.centerX
          const dy = pos[ix + 1] - cameraRef.current.centerY
          const dz = pos[ix + 2] - cameraRef.current.centerZ
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
          maxDistance = Math.max(maxDistance, distance)
        }
        
        const minDistance = Math.max(50, maxDistance * 0.5)
        const maxDistanceLimit = Math.max(1000, maxDistance * 5)
        cameraRef.current.distance = Math.max(minDistance, Math.min(maxDistanceLimit, cameraRef.current.distance))
      }
    } else {
      cameraRef.current.distance = Math.max(100, Math.min(1500, cameraRef.current.distance))
    }
    
    zoomLevelRef.current = cameraRef.current.distance
  }, [])
  
  // カメラ制御イベントリスナーの設定
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel])
  
  // Intersection Observer: ビューポート可視性の監視
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        isVisibleRef.current = entry.isIntersecting
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])
  
  // 感情カラー合成
  const mixEmotionColor = useCallback((node: WordNode, alpha: number): string => {
    const emo = node.emotion
    if (!emo) return node.color || '#1e40af'

    const palette: Record<string, [number, number, number]> = {
      joy: [255, 171, 0],
      sadness: [107, 114, 128],
      anger: [239, 68, 68],
      fear: [99, 102, 241],
      surprise: [16, 185, 129],
      disgust: [34, 197, 94],
      calm: [59, 130, 246],
      focus: [147, 51, 234],
      excitement: [245, 158, 11],
      confusion: [14, 165, 233],
    }

    let r = 0, g = 0, b = 0, w = 0
    for (const key in emo) {
      const v = Math.max(0, Math.min(1, (emo as any)[key] ?? 0))
      if (v <= 0) continue
      const c = palette[key]
      if (!c) continue
      r += c[0] * v
      g += c[1] * v
      b += c[2] * v
      w += v
    }

    if (w <= 0) return node.color || '#1e40af'
    r = Math.round(r / w)
    g = Math.round(g / w)
    b = Math.round(b / w)
    const a = Math.max(0, Math.min(1, alpha))
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }, [])
  
  // 描画ループ
  useEffect(() => {
    if (!canvasRef.current || !simulationId) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let lastFrameTime = performance.now()
    
    const tick = () => {
      if (!isVisibleRef.current) {
        animRef.current = requestAnimationFrame(tick)
        return
      }

      const now = performance.now()
      
      // FPS制限
      if (maxFps > 0) {
        const minFrameInterval = 1000 / maxFps
        const elapsed = now - lastFrameTime
        if (elapsed < minFrameInterval) {
          animRef.current = requestAnimationFrame(tick)
          return
        }
        lastFrameTime = now - (elapsed % minFrameInterval)
      }
      
      const pos = positionsRef.current
      if (!pos) {
        animRef.current = requestAnimationFrame(tick)
        return
      }
      
      const n = nodesRef.current.length
      const l = linksRef.current.length
      
      // 2D描画
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
      
      // ノード描画
      for (let i = 0; i < n; i++) {
        const ix = i * 3
        const x = pos[ix]
        const y = pos[ix + 1]
        const z = pos[ix + 2]
        
        // 3D → 2D 投影
        const camera = cameraRef.current
        
        const wx = x - camera.centerX
        const wy = y - camera.centerY
        const wz = z - camera.centerZ
        
        const cosY = Math.cos(camera.rotationY)
        const sinY = Math.sin(camera.rotationY)
        const rx = wx * cosY - wz * sinY
        const ry = wy
        const rz = wx * sinY + wz * cosY
        
        const cosX = Math.cos(camera.rotationX)
        const sinX = Math.sin(camera.rotationX)
        const cx = rx
        const cy = ry * cosX - rz * sinX
        const cz = ry * sinX + rz * cosX
        
        const zoom = Math.max(0.05, 600 / Math.max(50, camera.distance))
        const screenX = width / 2 + cx * zoom
        const screenY = height / 2 + cy * zoom
        
        const node = nodesRef.current[i]
        const baseRadius = Math.max(1, Math.min(10, 2 + node.scale)) * zoom
        const maxDepth = Math.max(100, camera.distance)
        const depthWeight = 1 - Math.min(1, Math.abs(cz) / maxDepth)
        const radius = baseRadius * (0.7 + 0.9 * depthWeight)
        const connRaw = Math.max(0, Math.min(1, connectivityRef.current?.[i] ?? 0))
        const connBoost = Math.pow(connRaw, 0.4)
        const alphaDepth = 0.55 + 0.45 * depthWeight
        const minAlphaNode = 0.08
        const mix = 0.2 + 0.8 * connBoost
        const alpha = Math.max(0.03, Math.min(1, minAlphaNode + (1 - minAlphaNode) * alphaDepth * mix))
        
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
        const fillColor = mixEmotionColor(node, alpha)
        ctx.fillStyle = fillColor
        ctx.fill()
        
        // ラベル
        ctx.globalAlpha = Math.max(0.06, alpha * 0.9)
        ctx.fillStyle = '#1f2937'
        const labelSize = Math.round(10 + 4 * depthWeight)
        ctx.font = `${labelSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(node.label, screenX, screenY + 4)
      }
      
      ctx.globalAlpha = 1
      
      // エッジ描画
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
        
        const camera = cameraRef.current
        const cosY = Math.cos(camera.rotationY)
        const sinY = Math.sin(camera.rotationY)
        const cosX = Math.cos(camera.rotationX)
        const sinX = Math.sin(camera.rotationX)
        
        // ソースノードの変換
        const swx = sx - camera.centerX
        const swy = sy - camera.centerY
        const swz = sz - camera.centerZ
        const srx = swx * cosY - swz * sinY
        const sry = swy
        const srz = swx * sinY + swz * cosY
        const scx = srx
        const scy = sry * cosX - srz * sinX
        const scz = sry * sinX + srz * cosX
        const zoom = Math.max(0.05, 600 / Math.max(50, camera.distance))
        const sScreenX = width / 2 + scx * zoom
        const sScreenY = height / 2 + scy * zoom
        
        // ターゲットノードの変換
        const twx = tx - camera.centerX
        const twy = ty - camera.centerY
        const twz = tz - camera.centerZ
        const trx = twx * cosY - twz * sinY
        const try_ = twy
        const trz = twx * sinY + twz * cosY
        const tcx = trx
        const tcy = try_ * cosX - trz * sinX
        const tcz = try_ * sinX + trz * cosX
        const tScreenX = width / 2 + tcx * zoom
        const tScreenY = height / 2 + tcy * zoom
        
        const maxDepth = Math.max(100, camera.distance)
        const sw = 1 - Math.min(1, Math.abs(scz) / maxDepth)
        const tw = 1 - Math.min(1, Math.abs(tcz) / maxDepth)
        const w = 0.5 * (sw + tw)
        const cs = Math.max(0, Math.min(1, connectivityRef.current?.[source] ?? 0))
        const ct = Math.max(0, Math.min(1, connectivityRef.current?.[target] ?? 0))
        const wcRaw = 0.5 * (cs + ct)
        const wc = Math.pow(wcRaw, 0.4)
        const alphaDepth = 0.35 + 0.55 * w
        const minAlphaEdge = 0.06
        const mixEdge = 0.2 + 0.8 * wc
        ctx.globalAlpha = Math.max(0.03, Math.min(1, minAlphaEdge + (1 - minAlphaEdge) * alphaDepth * mixEdge))
        ctx.lineWidth = (0.6 + 1.6 * w) * (0.7 + 1.1 * wc)

        ctx.beginPath()
        ctx.strokeStyle = link.color || '#1e40af'
        ctx.moveTo(sScreenX, sScreenY)
        ctx.lineTo(tScreenX, tScreenY)
        ctx.stroke()
      }
      
      ctx.globalAlpha = 1
      ctx.lineWidth = 1
      
      // 構造分析結果の可視化
      if (showAnalysis) {
        const camera = cameraRef.current
        const zoom = Math.max(0.05, 600 / Math.max(50, camera.distance))
        const maxDepth = Math.max(100, camera.distance)

        // 空白エリアの可視化
        for (const gap of gapAreas) {
          const [gx, gy, gz] = gap.center
          
          const wx = gx - camera.centerX
          const wy = gy - camera.centerY
          const wz = gz - camera.centerZ
          
          const cosY = Math.cos(camera.rotationY)
          const sinY = Math.sin(camera.rotationY)
          const rx = wx * cosY - wz * sinY
          const ry = wy
          const rz = wx * sinY + wz * cosY
          
          const cosX = Math.cos(camera.rotationX)
          const sinX = Math.sin(camera.rotationX)
          const cx = rx
          const cy = ry * cosX - rz * sinX
          const cz = ry * sinX + rz * cosX
          
          const screenX = width / 2 + cx * zoom
          const screenY = height / 2 + cy * zoom
          
          const depthWeight = 1 - Math.min(1, Math.abs(cz) / maxDepth)
          const alpha = Math.max(0.3, Math.min(0.8, 0.3 + 0.5 * depthWeight * gap.confidence))
          
          ctx.globalAlpha = alpha * 0.3
          ctx.strokeStyle = `rgba(255, 193, 7, ${alpha})`
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          const radius = gap.radius * zoom * depthWeight
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
          ctx.stroke()
          
          ctx.globalAlpha = alpha
          ctx.fillStyle = `rgba(255, 193, 7, ${alpha})`
          ctx.font = `bold ${Math.round(16 + 8 * depthWeight)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('?', screenX, screenY)
          
          ctx.setLineDash([])
        }

        // 密度領域の可視化
        for (const region of densityRegions) {
          const [rx, ry, rz] = region.center
          
          const wx = rx - camera.centerX
          const wy = ry - camera.centerY
          const wz = rz - camera.centerZ
          
          const cosY = Math.cos(camera.rotationY)
          const sinY = Math.sin(camera.rotationY)
          const rrx = wx * cosY - wz * sinY
          const rry = wy
          const rrz = wx * sinY + wz * cosY
          
          const cosX = Math.cos(camera.rotationX)
          const sinX = Math.sin(camera.rotationX)
          const rcx = rrx
          const rcy = rry * cosX - rrz * sinX
          const rcz = rry * sinX + rrz * cosX
          
          const screenX = width / 2 + rcx * zoom
          const screenY = height / 2 + rcy * zoom
          
          const depthWeight = 1 - Math.min(1, Math.abs(rcz) / maxDepth)
          const alpha = Math.max(0.2, Math.min(0.6, 0.2 + 0.4 * depthWeight))
          
          const color = region.isOvercrowded 
            ? `rgba(239, 68, 68, ${alpha})`
            : `rgba(59, 130, 246, ${alpha})`
          
          ctx.globalAlpha = alpha * 0.2
          ctx.fillStyle = color
          ctx.beginPath()
          const radius = region.radius * zoom * depthWeight
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.globalAlpha = alpha
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
          ctx.stroke()
          
          if (region.isOvercrowded) {
            ctx.globalAlpha = alpha
            ctx.fillStyle = color
            ctx.font = `bold ${Math.round(14 + 6 * depthWeight)}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('⚠', screenX, screenY)
          }
        }
      }
      
      ctx.globalAlpha = 1
      ctx.lineWidth = 1
      ctx.setLineDash([])
      
      // ズームレベル表示を更新
      if (zoomLevelDisplayRef.current) {
        zoomLevelDisplayRef.current.textContent = `Zoom: ${zoomLevelRef.current.toFixed(0)}`
      }
      
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [width, height, background, maxFps, simulationId, mixEmotionColor, gapAreas, densityRegions, showAnalysis])
  
  // ノード・リンクの更新
  useEffect(() => {
    nodesRef.current = nodes
    linksRef.current = links
  }, [nodes, links])
  
  // エラー表示
  if (subscriptionError) {
    return (
      <div style={{ width, height, background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'red' }}>
          Subscription Error: {subscriptionError.message}
        </div>
      </div>
    )
  }
  
  if (!simulationId) {
    return (
      <div style={{ width, height, background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Initializing simulation...</div>
      </div>
    )
  }
  
  return (
    <div ref={containerRef} style={{ width, height, background, position: 'relative' }}>
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
      
      {/* デバッグパネル */}
      {showAnalysis && subscriptionData && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 10,
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto',
            lineHeight: '1.5'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '4px' }}>
            Subscription Debug Info
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ color: '#a0a0a0', fontSize: '10px' }}>Simulation</div>
            <div>ID: {simulationId}</div>
            <div>Iteration: {subscriptionData.forceGraphUpdates.iteration}</div>
            <div>Nodes: {subscriptionData.forceGraphUpdates.nodes.length}</div>
            <div>FPS: {maxFps === 0 ? 'Unlimited' : maxFps}</div>
          </div>
          
          {physics && (
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '8px' }}>
              <div style={{ color: '#a0a0a0', fontSize: '10px' }}>Physics Params</div>
              <div style={{ fontSize: '10px' }}>
                <div>springK: {physics.springK.toFixed(2)}</div>
                <div>repulsionK: {physics.repulsionK.toFixed(0)}</div>
                <div>damping: {physics.damping.toFixed(2)}</div>
                <div>restLength: {physics.restLength.toFixed(0)}</div>
                <div>maxSpeed: {physics.maxSpeed.toFixed(0)}</div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* ズームレベル表示 */}
      <div 
        ref={zoomLevelDisplayRef}
        style={{
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
        }}
      >
        Zoom: {(zoomLevelRef.current ?? 600).toFixed(0)}
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

export default React.memo(Force3DWordGraphTypeGPUSubscription)

