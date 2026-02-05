<script lang="ts">
  import type { ForcePreset } from '@spirit/visualization';

  interface Props {
    forcePresets: readonly ForcePreset[];
    forcePresetId: string;
    springK: number;
    repulsionK: number;
    restLength: number;
    minSep: number;
    sepK: number;
    shellRadius: number;
    shellK: number;
    radialOutK?: number;
    damping: number;
    alpha: number;
    gamma: number;
    lambda: number;
    eta: number;
    
    // イベント
    onPresetChange: (id: string) => void;
    onSpringKChange: (value: number) => void;
    onRepulsionKChange: (value: number) => void;
    onRestLengthChange: (value: number) => void;
    onMinSepChange: (value: number) => void;
    onSepKChange: (value: number) => void;
    onShellRadiusChange: (value: number) => void;
    onShellKChange: (value: number) => void;
    onRadialOutKChange?: (value: number) => void;
    onDampingChange: (value: number) => void;
    onAlphaChange: (value: number) => void;
    onGammaChange: (value: number) => void;
    onLambdaChange: (value: number) => void;
    onEtaChange: (value: number) => void;
  }

  let {
    forcePresets,
    forcePresetId,
    springK,
    repulsionK,
    restLength,
    minSep,
    sepK,
    shellRadius,
    shellK,
    radialOutK = 0,
    damping,
    alpha,
    gamma,
    lambda,
    eta,
    onPresetChange,
    onSpringKChange,
    onRepulsionKChange,
    onRestLengthChange,
    onMinSepChange,
    onSepKChange,
    onShellRadiusChange,
    onShellKChange,
    onRadialOutKChange,
    onDampingChange,
    onAlphaChange,
    onGammaChange,
    onLambdaChange,
    onEtaChange
  }: Props = $props();
</script>

<div class="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
  <!-- プリセット選択 -->
  <div class="mb-4">
    <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preset Configuration</div>
    <div class="flex flex-wrap gap-2">
      {#each forcePresets as p (p.id)}
        <button
          type="button"
          onclick={() => onPresetChange(p.id)}
          class="px-3 py-1.5 text-sm rounded-md transition-colors {forcePresetId === p.id
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
        >
          {p.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- 物理パラメータコントロール -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- バネ力コントロール -->
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Spring Forces</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Spring K</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{springK.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5.0"
          step="0.1"
          value={springK}
          oninput={(e) => onSpringKChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Rest Length</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{restLength}</span>
        </div>
        <input
          type="range"
          min="30"
          max="150"
          step="5"
          value={restLength}
          oninput={(e) => onRestLengthChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>

    <!-- 反発力コントロール -->
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Repulsion Forces</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Repulsion K</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{repulsionK.toFixed(0)}</span>
        </div>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={repulsionK}
          oninput={(e) => onRepulsionKChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Min Separation</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{minSep}</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={minSep}
          oninput={(e) => onMinSepChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Separation K</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{sepK.toFixed(0)}</span>
        </div>
        <input
          type="range"
          min="1000"
          max="8000"
          step="200"
          value={sepK}
          oninput={(e) => onSepKChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>

    <!-- シェル力コントロール -->
    <div class="space-y-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">Shell Forces</h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Shell Radius</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{shellRadius}</span>
        </div>
        <input
          type="range"
          min="100"
          max="600"
          step="20"
          value={shellRadius}
          oninput={(e) => onShellRadiusChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Shell K</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{shellK.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5.0"
          step="0.1"
          value={shellK}
          oninput={(e) => onShellKChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Radial Out K</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{radialOutK.toFixed(0)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="300"
          step="10"
          value={radialOutK}
          oninput={(e) => onRadialOutKChange?.(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Damping</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{damping.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.85"
          max="0.99"
          step="0.01"
          value={damping}
          oninput={(e) => onDampingChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  </div>

  <!-- 感情パラメータコントロール -->
  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Emotion Parameters</h4>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">α</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{alpha.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={alpha}
          oninput={(e) => onAlphaChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">γ</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{gamma.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={gamma}
          oninput={(e) => onGammaChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">λ</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{lambda.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={lambda}
          oninput={(e) => onLambdaChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">η</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{eta.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={eta}
          oninput={(e) => onEtaChange(Number(e.currentTarget.value))}
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  </div>
</div>

