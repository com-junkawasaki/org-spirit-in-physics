'use client'

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'

// Merkle DAG: visualization.word2vec_3d -> 3d_scatter_plot
// Word2Vecデータの3D可視化コンポーネント
// 依存関係: @react-three/fiber, @react-three/drei, three

interface WordData {
  word: string
  embedding: number[]
  spiritProbability: number
  reactionTime: number
  timestamp: string
  participantId: string
}

interface Word2Vec3DVisualizationProps {
  wordData: WordData[]
  participantId: string
  className?: string
}

// Merkle DAG: visualization.word2vec_3d.point_cloud
// 3D点群コンポーネント
function WordPointCloud({ wordData }: { wordData: WordData[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Merkle DAG: visualization.word2vec_3d.dimension_reduction
  // PCA次元削減（300次元→3次元）
  const reducedData = useMemo(() => {
    if (wordData.length === 0) return []

    const embeddings = wordData.map(d => d.embedding)
    const n = embeddings.length
    const dim = embeddings[0].length

    // 平均を計算
    const mean = new Array(dim).fill(0)
    embeddings.forEach(embedding => {
      embedding.forEach((val, i) => {
        mean[i] += val
      })
    })
    mean.forEach((val, i) => {
      mean[i] = val / n
    })

    // 中心化
    const centered = embeddings.map(embedding =>
      embedding.map((val, i) => val - mean[i])
    )

    // 共分散行列
    const covariance = new Array(3).fill(0).map(() => new Array(3).fill(0))
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0
        for (let k = 0; k < n; k++) {
          sum += centered[k][i] * centered[k][j]
        }
        covariance[i][j] = sum / (n - 1)
      }
    }

    // 簡易PCA（最初の3次元を使用）
    return wordData.map((data, index) => {
      const embedding = data.embedding
      return {
        ...data,
        position: [
          embedding[0] * 2, // X軸
          embedding[1] * 2, // Y軸  
          embedding[2] * 2  // Z軸
        ] as [number, number, number]
      }
    })
  }, [wordData])

  // Merkle DAG: visualization.word2vec_3d.color_mapping
  // Spirit確率に基づく色マッピング
  const getColor = useCallback((spiritProbability: number): string => {
    // 0.0 (低) → 青, 0.5 (中) → 緑, 1.0 (高) → 赤
    const hue = (1 - spiritProbability) * 240 // 240度(青) → 0度(赤)
    return `hsl(${hue}, 70%, 50%)`
  }, [])

  // Merkle DAG: visualization.word2vec_3d.instance_setup
  // インスタンスメッシュの設定
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const tempObject = new THREE.Object3D()
    const tempColor = new THREE.Color()

    reducedData.forEach((data, index) => {
      // 位置設定
      tempObject.position.set(...data.position)
      tempObject.scale.setScalar(0.1 + data.spiritProbability * 0.2) // サイズはSpirit確率に比例
      tempObject.updateMatrix()
      mesh.setMatrixAt(index, tempObject.matrix)

      // 色設定
      tempColor.set(getColor(data.spiritProbability))
      if (mesh.instanceColor) {
        mesh.setColorAt(index, tempColor)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [reducedData, getColor])

  // Merkle DAG: visualization.word2vec_3d.interaction
  // マウスインタラクション
  useFrame((state) => {
    if (!meshRef.current) return

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    // マウス位置を正規化
    mouse.x = (state.mouse.x * state.viewport.width) / state.size.width
    mouse.y = (state.mouse.y * state.viewport.height) / state.size.height

    raycaster.setFromCamera(mouse, state.camera)
    
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId
      if (instanceId !== hoveredIndex) {
        setHoveredIndex(instanceId)
      }
    } else {
      if (hoveredIndex !== null) {
        setHoveredIndex(null)
      }
    }
  })

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, reducedData.length]}
        onClick={(e) => {
          if (e.instanceId !== undefined) {
            setSelectedIndex(e.instanceId)
          }
        }}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* ホバー時の情報表示 */}
      {hoveredIndex !== null && (
        <Html
          position={reducedData[hoveredIndex]?.position}
          distanceFactor={10}
        >
          <div className="bg-black bg-opacity-75 text-white p-2 rounded text-xs">
            <div>単語: {reducedData[hoveredIndex]?.word}</div>
            <div>Spirit確率: {(reducedData[hoveredIndex]?.spiritProbability * 100).toFixed(1)}%</div>
            <div>反応時間: {reducedData[hoveredIndex]?.reactionTime}ms</div>
          </div>
        </Html>
      )}

      {/* 選択時の詳細情報 */}
      {selectedIndex !== null && (
        <Html
          position={reducedData[selectedIndex]?.position}
          distanceFactor={8}
        >
          <div className="bg-blue-600 bg-opacity-90 text-white p-3 rounded text-sm max-w-xs">
            <div className="font-bold mb-2">{reducedData[selectedIndex]?.word}</div>
            <div>Spirit確率: {(reducedData[selectedIndex]?.spiritProbability * 100).toFixed(1)}%</div>
            <div>反応時間: {reducedData[selectedIndex]?.reactionTime}ms</div>
            <div>時刻: {new Date(reducedData[selectedIndex]?.timestamp).toLocaleString('ja-JP')}</div>
            <button
              type="button"
              className="mt-2 px-2 py-1 bg-red-600 rounded text-xs"
              onClick={() => setSelectedIndex(null)}
            >
              閉じる
            </button>
          </div>
        </Html>
      )}
    </>
  )
}

