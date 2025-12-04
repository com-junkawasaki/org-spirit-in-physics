// Merkle DAG: components.complex_visualization
// Complex space visualization: "Your Complex is here"

import { useMemo } from 'react'
import type { ComplexSpaceData, ComplexRegion } from '@/types/demo/demo'

interface ComplexVisualizationProps {
  complexData: ComplexSpaceData | null
  width?: number
  height?: number
}

export default function ComplexVisualization({
  complexData,
  width = 800,
  height = 600,
}: ComplexVisualizationProps) {
  const regions = useMemo(() => {
    if (!complexData || complexData.regions.length === 0) {
      return []
    }
    return complexData.regions
  }, [complexData])

  if (!complexData) {
    return (
      <div className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900" style={{ width, height }}>
        <p className="text-gray-500 dark:text-gray-400">Complexデータがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          あなたのComplexはここです
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Complex空間: InformationSpace × BiologicalSpace (1024d → 3d投影)
        </p>

        {/* 3D Visualization placeholder */}
        <div
          className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 relative overflow-hidden"
          style={{ width, height }}
        >
          {/* Complex regions visualization */}
          <svg width={width} height={height} className="absolute inset-0">
            <defs>
              <radialGradient id="complexGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
              </radialGradient>
            </defs>

            {/* Project Complex regions to 2D (x, y projection) */}
            {regions.map((region: ComplexRegion) => {
              const [x, y] = region.center
              // Project to 2D (ignore z for now, or use it for size)
              const screenX = (x + 200) * (width / 400)
              const screenY = (y + 200) * (height / 400)
              const radius = region.radius * (width / 400)

              return (
                <g key={region.id}>
                  {/* Region circle */}
                  <circle
                    cx={screenX}
                    cy={screenY}
                    r={radius}
                    fill="url(#complexGradient)"
                    stroke="rgba(59, 130, 246, 0.6)"
                    strokeWidth="2"
                    opacity={0.6}
                  />
                  {/* Intensity indicator */}
                  <circle
                    cx={screenX}
                    cy={screenY}
                    r={radius * region.intensity}
                    fill="rgba(59, 130, 246, 0.2)"
                  />
                  {/* Label */}
                  <text
                    x={screenX}
                    y={screenY - radius - 10}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-900 dark:fill-white"
                  >
                    {region.label}
                  </text>
                  {/* Words count */}
                  <text
                    x={screenX}
                    y={screenY + radius + 15}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {region.words.length}語
                  </text>
                </g>
              )
            })}

            {/* Center point (Complex space origin) */}
            <circle
              cx={width / 2}
              cy={height / 2}
              r="4"
              fill="rgba(239, 68, 68, 0.8)"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={width / 2}
              y={height / 2 - 20}
              textAnchor="middle"
              className="text-sm font-bold fill-red-600"
            >
              Complex中心
            </text>
          </svg>

          {/* Info overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 text-xs">
            <div className="font-semibold mb-1 text-gray-900 dark:text-white">Complex領域</div>
            <div className="text-gray-600 dark:text-gray-400">
              {regions.length}個の領域を検出
            </div>
          </div>
        </div>

        {/* Region details */}
        {regions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Complex領域の詳細</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto">
              {regions.map((region: ComplexSpaceData['regions'][number]) => (
                <div
                  key={region.id}
                  className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                    {region.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    強度: {(region.intensity * 100).toFixed(1)}% | 単語数: {region.words.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    感情: {Object.entries(region.emotionProfile)
                    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([emotion, score]: [string, number]) => `${emotion}(${(score * 100).toFixed(0)}%)`)
                      .join(', ')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    単語: {region.words.slice(0, 5).join(', ')}
                    {region.words.length > 5 && ` ... (+${region.words.length - 5})`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

