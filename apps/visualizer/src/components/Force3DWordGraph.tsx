'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Merkle DAG: components.force3d_word_graph
// ユング単語連合の語ごとスケールを反映した完全グラフ3D可視化
// 依存: React, @react-three/fiber, drei, three
// BPMN: Force3DWordGraph

export interface WordNode {
  id: string
  label: string
  scale: number // 単語スケール（ノード半径・重み）
}

export interface WordLink {
  source: number // インデックス（ノード配列参照）
  target: number
  weight: number // 辺スケール（太さ）
}

interface Force3DWordGraphProps {
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
    timeScale?: number
  }
}
export default function Force3DWordGraph({ nodes, links, width = 1000, height = 600, background = '#0b1020', physics }: Force3DWordGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const nodeMeshesRef = useRef<THREE.Mesh[]>([])
  const labelSpritesRef = useRef<THREE.Sprite[]>([])
  const lineGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const linePositionsRef = useRef<Float32Array | null>(null)
  const lineColorsRef = useRef<Float32Array | null>(null)

  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const animRef = useRef<number | null>(null)

  // 差分更新用の参照
  const nodesRef = useRef<WordNode[]>(nodes)
  const linksRef = useRef<WordLink[]>(links)
  const physicsRef = useRef({
    springK: physics?.springK ?? 3.0,
    repulsionK: physics?.repulsionK ?? 800.0,
    damping: physics?.damping ?? 0.95,
    restLength: physics?.restLength ?? 60,
    maxSpeed: physics?.maxSpeed ?? 120,
    timeScale: physics?.timeScale ?? 1.0,
  })

  // 色スケール
  const scaleExtent = useMemo(() => {
    if (nodes.length === 0) return { min: 0, max: 1 }
    const vals = nodes.map(n => n.scale)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    return { min, max: max <= min ? min + 1e-6 : max }
  }, [nodes])

  const colorForScale = React.useCallback((s: number): THREE.Color => {
    const t = (s - scaleExtent.min) / (scaleExtent.max - scaleExtent.min)
    return new THREE.Color(t, 0.5, 1 - t)
  }, [scaleExtent.min, scaleExtent.max])

  const colorForScaleRef = useRef(colorForScale)
  useEffect(() => { colorForScaleRef.current = colorForScale }, [colorForScale])

  // 物理パラメータの差分反映
  useEffect(() => {
    physicsRef.current = {
      springK: physics?.springK ?? physicsRef.current.springK,
      repulsionK: physics?.repulsionK ?? physicsRef.current.repulsionK,
      damping: physics?.damping ?? physicsRef.current.damping,
      restLength: physics?.restLength ?? physicsRef.current.restLength,
      maxSpeed: physics?.maxSpeed ?? physicsRef.current.maxSpeed,
      timeScale: physics?.timeScale ?? physicsRef.current.timeScale,
    }
  }, [physics])

  // サイズ変更
  useEffect(() => {
    const renderer = rendererRef.current
    const camera = cameraRef.current
    if (renderer && camera) {
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  }, [width, height])

  // 背景色変更
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(background)
  }, [background])

  // 初期化は一度だけ実行し、以降は差分更新
  useEffect(() => {
    if (!containerRef.current) return

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // シーン
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(background)
    sceneRef.current = scene

    // カメラ
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000)
    camera.position.set(0, 0, 300)
    cameraRef.current = camera

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 50
    controls.maxDistance = 800
    controlsRef.current = controls

    // ライティング
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dl = new THREE.DirectionalLight(0xffffff, 0.6)
    dl.position.set(50, 100, 50)
    scene.add(dl)

    // 初期位置
    const N = nodesRef.current.length
    positionsRef.current = new Float32Array(N * 3)
    velocitiesRef.current = new Float32Array(N * 3)
    const pos = positionsRef.current as Float32Array
    const vel = velocitiesRef.current as Float32Array
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 120 + Math.random() * 40
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      vel[i * 3] = 0
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = 0
    }

    // ノード
    const unitGeo = new THREE.SphereGeometry(1, 16, 16)
    nodeMeshesRef.current = nodesRef.current.map((n) => {
      const color = colorForScaleRef.current(n.scale)
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
      const mesh = new THREE.Mesh(unitGeo, mat)
      const radius = Math.max(2, Math.min(10, 2 + n.scale))
      mesh.scale.set(radius, radius, radius)
      scene.add(mesh)
      return mesh
    })

    // ラベル
    const makeLabel = (text: string) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0 }))
      const fontSize = 28
      ctx.font = `${fontSize}px sans-serif`
      const metrics = ctx.measureText(text)
      canvas.width = Math.ceil(metrics.width + 20)
      canvas.height = fontSize + 12
      const ctx2 = canvas.getContext('2d')
      if (!ctx2) return new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0 }))
      ctx2.font = `${fontSize}px sans-serif`
      ctx2.fillStyle = 'rgba(255,255,255,0.9)'
      ctx2.textBaseline = 'top'
      ctx2.fillText(text, 10, 2)
      const texture = new THREE.CanvasTexture(canvas)
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
      const sprite = new THREE.Sprite(material)
      const scale = 0.5
      sprite.scale.set(canvas.width * 0.5 * scale, canvas.height * 0.5 * scale, 1)
      return sprite
    }

    labelSpritesRef.current = nodesRef.current.map((n) => {
      const s = makeLabel(n.label)
      scene.add(s)
      return s
    })

    // エッジ
    lineGeometryRef.current = new THREE.BufferGeometry()
    linePositionsRef.current = new Float32Array(linksRef.current.length * 2 * 3)
    lineColorsRef.current = new Float32Array(linksRef.current.length * 2 * 3)
    lineGeometryRef.current.setAttribute('position', new THREE.BufferAttribute(linePositionsRef.current, 3))
    lineGeometryRef.current.setAttribute('color', new THREE.BufferAttribute(lineColorsRef.current, 3))
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 })
    const lines = new THREE.LineSegments(lineGeometryRef.current, lineMat)
    scene.add(lines)

    let lastTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const rawDelta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      const p = positionsRef.current as Float32Array
      const v = velocitiesRef.current as Float32Array
      const n = nodesRef.current.length

      const { springK, repulsionK, damping, restLength, maxSpeed, timeScale } = physicsRef.current
      const delta = rawDelta * (timeScale ?? 1)

      // 斥力
      for (let i = 0; i < n; i++) {
        const ix = i * 3
        for (let j = i + 1; j < n; j++) {
          const jx = j * 3
          const dx = p[ix] - p[jx]
          const dy = p[ix + 1] - p[jx + 1]
          const dz = p[ix + 2] - p[jx + 2]
          const distSq = dx * dx + dy * dy + dz * dz + 1e-6
          const dist = Math.sqrt(distSq)
          const force = repulsionK / distSq
          const fx = (force * dx) / dist
          const fy = (force * dy) / dist
          const fz = (force * dz) / dist
          v[ix] += fx * delta
          v[ix + 1] += fy * delta
          v[ix + 2] += fz * delta
          v[jx] -= fx * delta
          v[jx + 1] -= fy * delta
          v[jx + 2] -= fz * delta
        }
      }

      // バネ
      for (let k = 0; k < linksRef.current.length; k++) {
        const { source, target, weight } = linksRef.current[k]
        const i = source * 3
        const j = target * 3
        const dx = p[j] - p[i]
        const dy = p[j + 1] - p[i + 1]
        const dz = p[j + 2] - p[i + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6
        const L0 = Math.max(10, restLength / Math.sqrt(1 + weight))
        const x = dist - L0
        const force = springK * x
        const fx = (force * dx) / dist
        const fy = (force * dy) / dist
        const fz = (force * dz) / dist
        v[i] += fx * delta
        v[i + 1] += fy * delta
        v[i + 2] += fz * delta
        v[j] -= fx * delta
        v[j + 1] -= fy * delta
        v[j + 2] -= fz * delta
      }

      // 減衰と位置更新
      for (let i = 0; i < n; i++) {
        const ix = i * 3
        v[ix] *= damping
        v[ix + 1] *= damping
        v[ix + 2] *= damping
        const speed = Math.hypot(v[ix], v[ix + 1], v[ix + 2])
        if (speed > maxSpeed) {
          const s = maxSpeed / (speed + 1e-6)
          v[ix] *= s
          v[ix + 1] *= s
          v[ix + 2] *= s
        }
        p[ix] += v[ix] * delta
        p[ix + 1] += v[ix + 1] * delta
        p[ix + 2] += v[ix + 2] * delta
      }

      // ノード位置反映
      for (let i = 0; i < nodesRef.current.length; i++) {
        const mesh = nodeMeshesRef.current[i]
        if (!mesh) continue
        mesh.position.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
        const label = labelSpritesRef.current[i]
        if (label) label.position.set(p[i * 3], p[i * 3 + 1] + 12, p[i * 3 + 2])
      }

      // エッジ頂点更新
      const lp = linePositionsRef.current as Float32Array
      const lc = lineColorsRef.current as Float32Array
      for (let e = 0; e < linksRef.current.length; e++) {
        const { source, target } = linksRef.current[e]
        const s3 = source * 3
        const t3 = target * 3
        const i = e * 2 * 3
        lp[i] = p[s3]; lp[i + 1] = p[s3 + 1]; lp[i + 2] = p[s3 + 2]
        lp[i + 3] = p[t3]; lp[i + 4] = p[t3 + 1]; lp[i + 5] = p[t3 + 2]
        const c1 = colorForScaleRef.current(nodesRef.current[source].scale)
        const c2 = colorForScaleRef.current(nodesRef.current[target].scale)
        lc[i] = c1.r; lc[i + 1] = c1.g; lc[i + 2] = c1.b
        lc[i + 3] = c2.r; lc[i + 4] = c2.g; lc[i + 5] = c2.b
      }
      if (lineGeometryRef.current) {
        lineGeometryRef.current.attributes.position.needsUpdate = true
        lineGeometryRef.current.attributes.color.needsUpdate = true
      }

      controls.update()
      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(tick)
    }

    // 初回描画（以降は tick 内で更新・描画）
    animRef.current = requestAnimationFrame(tick)

    // クリーンアップ
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      controlsRef.current?.dispose()
      rendererRef.current?.dispose()
      if (rendererRef.current) containerRef.current?.removeChild(rendererRef.current.domElement)
      // メッシュとジオメトリの破棄
      nodeMeshesRef.current.forEach(m => {
        m.geometry.dispose()
        const mat = m.material as THREE.Material
        mat.dispose()
      })
      labelSpritesRef.current.forEach(s => {
        ;(s.material as THREE.Material).dispose()
        s.removeFromParent()
      })
      if (lineGeometryRef.current) lineGeometryRef.current.dispose()
    }
  }, [width, height, background])

  // ノードの差分反映（長さ不変を前提にスケールと色のみ更新）
  useEffect(() => {
    nodesRef.current = nodes
    if (nodeMeshesRef.current.length === nodes.length) {
      nodes.forEach((n, i) => {
        const mesh = nodeMeshesRef.current[i]
        if (!mesh) return
        const radius = Math.max(2, Math.min(10, 2 + n.scale))
        mesh.scale.set(radius, radius, radius)
        const color = colorForScaleRef.current(n.scale)
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color = color
        mat.emissive = color
      })
    }
  }, [nodes])

  // リンクの差分反映（長さが変わる場合はバッファを再割当）
  useEffect(() => {
    linksRef.current = links
    if (!lineGeometryRef.current) return
    if (!linePositionsRef.current || linePositionsRef.current.length !== links.length * 2 * 3) {
      linePositionsRef.current = new Float32Array(links.length * 2 * 3)
      lineColorsRef.current = new Float32Array(links.length * 2 * 3)
      lineGeometryRef.current.setAttribute('position', new THREE.BufferAttribute(linePositionsRef.current, 3))
      lineGeometryRef.current.setAttribute('color', new THREE.BufferAttribute(lineColorsRef.current, 3))
    }
  }, [links])

  return <div ref={containerRef} style={{ width, height }} />
}

// Merkle DAG: components.force3d_word_graph -> implementation_complete

