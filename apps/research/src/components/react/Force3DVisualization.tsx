'use client'

import React, { useRef, useEffect, useState } from 'react'

// Merkle DAG: components.react.force3d_visualization
// 3D Force Graph visualization component for research app
// Based on Force3DWordGraphTypeGPU from visualizer app

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
}

interface Force3DVisualizationProps {
  nodes: WordNode[]
  links: WordLink[]
  width?: number
  height?: number
  background?: string
}

export default function Force3DVisualization({
  nodes,
  links,
  width = 1000,
  height = 600,
  background = '#ffffff'
}: Force3DVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !canvasRef.current || nodes.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Canvas context not available')
      return
    }

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Simple 2D projection for now (3D WebGPU implementation would go here)
    // This is a placeholder that shows the graph structure
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    // Draw nodes
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.3

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      // Draw node
      ctx.beginPath()
      ctx.arc(x, y, node.scale * 10 + 5, 0, 2 * Math.PI)
      ctx.fillStyle = node.color || '#3b82f6'
      ctx.fill()
      ctx.strokeStyle = '#1e40af'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#000000'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, x, y - node.scale * 10 - 10)
    })

    // Draw links
    links.forEach(link => {
      const sourceNode = nodes[link.source]
      const targetNode = nodes[link.target]
      if (!sourceNode || !targetNode) return

      const sourceAngle = (2 * Math.PI * link.source) / nodes.length
      const targetAngle = (2 * Math.PI * link.target) / nodes.length
      const sourceX = centerX + radius * Math.cos(sourceAngle)
      const sourceY = centerY + radius * Math.sin(sourceAngle)
      const targetX = centerX + radius * Math.cos(targetAngle)
      const targetY = centerY + radius * Math.sin(targetAngle)

      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.lineTo(targetX, targetY)
      ctx.strokeStyle = link.mode === 'compression' ? '#ef4444' : '#3b82f6'
      ctx.lineWidth = link.weight * 2
      ctx.globalAlpha = 0.5
      ctx.stroke()
      ctx.globalAlpha = 1.0
    })
  }, [mounted, nodes, links, width, height, background])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500">Loading 3D visualization...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
      />
      <div className="p-2 text-xs text-gray-500 bg-gray-50">
        Note: Full 3D WebGPU visualization requires browser support. This is a 2D projection preview.
      </div>
    </div>
  )
}