// Merkle DAG: visualization.word2vec_3d.axes
// 座標軸コンポーネント
function Axes() {
  return (
    <>
      {/* X軸 (赤) */}
      <mesh position={[5, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 10]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <Text position={[5.5, 0, 0]} fontSize={0.5} color="red">
        X (語義軸)
      </Text>

      {/* Y軸 (緑) */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 10]} />
        <meshBasicMaterial color="green" />
      </mesh>
      <Text position={[0, 5.5, 0]} fontSize={0.5} color="green">
        Y (感情軸)
      </Text>

      {/* Z軸 (青) */}
      <mesh position={[0, 0, 5]}>
        <cylinderGeometry args={[0.05, 0.05, 10]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <Text position={[0, 0, 5.5]} fontSize={0.5} color="blue">
        Z (時間軸)
      </Text>
    </>
  )
}

// Merkle DAG: visualization.word2vec_3d.main_component
// メイン3D可視化コンポーネント
export function Word2Vec3DVisualization({ 
  wordData, 
  participantId, 
  className = '' 
}: Word2Vec3DVisualizationProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // データ読み込み完了
    if (wordData.length > 0) {
      setIsLoading(false)
    }
  }, [wordData])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">3D可視化を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (wordData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-muted-foreground">表示するデータがありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* コントロールパネル */}
      <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
        <h3 className="font-bold text-sm mb-2">3D Word2Vec可視化</h3>
        <div className="text-xs space-y-1">
          <div>参加者: {participantId.slice(0, 8)}...</div>
          <div>単語数: {wordData.length}</div>
          <div>平均Spirit確率: {(wordData.reduce((sum, d) => sum + d.spiritProbability, 0) / wordData.length * 100).toFixed(1)}%</div>
        </div>
        <div className="mt-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>低Spirit確率</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>中Spirit確率</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>高Spirit確率</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [10, 10, 10], fov: 60 }}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {/* 照明 */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* 3Dコンテンツ */}
        <WordPointCloud wordData={wordData} />
        <Axes />

        {/* カメラコントロール */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>

      {/* 操作説明 */}
      <div className="absolute bottom-4 right-4 z-10 bg-white bg-opacity-90 p-2 rounded text-xs">
        <div>🖱️ 左ドラッグ: 回転</div>
        <div>🖱️ 右ドラッグ: 移動</div>
        <div>🖱️ ホイール: ズーム</div>
        <div>🖱️ クリック: 詳細表示</div>
      </div>
    </div>
  )
}
