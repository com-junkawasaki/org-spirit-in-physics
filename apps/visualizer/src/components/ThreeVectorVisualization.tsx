'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html, Line } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import type * as THREE from 'three'

interface VectorPoint {
  id: string
  x: number
  y: number
  z: number
  emotion: number
  stimulus: string
  response: string
  probability: number
  reactionTime: number
  index: number
}

interface ThreeVectorVisualizationProps {
  vectorData: VectorPoint[]
  width?: number
  height?: number
}

// 個別のベクターポイントコンポーネント
function VectorPoint3D({ point, onClick, safeValue }: { point: VectorPoint; onClick?: (point: VectorPoint) => void; safeValue: (value: number | undefined, defaultValue?: number) => number }) {
  const meshRef = useRef<THREE.Mesh | null>(null)

  // Spirit確率に基づく色設定（緑が高確率、赤が低確率）
  const color = useMemo(() => {
    const probability = safeValue(point.probability, 0)
    if (probability >= 0.9) return '#22c55e' // 緑
    if (probability >= 0.7) return '#3b82f6' // 青
    if (probability >= 0.5) return '#eab308' // 黄色
    return '#ef4444' // 赤
  }, [point.probability, safeValue])

  // 反応時間に基づくサイズ設定
  const size = useMemo(() => {
    const baseSize = 0.05
    const reactionTime = safeValue(point.reactionTime, 0)
    const timeScale = Math.min(reactionTime / 5000, 1) // 最大5秒でスケーリング
    return baseSize + (timeScale * 0.05)
  }, [point.reactionTime, safeValue])

  // 感情成分に基づく透明度設定
  const opacity = useMemo(() => {
    const emotion = safeValue(point.emotion, 0)
    return 0.6 + (emotion * 0.4) // 感情成分が高いほど透明度が高い
  }, [point.emotion, safeValue])

  // アニメーション用のスプリング
  const { scale } = useSpring({
    scale: 1,
    config: { tension: 300, friction: 10 }
  })

  // フレームごとのアニメーション
  useFrame((state) => {
    if (meshRef.current && typeof point.index === 'number') {
      // 軽い浮遊アニメーション
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + point.index) * 0.001
    }
  })

  return (
    <animated.mesh
      ref={meshRef}
      scale={scale}
      position={[point.x, point.y, point.z]}
      onClick={() => onClick?.(point)}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.3}
        metalness={0.1}
      />
    </animated.mesh>
  )
}

// 座標軸のラベルコンポーネント（川崎モデルベース）
function AxisLabels() {
  return (
    <>
      {/* X軸 - Word2Vec（意味空間の主軸） */}
      <Text
        position={[1.8, 0, 0]}
        fontSize={0.12}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
      >
        意味空間 (Word2Vec)
      </Text>

      {/* Y軸 - 感情・生理統合（感情価） */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.12}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
      >
        感情価 (統合)
      </Text>

      {/* Z軸 - 反応・生理統合（活性度） */}
      <Text
        position={[0, 0, 1.8]}
        fontSize={0.12}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
      >
        活性度 (統合)
      </Text>
    </>
  )
}

// 座標軸のグリッド線
function GridLines() {
  const gridSize = 2

  return (
    <>
      {/* XY平面のグリッド */}
      <gridHelper args={[gridSize, 10, '#e5e7eb', '#f3f4f6']} position={[0, 0, 0]} />

      {/* XZ平面のグリッド */}
      <gridHelper args={[gridSize, 10, '#e5e7eb', '#f3f4f6']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />

      {/* YZ平面のグリッド */}
      <gridHelper args={[gridSize, 10, '#e5e7eb', '#f3f4f6']} rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]} />
    </>
  )
}

// 情報パネルコンポーネント
function InfoPanel({ selectedPoint }: { selectedPoint: VectorPoint | null }) {
  if (!selectedPoint) return null

  return (
    <Html position={[1, 1, 0]} style={{ pointerEvents: 'none' }}>
      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border min-w-48">
        <h4 className="font-semibold text-sm mb-2">選択されたポイント</h4>
        <div className="text-xs space-y-1">
          <p><strong>刺激語:</strong> {selectedPoint.stimulus}</p>
          <p><strong>応答語:</strong> {selectedPoint.response}</p>
          <p><strong>Spirit確率:</strong> {(selectedPoint.probability * 100).toFixed(2)}%</p>
          <p><strong>反応時間:</strong> {selectedPoint.reactionTime}ms</p>
          <p><strong>意味空間位置:</strong> {selectedPoint.x.toFixed(3)}</p>
          <p><strong>感情価:</strong> {selectedPoint.y.toFixed(3)}</p>
          <p><strong>活性度:</strong> {selectedPoint.z.toFixed(3)}</p>
        </div>
      </div>
    </Html>
  )
}

