<script lang="ts">
	import type { PhysicsParams } from './lib/webgpu-physics';

	export let physics: Partial<PhysicsParams> = {};
	export let onUpdate: ((params: Partial<PhysicsParams>) => void) | undefined = undefined;

	let localPhysics = { ...physics };

	$: if (onUpdate) {
		onUpdate(localPhysics);
	}

	function updateParam(key: keyof PhysicsParams, value: number) {
		localPhysics = { ...localPhysics, [key]: value };
	}
</script>

<div class="physics-controls bg-white dark:bg-gray-800 p-4 rounded shadow">
	<h3 class="text-lg font-semibold mb-4">物理パラメータ</h3>
	
	<div class="space-y-4">
		<div>
			<label class="block text-sm font-medium mb-1">
				バネ定数 (springK): {localPhysics.springK?.toFixed(2) || physics.springK?.toFixed(2) || '2.00'}
			</label>
			<input
				type="range"
				min="0"
				max="10"
				step="0.1"
				value={localPhysics.springK || physics.springK || 2.0}
				oninput={(e) => updateParam('springK', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium mb-1">
				反発力 (repulsionK): {localPhysics.repulsionK?.toFixed(0) || physics.repulsionK?.toFixed(0) || '2000'}
			</label>
			<input
				type="range"
				min="0"
				max="10000"
				step="100"
				value={localPhysics.repulsionK || physics.repulsionK || 2000}
				oninput={(e) => updateParam('repulsionK', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium mb-1">
				減衰 (damping): {localPhysics.damping?.toFixed(2) || physics.damping?.toFixed(2) || '0.92'}
			</label>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={localPhysics.damping || physics.damping || 0.92}
				oninput={(e) => updateParam('damping', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium mb-1">
				平衡長 (restLength): {localPhysics.restLength?.toFixed(0) || physics.restLength?.toFixed(0) || '80'}
			</label>
			<input
				type="range"
				min="10"
				max="200"
				step="5"
				value={localPhysics.restLength || physics.restLength || 80}
				oninput={(e) => updateParam('restLength', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium mb-1">
				シェル半径 (shellRadius): {localPhysics.shellRadius?.toFixed(0) || physics.shellRadius?.toFixed(0) || '300'}
			</label>
			<input
				type="range"
				min="100"
				max="1000"
				step="10"
				value={localPhysics.shellRadius || physics.shellRadius || 300}
				oninput={(e) => updateParam('shellRadius', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium mb-1">
				シェル強度 (shellK): {localPhysics.shellK?.toFixed(2) || physics.shellK?.toFixed(2) || '1.50'}
			</label>
			<input
				type="range"
				min="0"
				max="5"
				step="0.1"
				value={localPhysics.shellK || physics.shellK || 1.5}
				oninput={(e) => updateParam('shellK', parseFloat((e.target as HTMLInputElement).value))}
				class="w-full"
			/>
		</div>
	</div>

	<button
		onclick={() => {
			localPhysics = { ...physics };
		}}
		class="mt-4 w-full bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
	>
		リセット
	</button>
</div>
