<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { WordNode, WordLink } from './types';
	import { COMPUTE_SHADER, createNodeData, createLinkData, type NodeData, type LinkData, type PhysicsParams } from './lib/webgpu-physics';
	import { VERTEX_SHADER, FRAGMENT_SHADER, createCameraMatrix } from './lib/webgpu-renderer';
	import tgpu from 'typegpu';
	import * as d from 'typegpu/data';
	import type { TgpuRoot } from 'typegpu';

	const {
		nodes = [],
		links = [],
		width = 1000,
		height = 600,
		background = '#ffffff',
		maxFps = 0, // 0 = unlimited
		physics = {
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
		},
		cameraPosition = [0, 0, 500] as [number, number, number],
		cameraTarget = [0, 0, 0] as [number, number, number],
		cameraRotation = [0, 0] as [number, number],
		zoom = 1.0,
		renderState: renderStateProp = undefined
	}: {
		nodes?: WordNode[];
		links?: WordLink[];
		width?: number;
		height?: number;
		background?: string;
		maxFps?: number;
		physics?: Partial<{
			springK: number;
			repulsionK: number;
			damping: number;
			restLength: number;
			maxSpeed: number;
			shellRadius: number;
			shellK: number;
			radialOutK: number;
			constraintIters: number;
			constraintStiffness: number;
			minSep: number;
			sepK: number;
		}>;
		cameraPosition?: [number, number, number];
		cameraTarget?: [number, number, number];
		cameraRotation?: [number, number];
		zoom?: number;
		renderState?: any;
	} = $props();

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let animationFrameId: number | null = null;
	let isVisible = true;

	// WebGPU resources
	let device: GPUDevice | null = null;
	let context: GPUCanvasContext | null = null;
	let root: TgpuRoot | null = null;
	let nodeBuffer: any = null; // TypeGPU buffer
	let linkBuffer: any = null; // TypeGPU buffer
	let paramsBuffer: any = null; // TypeGPU buffer
	let computePipeline: any = null; // TypeGPU compute pipeline
	let renderPipeline: any = null; // TypeGPU render pipeline
	let bindGroup: any = null; // TypeGPU bind group
	let lastFrameTime = 0;
	
	// レンダリング状態の追跡
	let renderState = $state({
		webgpuSupported: false,
		webgpuInitialized: false,
		canvas2dFallback: false,
		canvas2dContextObtained: false,
		renderCount: 0,
		lastRenderTime: null as number | null,
		errors: [] as string[],
		nodesRendered: 0,
		linksRendered: 0,
		isRendering: false
	});
	
	// 親コンポーネントに状態をバインド
	$effect(() => {
		if (renderStateProp) {
			// オブジェクトのプロパティを更新
			Object.assign(renderStateProp, {
				webgpuSupported: renderState.webgpuSupported,
				webgpuInitialized: renderState.webgpuInitialized,
				canvas2dFallback: renderState.canvas2dFallback,
				canvas2dContextObtained: renderState.canvas2dContextObtained,
				renderCount: renderState.renderCount,
				lastRenderTime: renderState.lastRenderTime,
				errors: [...renderState.errors], // 配列のコピー
				nodesRendered: renderState.nodesRendered,
				linksRendered: renderState.linksRendered,
				isRendering: renderState.isRendering
			});
		}
	});

	// Interaction state
	let isDragging = $state(false);
	let lastMousePos = $state<[number, number]>([0, 0]);
	let cameraTheta = $state(0);
	let cameraPhi = $state(0);
	let cameraDistance = $state(500);
	let localCameraPosition = $state<[number, number, number]>([0, 0, 500]);
	
	// Sync cameraPosition prop with local state
	$effect(() => {
		localCameraPosition = [...cameraPosition];
	});

	onMount(() => {
		if (!browser || !canvas || !container) return;

		// Intersection Observer for performance optimization
		const observer = new IntersectionObserver(
			(entries) => {
				isVisible = entries[0]?.isIntersecting ?? true;
			},
			{ rootMargin: '50px', threshold: 0.01 }
		);

		observer.observe(container);

		// Initialize WebGPU
		initWebGPU();

		// Setup mouse controls
		setupControls();

		return () => {
			observer.disconnect();
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			cleanup();
		};
	});

	onDestroy(() => {
		cleanup();
	});

	function setupControls() {
		if (!canvas) return;

		// Pointer eventsを使用（マウスとタッチの両方に対応）
		canvas.addEventListener('pointerdown', handlePointerDown);
		canvas.addEventListener('pointermove', handlePointerMove);
		canvas.addEventListener('pointerup', handlePointerUp);
		canvas.addEventListener('pointercancel', handlePointerUp);
		canvas.addEventListener('wheel', handleWheel);
		canvas.addEventListener('touchstart', handleTouchStart);
		canvas.addEventListener('touchmove', handleTouchMove);
		canvas.addEventListener('touchend', handleTouchEnd);
	}

	function handlePointerDown(e: PointerEvent) {
		isDragging = true;
		lastMousePos = [e.clientX, e.clientY];
		// setPointerCaptureはPointerEventでのみ動作
		if (canvas && e.pointerId !== undefined) {
			try {
				canvas.setPointerCapture(e.pointerId);
			} catch (error) {
				// ポインターが既にキャプチャされているか、無効な場合は無視
				console.warn('Failed to capture pointer:', error);
			}
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;

		const dx = e.clientX - lastMousePos[0];
		const dy = e.clientY - lastMousePos[1];

		cameraTheta += dx * 0.01;
		cameraPhi += dy * 0.01;
		cameraPhi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPhi));

		updateCameraPosition();
		lastMousePos = [e.clientX, e.clientY];
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		// ポインターキャプチャを解放
		if (canvas && e.pointerId !== undefined) {
			try {
				canvas.releasePointerCapture(e.pointerId);
			} catch (error) {
				// エラーは無視（既に解放されている可能性がある）
			}
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		cameraDistance += e.deltaY * 0.1;
		cameraDistance = Math.max(100, Math.min(2000, cameraDistance));
		updateCameraPosition();
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			isDragging = true;
			lastMousePos = [e.touches[0].clientX, e.touches[0].clientY];
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || e.touches.length !== 1) return;
		const dx = e.touches[0].clientX - lastMousePos[0];
		const dy = e.touches[0].clientY - lastMousePos[1];
		cameraTheta += dx * 0.01;
		cameraPhi += dy * 0.01;
		cameraPhi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPhi));
		updateCameraPosition();
		lastMousePos = [e.touches[0].clientX, e.touches[0].clientY];
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function updateCameraPosition() {
		localCameraPosition = [
			cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta),
			cameraDistance * Math.cos(cameraPhi),
			cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta)
		];
	}
	
	// Initialize camera position
	$effect(() => {
		localCameraPosition = [...cameraPosition];
	});

	async function initWebGPU() {
		console.log('[Force3DWordGraphTypeGPU] initWebGPU called');
		
		renderState.webgpuSupported = !!navigator.gpu;
		
		if (!navigator.gpu) {
			console.warn('[Force3DWordGraphTypeGPU] WebGPU is not supported');
			renderState.canvas2dFallback = false;
			if (!renderState.errors.includes('WebGPU is not supported on this browser')) {
				renderState.errors.push('WebGPU is not supported on this browser');
			}
			return;
		}

		if (!canvas) {
			console.warn('[Force3DWordGraphTypeGPU] initWebGPU: canvas is null');
			return;
		}
		
		console.log('[Force3DWordGraphTypeGPU] initWebGPU: canvas found, requesting adapter...');

		try {
			const adapter = await navigator.gpu.requestAdapter();
			if (!adapter) {
				console.warn('[Force3DWordGraphTypeGPU] Failed to get GPU adapter');
				renderState.webgpuInitialized = false;
				if (!renderState.errors.includes('Failed to get GPU adapter')) {
					renderState.errors.push('Failed to get GPU adapter');
				}
				return;
			}

			device = await adapter.requestDevice();
			context = canvas.getContext('webgpu') as GPUCanvasContext;

			if (!context) {
				console.warn('[Force3DWordGraphTypeGPU] Failed to get WebGPU context');
				renderState.webgpuInitialized = false;
				if (!renderState.errors.includes('Failed to get WebGPU context')) {
					renderState.errors.push('Failed to get WebGPU context');
				}
				return;
			}

			const format = navigator.gpu.getPreferredCanvasFormat();
			context.configure({
				device,
				format,
				alphaMode: 'premultiplied'
			});

			// Initialize TypeGPU root
			root = tgpu.initFromDevice({ device });

			// Define data schemas using TypeGPU
			const NodeSchema = d.struct({
				position: d.vec3f,
				velocity: d.vec3f,
				scale: d.f32,
				fixed: d.u32
			});

			const LinkSchema = d.struct({
				src: d.u32,
				dst: d.u32,
				weight: d.f32,
				mode: d.u32,
				L0: d.f32,
				k: d.f32
			});

			const PhysicsParamsSchema = d.struct({
				springK: d.f32,
				repulsionK: d.f32,
				damping: d.f32,
				restLength: d.f32,
				maxSpeed: d.f32,
				shellRadius: d.f32,
				shellK: d.f32,
				shellRadiusOuter: d.f32,
				shellKOuter: d.f32,
				radialOutK: d.f32,
				minSep: d.f32,
				sepK: d.f32,
				delta: d.f32
			});

			// Create compute pipeline using TypeGPU
			// Note: We'll use the existing WGSL code for now, but TypeGPU can help with buffer management
			const computeShaderModule = device.createShaderModule({
				code: COMPUTE_SHADER
			});

			computePipeline = device.createComputePipeline({
				layout: 'auto',
				compute: {
					module: computeShaderModule,
					entryPoint: 'main'
				}
			});

			// Create render pipeline
			const vertexShaderModule = device.createShaderModule({
				code: VERTEX_SHADER
			});

			const fragmentShaderModule = device.createShaderModule({
				code: FRAGMENT_SHADER
			});

			renderPipeline = device.createRenderPipeline({
				layout: 'auto',
				vertex: {
					module: vertexShaderModule,
					entryPoint: 'vs_main',
					buffers: [
						{
							arrayStride: 9 * 4, // 3 pos + 3 color + 3 normal
							attributes: [
								{ shaderLocation: 0, offset: 0, format: 'float32x3' },
								{ shaderLocation: 1, offset: 12, format: 'float32x3' },
								{ shaderLocation: 2, offset: 24, format: 'float32x3' }
							]
						}
					]
				},
				fragment: {
					module: fragmentShaderModule,
					entryPoint: 'fs_main',
					targets: [{ format }]
				},
				primitive: {
					topology: 'triangle-list'
				}
			});

			// Buffers will be initialized by reactive statement when nodes/links are available
			console.log('[Force3DWordGraphTypeGPU] WebGPU initialized successfully');
			console.log('[Force3DWordGraphTypeGPU] Current nodes/links:', {
				nodesLength: nodes.length,
				linksLength: links.length
			});
			
			renderState.webgpuInitialized = true;
			renderState.canvas2dFallback = false;
			
			// Start animation only if we have data
			if (nodes.length > 0 && links.length > 0) {
				animate();
			} else {
				console.log('[Force3DWordGraphTypeGPU] Waiting for nodes/links data before starting animation');
			}
		} catch (error) {
			console.error('[Force3DWordGraphTypeGPU] WebGPU initialization failed:', error);
			renderState.webgpuInitialized = false;
			renderState.canvas2dFallback = false;
			const errorMsg = `WebGPU initialization failed: ${error}`;
			if (!renderState.errors.includes(errorMsg)) {
				renderState.errors.push(errorMsg);
			}
		}
	}

	function initializeBuffers() {
		console.log('[Force3DWordGraphTypeGPU] initializeBuffers called:', {
			hasRoot: !!root,
			hasDevice: !!device,
			nodesLength: nodes.length,
			linksLength: links.length
		});
		
		if (!root || !device || nodes.length === 0 || links.length === 0) {
			console.warn('[Force3DWordGraphTypeGPU] Cannot initialize buffers:', {
				hasRoot: !!root,
				hasDevice: !!device,
				nodesLength: nodes.length,
				linksLength: links.length
			});
			return;
		}

		const nodeData = createNodeData(nodes);
		const linkData = createLinkData(links);

		// Define data schemas using TypeGPU
		const NodeSchema = d.struct({
			position: d.vec3f,
			velocity: d.vec3f,
			scale: d.f32,
			fixed: d.u32
		});

		const LinkSchema = d.struct({
			src: d.u32,
			dst: d.u32,
			weight: d.f32,
			mode: d.u32,
			L0: d.f32,
			k: d.f32
		});

		const PhysicsParamsSchema = d.struct({
			springK: d.f32,
			repulsionK: d.f32,
			damping: d.f32,
			restLength: d.f32,
			maxSpeed: d.f32,
			shellRadius: d.f32,
			shellK: d.f32,
			shellRadiusOuter: d.f32,
			shellKOuter: d.f32,
			radialOutK: d.f32,
			minSep: d.f32,
			sepK: d.f32,
			delta: d.f32
		});

		// Create node buffer array using TypeGPU
		const NodeArraySchema = d.arrayOf(NodeSchema, nodeData.length);
		const nodeArrayData: any[] = nodeData.map(node => ({
			position: node.position,
			velocity: node.velocity,
			scale: node.scale,
			fixed: node.fixed
		}));
		
		// Create buffers using TypeGPU
		// TypeGPU will automatically calculate buffer size based on schema
		nodeBuffer = root.createBuffer(NodeArraySchema).$usage('storage');

		// Create link buffer
		const LinkArraySchema = d.arrayOf(LinkSchema, linkData.length);
		const linkArrayData: any[] = linkData.map(link => ({
			src: link.src,
			dst: link.dst,
			weight: link.weight,
			mode: link.mode,
			L0: link.L0,
			k: link.k
		}));
		linkBuffer = root.createBuffer(LinkArraySchema).$usage('storage');

		// Create params buffer using TypeGPU uniform
		const params: PhysicsParams = {
			springK: physics.springK || 2.0,
			repulsionK: physics.repulsionK || 2000.0,
			damping: physics.damping || 0.92,
			restLength: physics.restLength || 80,
			maxSpeed: physics.maxSpeed || 100,
			shellRadius: physics.shellRadius || 300,
			shellK: physics.shellK || 1.5,
			shellRadiusOuter: (physics.shellRadius || 300) * 1.2,
			shellKOuter: (physics.shellK || 1.5) * 0.5,
			radialOutK: physics.radialOutK || 120,
			minSep: physics.minSep || 80,
			sepK: physics.sepK || 8000,
			delta: 0.016
		};

		paramsBuffer = root.createUniform(PhysicsParamsSchema, params);

		// Upload initial data using TypeGPU write methods
		// Compile writers first (required by TypeGPU)
		nodeBuffer.compileWriter();
		linkBuffer.compileWriter();
		
		// Write data using TypeGPU
		nodeBuffer.write(nodeArrayData);
		linkBuffer.write(linkArrayData);
		
		// Params buffer is already initialized with TypeGPU

		// Create bind group using WebGPU API (for compatibility with existing compute pipeline)
		bindGroup = device.createBindGroup({
			layout: computePipeline!.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: nodeBuffer.buffer } },
				{ binding: 1, resource: { buffer: linkBuffer.buffer } },
				{ binding: 2, resource: { buffer: paramsBuffer.buffer } }
			]
		});
	}

	function uploadNodeData(nodeData: NodeData[]) {
		if (!nodeBuffer) return;
		// Convert to TypeGPU format
		const nodeArrayData: any[] = nodeData.map(node => ({
			position: node.position,
			velocity: node.velocity,
			scale: node.scale,
			fixed: node.fixed
		}));
		// Use TypeGPU write method
		nodeBuffer.write(nodeArrayData);
	}

	function uploadLinkData(linkData: LinkData[]) {
		if (!linkBuffer) return;
		// Convert to TypeGPU format
		const linkArrayData: any[] = linkData.map(link => ({
			src: link.src,
			dst: link.dst,
			weight: link.weight,
			mode: link.mode,
			L0: link.L0,
			k: link.k
		}));
		// Use TypeGPU write method
		linkBuffer.write(linkArrayData);
	}

	function uploadParams(params: PhysicsParams) {
		if (!paramsBuffer) return;
		// TypeGPU uniform buffer can be written using the write method
		paramsBuffer.write(params);
	}

	function animate() {
		if (!isVisible) {
			animationFrameId = requestAnimationFrame(animate);
			return;
		}

		const now = performance.now();
		const deltaTime = now - lastFrameTime;
		lastFrameTime = now;

		if (maxFps > 0 && deltaTime < 1000 / maxFps) {
			animationFrameId = requestAnimationFrame(animate);
			return;
		}

		// Only render if WebGPU is fully ready
		if (device && computePipeline && bindGroup && nodeBuffer && context && nodes.length > 0 && links.length > 0) {
			console.log('[Force3DWordGraphTypeGPU] animate: using WebGPU path');
			// Run compute shader
			const commandEncoder = device.createCommandEncoder();
			const computePass = commandEncoder.beginComputePass();
			computePass.setPipeline(computePipeline);
			computePass.setBindGroup(0, bindGroup);
			computePass.dispatchWorkgroups(Math.ceil(nodes.length / 64));
			computePass.end();

			// Render (simplified - would need proper 3D rendering setup)
			renderState.isRendering = true;
			renderState.renderCount++;
			renderState.lastRenderTime = Date.now();
			// TODO: Implement proper WebGPU rendering here
			renderState.isRendering = false;

			device.queue.submit([commandEncoder.finish()]);
		} else {
			// WebGPU is not ready - stop animation loop and mark as not working
			if (lastFrameTime === 0 || now - lastFrameTime > 1000) {
				console.log('[Force3DWordGraphTypeGPU] animate: WebGPU not ready, stopping animation', {
					hasDevice: !!device,
					hasContext: !!context,
					hasComputePipeline: !!computePipeline,
					hasBindGroup: !!bindGroup,
					hasNodeBuffer: !!nodeBuffer,
					nodesLength: nodes.length,
					linksLength: links.length
				});
				// Mark as not working if WebGPU is initialized but rendering pipeline is not ready
				if (renderState.webgpuInitialized && (!device || !computePipeline || !bindGroup || !nodeBuffer || !context)) {
					if (!renderState.errors.includes('WebGPU rendering pipeline is not ready')) {
						renderState.errors.push('WebGPU rendering pipeline is not ready');
					}
				}
			}
			// Stop animation loop if WebGPU is not ready
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			return;
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	// Render function removed - WebGPU only, no Canvas 2D fallback

	function fallbackToCanvas2D() {
		// WebGPU not supported - show message instead of fallback
		console.log('[Force3DWordGraphTypeGPU] WebGPU not supported - not implementing fallback');
		renderState.canvas2dFallback = false;
		if (!renderState.errors.includes('WebGPU is not supported on this browser')) {
			renderState.errors.push('WebGPU is not supported on this browser');
		}
	}

	function cleanup() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		// イベントリスナーを削除
		if (canvas) {
			canvas.removeEventListener('pointerdown', handlePointerDown);
			canvas.removeEventListener('pointermove', handlePointerMove);
			canvas.removeEventListener('pointerup', handlePointerUp);
			canvas.removeEventListener('pointercancel', handlePointerUp);
			canvas.removeEventListener('wheel', handleWheel);
			canvas.removeEventListener('touchstart', handleTouchStart);
			canvas.removeEventListener('touchmove', handleTouchMove);
			canvas.removeEventListener('touchend', handleTouchEnd);
		}
		// GPU resources are automatically cleaned up when device is destroyed
	}

	// Update buffers when nodes/links change
	$effect(() => {
		console.log('[Force3DWordGraphTypeGPU] $effect triggered:', {
			browser,
			hasDevice: !!device,
			nodesLength: nodes.length,
			linksLength: links.length
		});
		
		if (browser && device && nodes.length > 0 && links.length > 0) {
			console.log('[Force3DWordGraphTypeGPU] Initializing buffers...');
			initializeBuffers();
		} else {
			console.log('[Force3DWordGraphTypeGPU] Skipping buffer initialization:', {
				browser,
				hasDevice: !!device,
				nodesLength: nodes.length,
				linksLength: links.length
			});
		}
	});
</script>

<div bind:this={container} class="force-3d-graph-container" style="width: {width}px; height: {height}px;">
	<canvas bind:this={canvas} width={width} height={height} style="background: {background}; cursor: grab;"></canvas>
	{#if nodes.length === 0}
		<div class="absolute inset-0 flex items-center justify-center text-gray-500">
			<p>ノードデータがありません</p>
		</div>
	{:else if !renderState.webgpuSupported || !renderState.webgpuInitialized || renderState.errors.length > 0 || (renderState.webgpuInitialized && renderState.renderCount === 0 && renderState.lastRenderTime === null)}
		<div class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
			<div class="text-center p-8">
				<p class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">3D Force Graph は対応していません</p>
				{#if renderState.errors.length > 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{renderState.errors[0]}
					</p>
				{:else if !renderState.webgpuSupported}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						WebGPUがこのブラウザでサポートされていません
					</p>
				{:else if renderState.webgpuInitialized && renderState.renderCount === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						WebGPUのレンダリングパイプラインが準備できていません
					</p>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						WebGPUの初期化に失敗しました
					</p>
				{/if}
			</div>
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
		touch-action: none;
	}

	canvas:active {
		cursor: grabbing;
	}
</style>
