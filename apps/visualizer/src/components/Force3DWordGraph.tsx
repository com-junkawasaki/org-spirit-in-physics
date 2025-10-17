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
  axis?: [number, number, number] // 視覚方向（emotion PCA等で与える）
  fixed?: boolean
  initial?: [number, number, number]
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
  }
  // 感情類似の影響倍率（links.weight への指数影響）
  emotionPower?: number
}
export default function Force3DWordGraph({ nodes, links, width = 1000, height = 600, background = '#0b1020', physics, emotionPower = 1 }: Force3DWordGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const nodeMeshesRef = useRef<THREE.Mesh[]>([])
  const nodeAxesRef = useRef<THREE.Vector3[]>([])
  const capInMeshesRef = useRef<THREE.Mesh[]>([])
  const capOutMeshesRef = useRef<THREE.Mesh[]>([])
  const capOffsetRef = useRef<number[]>([])
  const labelSpritesRef = useRef<THREE.Sprite[]>([])
  const lineGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const linePositionsRef = useRef<Float32Array | null>(null)
  const lineColorsRef = useRef<Float32Array | null>(null)
  const linkWeightMinRef = useRef<number>(0)
  const linkWeightMaxRef = useRef<number>(1)
  const nodeWeightedScaleRef = useRef<number[] | null>(null)

  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const animRef = useRef<number | null>(null)
  const smoothTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  // 差分更新用の参照
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

    // ノード
    // 12面の長方形（正12角柱の側面のみを使用）
    // 半径1, 高さ2, 12セグメント, 開放端（上下フタなし）
    const unitGeo = new THREE.CylinderGeometry(1, 1, 2, 12, 1, true)
    const yAxis = new THREE.Vector3(0, 1, 0)
    const capGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12, 1, false)
    const capMatIn = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ef4444') })
    const capMatOut = new THREE.MeshStandardMaterial({ color: new THREE.Color('#10b981') })

    nodeAxesRef.current = []
    capInMeshesRef.current = []
    capOutMeshesRef.current = []
    capOffsetRef.current = []
    nodeMeshesRef.current = nodesRef.current.map((n, idx) => {
      const color = colorForScaleRef.current(n.scale)
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
      const mesh = new THREE.Mesh(unitGeo, mat)
      const radius = Math.max(2, Math.min(10, 2 + n.scale))
      // 棒状スケーリング（軸方向を長く）
      mesh.scale.set(radius * 0.6, radius * 1.8, radius * 0.6)
      // 感情主方向軸（提供なければランダム）
      const ax = (n.axis
        ? new THREE.Vector3(n.axis[0], n.axis[1], n.axis[2])
        : new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      ).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(yAxis, ax)
      mesh.quaternion.copy(q)
      scene.add(mesh)

      // in/out キャップ
      const capOffset = radius * 0.9 // 軸方向のオフセット（中心→端）
      capOffsetRef.current[idx] = capOffset
      nodeAxesRef.current[idx] = ax
      const capIn = new THREE.Mesh(capGeo, capMatIn)
      const capOut = new THREE.Mesh(capGeo, capMatOut)
      capIn.quaternion.copy(q)
      capOut.quaternion.copy(q)
      scene.add(capIn)
      scene.add(capOut)
      capInMeshesRef.current[idx] = capIn
      capOutMeshesRef.current[idx] = capOut
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
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      const p = positionsRef.current as Float32Array
      const v = velocitiesRef.current as Float32Array
      const n = nodesRef.current.length

      const { springK, repulsionK, damping, restLength, maxSpeed, shellRadius, shellK, shellRadiusOuter, shellKOuter, radialOutK, torusR, torusr, torusK } = physicsRef.current

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

      // バネ（テンセグリティ: 片側拘束対応）
      for (let k = 0; k < linksRef.current.length; k++) {
        const { source, target, weight, mode, L0: L0in, k: kin } = linksRef.current[k]
        const i = source * 3
        const j = target * 3
        const dx = p[j] - p[i]
        const dy = p[j + 1] - p[i + 1]
        const dz = p[j + 2] - p[i + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6
        const wClamped = Math.max(0, Math.min(1, weight))
        const wAmp = Math.pow(wClamped, Math.max(0.1, emotionPower))
        // 既定 L0/k を推定（リンク固有値優先）
        // 強結合→短いL0、弱結合→長いL0（コントラスト強化）
        const L0guess = Math.max(10, restLength * (mode === 'compression' ? (1 + (1 - wClamped) * 1.2) : (1 - 0.7 * wClamped)))
        const L0 = Number.isFinite(L0in as number) ? (L0in as number) : L0guess
        const sums = nodeWeightedScaleRef.current
        const degNorm = sums ? (1 / Math.max(1, Math.sqrt((sums[source] || 0) + (sums[target] || 0)))) : 1
        // バネ定数もコントラスト強化（弱結合はかなり弱く、強結合は強く）
        const kBase = springK * (0.1 + 0.9 * wAmp) * degNorm
        const kEff = Number.isFinite(kin as number) ? (kin as number) : kBase

        let force = 0
        const x = dist - L0
        if (mode === 'tension') {
          // 張力のみ: 伸びたときだけ引く
          if (x > 0) force = kEff * x
        } else if (mode === 'compression') {
          // 圧縮のみ: 縮んだときだけ押す（負のx）
          if (x < 0) force = kEff * x
        } else {
          // 従来の両側バネ
          force = kEff * x
        }
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
        // 過度な中心寄せを抑えるため、速度に上限を課す（ソフトクランプ）
        const sp1 = Math.hypot(v[ix], v[ix + 1], v[ix + 2])
        const vmax = maxSpeed * 0.6
        if (sp1 > vmax) {
          const s = vmax / (sp1 + 1e-6)
          v[ix] *= s
          v[ix + 1] *= s
          v[ix + 2] *= s
        }
        v[ix] *= damping
        v[ix + 1] *= damping
        v[ix + 2] *= damping

        // ラジアルフォース：殻半径へ押し出し（内側→外側、外側→内側）
        {
          const rx = p[ix]
          const ry = p[ix + 1]
          const rz = p[ix + 2]
          const rlen = Math.hypot(rx, ry, rz) + 1e-6
          const target = shellRadius
          const k = shellK
          // 正: 外向き、負: 内向き
          const fr = (target - rlen) * k
          const ux = rx / rlen
          const uy = ry / rlen
          const uz = rz / rlen
          v[ix] += fr * ux * 0.016
          v[ix + 1] += fr * uy * 0.016
          v[ix + 2] += fr * uz * 0.016
        }

        // 外殻への吸引（リング/外層を形成）
        {
          const rx = p[ix]
          const ry = p[ix + 1]
          const rz = p[ix + 2]
          const rlen = Math.hypot(rx, ry, rz) + 1e-6
          const target = shellRadiusOuter
          const k = shellKOuter
          const fr = (target - rlen) * k
          const ux = rx / rlen
          const uy = ry / rlen
          const uz = rz / rlen
          v[ix] += fr * ux * 0.016
          v[ix + 1] += fr * uy * 0.016
          v[ix + 2] += fr * uz * 0.016
        }

        // 中心からのラジアル斥力（常に外向き、距離で減衰）
        if (radialOutK && radialOutK > 0) {
          const rx = p[ix]
          const ry = p[ix + 1]
          const rz = p[ix + 2]
          const rlen = Math.hypot(rx, ry, rz) + 1e-6
          const ux = rx / rlen
          const uy = ry / rlen
          const uz = rz / rlen
          const fr = radialOutK / (1 + rlen)
          v[ix] += fr * ux * delta
          v[ix + 1] += fr * uy * delta
          v[ix + 2] += fr * uz * delta
        }

        // トーラス吸引（y軸周り）
        if (torusK && torusK > 0 && torusR && torusr) {
          const x = p[ix]
          const y = p[ix + 1]
          const z = p[ix + 2]
          const rho = Math.hypot(x, z) + 1e-6
          const dr = rho - torusR
          const tube = Math.hypot(dr, y) + 1e-6
          const diff = torusr - tube
          const urx = x / rho
          const urz = z / rho
          const gX = (dr / tube) * urx
          const gY = (y / tube)
          const gZ = (dr / tube) * urz
          v[ix] += (torusK * diff) * gX * delta
          v[ix + 1] += (torusK * diff) * gY * delta
          v[ix + 2] += (torusK * diff) * gZ * delta
        }
        const sp2 = Math.hypot(v[ix], v[ix + 1], v[ix + 2])
        if (sp2 > maxSpeed) {
          const s = maxSpeed / (sp2 + 1e-6)
          v[ix] *= s
          v[ix + 1] *= s
          v[ix + 2] *= s
        }
      }

      // PBD風 長さ拘束（unilateral）
      const iters = Math.max(0, Math.floor(physicsRef.current.constraintIters || 0))
      const stiff = Math.max(0, Math.min(1, physicsRef.current.constraintStiffness || 0))
      for (let it = 0; it < iters; it++) {
        for (let k = 0; k < linksRef.current.length; k++) {
          const { source, target, mode, L0: L0in } = linksRef.current[k]
          const i = source * 3
          const j = target * 3
          const dx = p[j] - p[i]
          const dy = p[j + 1] - p[i + 1]
          const dz = p[j + 2] - p[i + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6
          const ux = dx / dist, uy = dy / dist, uz = dz / dist
          const L0 = Number.isFinite(L0in as number) ? (L0in as number) : physicsRef.current.restLength
          if (mode === 'tension') {
            if (dist > L0) {
              const corr = (dist - L0) * 0.5 * stiff
              p[i] += ux * corr; p[i + 1] += uy * corr; p[i + 2] += uz * corr
              p[j] -= ux * corr; p[j + 1] -= uy * corr; p[j + 2] -= uz * corr
            }
          } else if (mode === 'compression') {
            if (dist < L0) {
              const corr = (L0 - dist) * 0.5 * stiff
              p[i] -= ux * corr; p[i + 1] -= uy * corr; p[i + 2] -= uz * corr
              p[j] += ux * corr; p[j + 1] += uy * corr; p[j + 2] += uz * corr
            }
          }
        }
      }

      // 最終位置積分（固定ノードは初期位置を維持）
      for (let i = 0; i < n; i++) {
        const ix = i * 3
        const node = nodesRef.current[i]
        if (node?.fixed && node.initial) {
          p[ix] = node.initial[0]
          p[ix + 1] = node.initial[1]
          p[ix + 2] = node.initial[2]
          v[ix] = 0; v[ix + 1] = 0; v[ix + 2] = 0
        } else {
          p[ix] += v[ix] * delta
          p[ix + 1] += v[ix + 1] * delta
          p[ix + 2] += v[ix + 2] * delta
        }
      }

      // ノード位置反映（重み合計でスケールをダイナミックに）
      for (let i = 0; i < nodesRef.current.length; i++) {
        const mesh = nodeMeshesRef.current[i]
        if (!mesh) continue
        mesh.position.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
        const sums = nodeWeightedScaleRef.current
        if (sums) {
          const s = sums[i]
          const sMin = Math.min(...sums)
          const sMax = Math.max(...sums)
          const t = sMax > sMin ? (s - sMin) / (sMax - sMin) : 0
          const base = Math.max(2, Math.min(10, 2 + nodesRef.current[i].scale))
          const targetScale = base * (1 + 0.4 * t)
          const cur = mesh.scale.x
          const lerp = cur + (targetScale - cur) * 0.1
          mesh.scale.set(lerp, lerp, lerp)
        }
        // in/out キャップの位置更新（ローカル軸方向±）
        const ax = nodeAxesRef.current[i]
        const off = capOffsetRef.current[i] || 0
        const capIn = capInMeshesRef.current[i]
        const capOut = capOutMeshesRef.current[i]
        if (ax && capIn && capOut) {
          const vx = ax.x * off, vy = ax.y * off, vz = ax.z * off
          capIn.position.set(p[i * 3] - vx, p[i * 3 + 1] - vy, p[i * 3 + 2] - vz)
          capOut.position.set(p[i * 3] + vx, p[i * 3 + 1] + vy, p[i * 3 + 2] + vz)
        }

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
        // 重みで色づけ（弱=淡、強=鮮やか）
        const w = (linksRef.current[e].weight - linkWeightMinRef.current) / ((linkWeightMaxRef.current - linkWeightMinRef.current) || 1)
        const low = new THREE.Color(0.6, 0.7, 1.0)
        const high = new THREE.Color(0.0, 0.4, 1.0)
        const c1 = low.clone().lerp(high, w)
        const c2 = c1
        lc[i] = c1.r; lc[i + 1] = c1.g; lc[i + 2] = c1.b
        lc[i + 3] = c2.r; lc[i + 4] = c2.g; lc[i + 5] = c2.b
      }
      if (lineGeometryRef.current) {
        lineGeometryRef.current.attributes.position.needsUpdate = true
        lineGeometryRef.current.attributes.color.needsUpdate = true
      }

      // 力学の重心にカメラを向ける（スムージング）
      {
        let cx = 0, cy = 0, cz = 0
        for (let i = 0; i < n; i++) {
          cx += p[i * 3]
          cy += p[i * 3 + 1]
          cz += p[i * 3 + 2]
        }
        cx /= Math.max(1, n)
        cy /= Math.max(1, n)
        cz /= Math.max(1, n)
        const st = smoothTargetRef.current
        st.lerp(new THREE.Vector3(cx, cy, cz), 0.1)
        controls.target.copy(st)
        camera.lookAt(st)
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
  }, [width, height, background, emotionPower])

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

    if (links.length > 0) {
      let wMin = Infinity, wMax = -Infinity
      const sums = new Array(nodesRef.current.length).fill(0)
      for (const { source, target, weight } of links) {
        if (weight < wMin) wMin = weight
        if (weight > wMax) wMax = weight
        sums[source] += weight
        sums[target] += weight
      }
      linkWeightMinRef.current = Number.isFinite(wMin) ? wMin : 0
      linkWeightMaxRef.current = Number.isFinite(wMax) ? wMax : 1
      nodeWeightedScaleRef.current = sums
    }
  }, [links])

  return <div ref={containerRef} style={{ width, height }} />
}

// Merkle DAG: components.force3d_word_graph -> implementation_complete

