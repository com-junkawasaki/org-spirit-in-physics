import React from 'react'
import type { ForcePreset } from './types'

// Merkle DAG: timeline.components.force_3d_controls
// 3Dフォースコントロールコンポーネント

interface Force3DControlsProps {
  forcePresets: readonly ForcePreset[]
  forcePresetId: ForcePreset['id']
  onPresetChange: (id: ForcePreset['id']) => void
  springK: number
  onSpringKChange: (value: number) => void
  repulsionK: number
  onRepulsionKChange: (value: number) => void
  restLength: number
  onRestLengthChange: (value: number) => void
  minSep: number
  onMinSepChange: (value: number) => void
  sepK: number
  onSepKChange: (value: number) => void
  shellRadius: number
  onShellRadiusChange: (value: number) => void
  shellK: number
  onShellKChange: (value: number) => void
  // Shannon: 冗長な中心集約を抑えるための外向きラジアル力
  radialOutK?: number
  onRadialOutKChange?: (value: number) => void
  damping: number
  onDampingChange: (value: number) => void
  alpha: number
  onAlphaChange: (value: number) => void
  gamma: number
  onGammaChange: (value: number) => void
  lambda: number
  onLambdaChange: (value: number) => void
  eta: number
  onEtaChange: (value: number) => void
}

export default function Force3DControls({
  forcePresets,
  forcePresetId,
  onPresetChange,
  springK,
  onSpringKChange,
  repulsionK,
  onRepulsionKChange,
  restLength,
  onRestLengthChange,
  minSep,
  onMinSepChange,
  sepK,
  onSepKChange,
  shellRadius,
  onShellRadiusChange,
  shellK,
  onShellKChange,
  radialOutK,
  onRadialOutKChange,
  damping,
  onDampingChange,
  alpha,
  onAlphaChange,
  gamma,
  onGammaChange,
  lambda,
  onLambdaChange,
  eta,
  onEtaChange,
}: Force3DControlsProps) {
  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* プリセット選択 */}
      <div className="mb-4">
        <div className="block text-sm font-medium text-gray-700 mb-2">Preset Configuration</div>
        <div className="flex flex-wrap gap-2">
          {forcePresets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                forcePresetId === p.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 物理パラメータコントロール */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* バネ力コントロール */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Spring Forces</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Spring K</span>
              <span className="text-xs text-gray-500">{springK.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={springK}
              onChange={(e) => onSpringKChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rest Length</span>
              <span className="text-xs text-gray-500">{restLength}</span>
            </div>
            <input
              type="range"
              min="30"
              max="150"
              step="5"
              value={restLength}
              onChange={(e) => onRestLengthChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* 反発力コントロール */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Repulsion Forces</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Repulsion K</span>
              <span className="text-xs text-gray-500">{repulsionK.toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={repulsionK}
              onChange={(e) => onRepulsionKChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Min Separation</span>
              <span className="text-xs text-gray-500">{minSep}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={minSep}
              onChange={(e) => onMinSepChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Separation K</span>
              <span className="text-xs text-gray-500">{sepK.toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="8000"
              step="200"
              value={sepK}
              onChange={(e) => onSepKChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* シェル力コントロール */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-1">Shell Forces</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Shell Radius</span>
              <span className="text-xs text-gray-500">{shellRadius}</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="20"
              value={shellRadius}
              onChange={(e) => onShellRadiusChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Shell K</span>
              <span className="text-xs text-gray-500">{shellK.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={shellK}
              onChange={(e) => onShellKChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Radial Out K</span>
              <span className="text-xs text-gray-500">{(radialOutK ?? 0).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={radialOutK ?? 0}
              onChange={(e) => onRadialOutKChange?.(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Damping</span>
              <span className="text-xs text-gray-500">{damping.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.85"
              max="0.99"
              step="0.01"
              value={damping}
              onChange={(e) => onDampingChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* 感情パラメータコントロール */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Emotion Parameters</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">α</span>
              <span className="text-xs text-gray-500">{alpha.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={alpha}
              onChange={(e) => onAlphaChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">γ</span>
              <span className="text-xs text-gray-500">{gamma.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={gamma}
              onChange={(e) => onGammaChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">λ</span>
              <span className="text-xs text-gray-500">{lambda.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={lambda}
              onChange={(e) => onLambdaChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">η</span>
              <span className="text-xs text-gray-500">{eta.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={eta}
              onChange={(e) => onEtaChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: timeline.components.force_3d_controls -> implementation_complete
// 3Dフォースコントロールコンポーネントの実装完了
