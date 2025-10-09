'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'

interface DataPoint {
  x: number
  y: number
  z: number
  value: number
  label?: string
  color?: string
}

interface ThreeDimensionalChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  showAxes?: boolean
  showGrid?: boolean
  pointSize?: number
  colorScale?: (value: number) => string
  onPointClick?: (point: DataPoint) => void
  title?: string
}

function DataPoints({
  data,
  pointSize = 0.05,
  colorScale,
  onPointClick
}: {
  data: DataPoint[]
  pointSize: number
  colorScale?: (value: number) => string
  onPointClick?: (point: DataPoint) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)

    data.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z

      const color = colorScale ? colorScale(point.value) : (point.color ? new THREE.Color(point.color) : new THREE.Color(0x3b82f6))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })

    return [positions, colors]
  }, [data, colorScale])

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.setAttribute('position', new THREE.InstancedBufferAttribute(positions, 3))
      meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  }, [positions, colors])

  const handleClick = (event: THREE.Event) => {
    event.stopPropagation()
    if (onPointClick && event.instanceId !== undefined) {
      onPointClick(data[event.instanceId])
    }
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.length]}
      onClick={handleClick}
    >
      <sphereGeometry args={[pointSize, 8, 6]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}

function Axes({ showGrid = true }: { showGrid?: boolean }) {
  return (
    <group>
      {/* X-axis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, 0, 5, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" />
      </line>
      <Text position={[5.2, 0, 0]} fontSize={0.2} color="red">X</Text>

      {/* Y-axis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -5, 0, 0, 5, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="green" />
      </line>
      <Text position={[0, 5.2, 0]} fontSize={0.2} color="green">Y</Text>

      {/* Z-axis */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, -5, 0, 0, 5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="blue" />
      </line>
      <Text position={[0, 0, 5.2]} fontSize={0.2} color="blue">Z</Text>

      {showGrid && (
        <>
          {/* Grid lines */}
          {Array.from({ length: 21 }, (_, i) => i - 10).map(i => (
            <group key={`grid-${i}`}>
              {/* XZ plane grid */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([i * 0.5, 0, -5, i * 0.5, 0, 5])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#e5e7eb" opacity={0.3} transparent />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([-5, 0, i * 0.5, 5, 0, i * 0.5])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#e5e7eb" opacity={0.3} transparent />
              </line>
            </group>
          ))}
        </>
      )}
    </group>
  )
}

function Tooltip({ point }: { point: DataPoint | null }) {
  if (!point) return null

  return (
    <Html position={[point.x, point.y + 0.5, point.z]}>
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 text-sm">
        <div className="font-medium">{point.label || `Point (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`}</div>
        <div className="text-gray-600">Value: {point.value.toFixed(3)}</div>
      </div>
    </Html>
  )
}

export function ThreeDimensionalChart({
  data,
  width = 600,
  height = 400,
  showAxes = true,
  showGrid = true,
  pointSize = 0.05,
  colorScale,
  onPointClick,
  title
}: ThreeDimensionalChartProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<DataPoint | null>(null)

  const defaultColorScale = (value: number): string => {
    // Blue to red color scale based on value
    const normalized = Math.max(0, Math.min(1, (value + 1) / 2)) // Normalize to 0-1
    const r = Math.floor(normalized * 255)
    const b = Math.floor((1 - normalized) * 255)
    return `rgb(${r}, 100, ${b})`
  }

  const handlePointClick = (point: DataPoint) => {
    setHoveredPoint(point)
    onPointClick?.(point)
  }

  return (
    <div className="relative" style={{ width, height }}>
      {title && (
        <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-90 px-3 py-1 rounded shadow">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}

      <Canvas
        camera={{ position: [8, 8, 8], fov: 60 }}
        style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {showAxes && <Axes showGrid={showGrid} />}

        <DataPoints
          data={data}
          pointSize={pointSize}
          colorScale={colorScale || defaultColorScale}
          onPointClick={handlePointClick}
        />

        <Tooltip point={hoveredPoint} />

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>

      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white bg-opacity-90 px-2 py-1 rounded">
        ドラッグで回転 • スクロールでズーム • 右クリックでパン
      </div>
    </div>
  )
}

export default ThreeDimensionalChart
