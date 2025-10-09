'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'

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
  // TODO: Fix React Three Fiber component types
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      3D Chart temporarily disabled - fixing component types
    </div>
  )
}

function Axes({ showGrid = true }: { showGrid?: boolean }) {
  // TODO: Fix React Three Fiber component types
  return null
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

      {/* TODO: Fix React Three Fiber component types */}
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-gray-600 font-medium">3D Chart</div>
          <div className="text-sm text-gray-500">Temporarily disabled - fixing component types</div>
        </div>
      </div>

      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white bg-opacity-90 px-2 py-1 rounded">
        ドラッグで回転 • スクロールでズーム • 右クリックでパン
      </div>
    </div>
  )
}

export default ThreeDimensionalChart
