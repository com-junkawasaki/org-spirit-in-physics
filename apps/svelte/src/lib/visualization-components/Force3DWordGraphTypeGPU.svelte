<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { WordNode, WordLink } from './types';

	export let nodes: WordNode[] = [];
	export let links: WordLink[] = [];
	export let width: number = 1000;
	export let height: number = 600;
	export let background: string = '#ffffff';
	export let maxFps: number = 0; // 0 = unlimited

	interface PhysicsParams {
		springK?: number;
		repulsionK?: number;
		damping?: number;
		restLength?: number;
		maxSpeed?: number;
		shellRadius?: number;
		shellK?: number;
		radialOutK?: number;
		constraintIters?: number;
		constraintStiffness?: number;
		minSep?: number;
		sepK?: number;
	}

	export let physics: PhysicsParams = {
		springK: 2.0,
		repulsionK: 2000.0,
		damping: 0.92,
		restLength: 80,
		maxSpeed: 100,
		shellRadius: 300,
		shellK: 1.5,
		radialOutK: 120,
		constraintIters: 2,
		constraintStiffness: 0.5,
		minSep: 80,
		sepK: 8000
	};

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let animationFrameId: number | null = null;
	let isVisible = true;

	onMount(() => {
		if (!canvas || !container) return;

		// Intersection Observer for performance optimization
		const observer = new IntersectionObserver(
			(entries) => {
				isVisible = entries[0]?.isIntersecting ?? true;
			},
			{ rootMargin: '50px', threshold: 0.01 }
		);

		observer.observe(container);

		// Initialize WebGPU if available
		initWebGPU();

		return () => {
			observer.disconnect();
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	async function initWebGPU() {
		if (!navigator.gpu) {
			console.warn('WebGPU is not supported');
			return;
		}

		try {
			const adapter = await navigator.gpu.requestAdapter();
			if (!adapter) {
				console.warn('Failed to get GPU adapter');
				return;
			}

			const device = await adapter.requestDevice();
			// WebGPU setup will be implemented here
			console.log('WebGPU initialized');
		} catch (error) {
			console.error('WebGPU initialization failed:', error);
		}
	}

	function animate() {
		if (!isVisible) {
			animationFrameId = requestAnimationFrame(animate);
			return;
		}

		// Animation logic will be implemented here
		// For now, just request next frame
		animationFrameId = requestAnimationFrame(animate);
	}
</script>

<div bind:this={container} class="force-3d-graph-container" style="width: {width}px; height: {height}px;">
	<canvas bind:this={canvas} width={width} height={height} style="background: {background};"></canvas>
	{#if nodes.length === 0}
		<div class="absolute inset-0 flex items-center justify-center text-gray-500">
			<p>ノードデータがありません</p>
		</div>
	{/if}
</div>

<style>
	.force-3d-graph-container {
		position: relative;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