// メインの3D視覚化コンポーネント
export function ThreeVectorVisualization({ vectorData }: ThreeVectorVisualizationProps) {
  console.log('ThreeVectorVisualization: データ受信', vectorData.length, '件')

  const [selectedPoint, setSelectedPoint] = useState<VectorPoint | null>(null)
  // リラクゼーションUI用パラメータ
  const [minLength, setMinLength] = useState(0.25)
  const [maxLength, setMaxLength] = useState(1.2)
  const [relaxIterations, setRelaxIterations] = useState(20)
  const [relaxStep, setRelaxStep] = useState(0.15)

  // 安全な値チェック関数
  const safeValue = useCallback((value: number | undefined, defaultValue: number = 0): number => {
    return typeof value === 'number' && !Number.isNaN(value) ? value : defaultValue
  }, [])

  // データの統計情報を計算
  const stats = useMemo(() => {
    console.log('ThreeVectorVisualization: 統計計算開始')
    if (vectorData.length === 0) {
      console.log('ThreeVectorVisualization: データが空')
      return null
    }

    // 安全な統計計算
    const safeMin = (values: number[]) => {
      const validValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v))
      return validValues.length > 0 ? Math.min(...validValues) : 0
    }

    const safeMax = (values: number[]) => {
      const validValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v))
      return validValues.length > 0 ? Math.max(...validValues) : 0
    }

    const xValues = vectorData.map(d => d.x)
    const yValues = vectorData.map(d => d.y)
    const zValues = vectorData.map(d => d.z)

    const result = {
      word2vec: {
        min: safeMin(xValues),
        max: safeMax(xValues)
      },
      reactionTime: {
        min: safeMin(yValues),
        max: safeMax(yValues)
      },
      skinPotential: {
        min: safeMin(zValues),
        max: safeMax(zValues)
      }
    }

    console.log('ThreeVectorVisualization: 統計計算完了', result)
    return result
  }, [vectorData])

  // データポイントをスケーリング（川崎モデルベースのword2vec中心配置）
  const scaledVectorData = useMemo(() => {
    if (!stats || vectorData.length === 0) return []

    return vectorData.map((point, index) => {
      // Word2Vecを主軸とした物理ベースの配置
      const word2vecScaled = ((point.x - stats.word2vec.min) / (stats.word2vec.max - stats.word2vec.min)) * 2 - 1

      // 感情価：感情成分と生理データを統合（Y軸）
      const emotionValence = safeValue(point.emotion, 0)
      const emotionScaled = emotionValence * 1.5 - 0.75 // -0.75から0.75の範囲にスケーリング

      // 活性度：反応時間と生理データを統合（Z軸）
      const reactionTime = safeValue(point.reactionTime, 0)
      const reactionScaled = Math.min(reactionTime / 3000, 1) * 1.2 - 0.6 // -0.6から0.6の範囲にスケーリング

      // 物理シミュレーション風の微調整（粒子間の反発と引き寄せ）
      const phi = Math.acos(1 - (2 * (index + 0.5)) / vectorData.length) // 球面上の均等分布
      const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5)

      // ベースとなる球面配置にデータ値を加味
      const baseRadius = 1.0
      const dataInfluence = 0.3

      const x = (baseRadius + word2vecScaled * dataInfluence) * Math.sin(phi) * Math.cos(theta)
      const y = (baseRadius + emotionScaled * dataInfluence) * Math.sin(phi) * Math.sin(theta)
      const z = (baseRadius + reactionScaled * dataInfluence) * Math.cos(phi)

      return {
        ...point,
        x,
        y,
        z,
      }
    })
  }, [vectorData, stats, safeValue])

  // 感情類似エッジ（上位K）の構築と重み付け（weak/strong合成）
  const emotionWeak = 0.6
  const emotionStrong = 1.6
  const topK = 3
  const similarityEdgesBase = useMemo(() => {
    if (scaledVectorData.length === 0) return [] as Array<{ a: VectorPoint; b: VectorPoint; weight: number }>
    const edges: Array<{ a: VectorPoint; b: VectorPoint; weight: number }> = []
    for (let i = 0; i < scaledVectorData.length; i++) {
      const a = scaledVectorData[i]
      const candidates: Array<{ b: VectorPoint; w: number }> = []
      for (let j = 0; j < scaledVectorData.length; j++) {
        if (i === j) continue
        const b = scaledVectorData[j]
        const emoA = safeValue(a.emotion, 0)
        const emoB = safeValue(b.emotion, 0)
        const similarity01 = 1 - Math.min(1, Math.abs(emoA - emoB)) // [0,1]
        const weight = emotionWeak + (emotionStrong - emotionWeak) * similarity01
        candidates.push({ b, w: weight })
      }
      candidates.sort((u, v) => v.w - u.w)
      for (let k = 0; k < Math.min(topK, candidates.length); k++) {
        edges.push({ a, b: candidates[k].b, weight: candidates[k].w })
      }
    }
    return edges
  }, [scaledVectorData, safeValue])

  // エッジに基づく軽量リラクゼーション（感情距離→ターゲット距離）
  const relaxedVectorData = useMemo(() => {
    if (scaledVectorData.length === 0) return [] as VectorPoint[]
    // コピー（破壊しない）
    const pts = scaledVectorData.map((p) => ({ ...p }))
    const idToIndex = new Map<string, number>()
    for (let i = 0; i < pts.length; i++) {
      idToIndex.set(pts[i].id, i)
    }

    // weight を [0,1] 正規化
    const wmin = emotionWeak
    const wmax = emotionStrong
    const norm = (w: number) => (w - wmin) / (wmax - wmin + 1e-6)

    const iterations = Math.max(0, Math.floor(relaxIterations))
    const step = Math.max(0, relaxStep)
    const minL = Math.max(0.01, minLength) // 近い感情→短い
    const maxL = Math.max(minL + 1e-3, maxLength)  // 遠い感情→長い

    for (let t = 0; t < iterations; t++) {
      for (const e of similarityEdgesBase) {
        const ia = idToIndex.get(e.a.id)
        const ib = idToIndex.get(e.b.id)
        if (ia == null || ib == null) continue
        const a = pts[ia]
        const b = pts[ib]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dz = b.z - a.z
        const dist = Math.hypot(dx, dy, dz) + 1e-6
        const w01 = Math.max(0, Math.min(1, norm(e.weight)))
        const target = minL + (maxL - minL) * (1 - w01)
        const delta = (dist - target) * 0.5
        const ux = (dx / dist) * delta * step
        const uy = (dy / dist) * delta * step
        const uz = (dz / dist) * delta * step
        a.x += ux; a.y += uy; a.z += uz
        b.x -= ux; b.y -= uy; b.z -= uz
      }
    }
    return pts
  }, [scaledVectorData, similarityEdgesBase, minLength, maxLength, relaxIterations, relaxStep])

  // リラックス後の座標でエッジを再構築（描画用）
  const similarityEdges = useMemo(() => {
    if (relaxedVectorData.length === 0) return [] as Array<{ a: VectorPoint; b: VectorPoint; weight: number }>
    const byId = new Map(relaxedVectorData.map(p => [p.id, p]))
    return similarityEdgesBase.map(e => ({ a: byId.get(e.a.id) || e.a, b: byId.get(e.b.id) || e.b, weight: e.weight }))
  }, [relaxedVectorData, similarityEdgesBase])

  if (vectorData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">表示するベクトルデータがありません</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden relative">
      <Canvas
        camera={{
          position: [3, 3, 3],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{ background: 'transparent' }}
      >
        {/* 照明設定 */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-10, -10, -5]} intensity={0.4} />

        {/* 座標軸とグリッド */}
        <GridLines />
        <AxisLabels />

        {/* データポイント */}
        {relaxedVectorData.map((point) => (
          <VectorPoint3D
            key={point.id}
            point={point}
            onClick={setSelectedPoint}
            safeValue={safeValue}
          />
        ))}

        {/* 感情類似エッジ（重みで透明度と太さを変更） */}
        {similarityEdges.map((e) => {
          const alpha = Math.max(0.15, Math.min(0.9, (e.weight - emotionWeak) / (emotionStrong - emotionWeak + 1e-6)))
          const width = 0.5 + 2.0 * alpha
          return (
            <Line
              key={`${e.a.id}->${e.b.id}`}
              points={[
                [e.a.x, e.a.y, e.a.z],
                [e.b.x, e.b.y, e.b.z],
              ]}
              color={`rgba(59,130,246,${alpha})`}
              lineWidth={width}
            />
          )
        })}

        {/* 情報パネル */}
        <InfoPanel selectedPoint={selectedPoint} />

        {/* カメラコントロール */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
          maxDistance={10}
          minDistance={1}
        />

        {/* 座標軸の線 */}
        <axesHelper args={[1.5]} />
      </Canvas>

      {/* リラクゼーション制御パネル */}
      <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm p-2 rounded shadow text-xs space-x-2 flex items-center">
        <label className="flex items-center gap-1">
          <span>minL</span>
          <input type="number" step={0.01} value={minLength} onChange={(e) => setMinLength(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" />
        </label>
        <label className="flex items-center gap-1">
          <span>maxL</span>
          <input type="number" step={0.01} value={maxLength} onChange={(e) => setMaxLength(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" />
        </label>
        <label className="flex items-center gap-1">
          <span>iterations</span>
          <input type="number" step={1} value={relaxIterations} onChange={(e) => setRelaxIterations(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" />
        </label>
        <label className="flex items-center gap-1">
          <span>step</span>
          <input type="number" step={0.01} value={relaxStep} onChange={(e) => setRelaxStep(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" />
        </label>
      </div>

      {/* 凡例と統計情報（川崎モデルベース） */}
      <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm p-2 rounded text-xs max-w-48">
        <div className="font-semibold mb-1">凡例（川崎モデル統合視覚化）</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>高Spirit確率 (≥90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>中Spirit確率 (70-89%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>低Spirit確率 (50-69%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>最低Spirit確率 (&lt;50%)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="font-semibold mb-1 text-xs">軸の意味</div>
          <div className="text-xs space-y-0.5">
            <div><strong>X軸:</strong> 意味空間位置 (Word2Vec)</div>
            <div><strong>Y軸:</strong> 感情価 (感情・生理統合)</div>
            <div><strong>Z軸:</strong> 活性度 (反応・生理統合)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
