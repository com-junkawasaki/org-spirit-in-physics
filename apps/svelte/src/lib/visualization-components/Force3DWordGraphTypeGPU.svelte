<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { WordNode, WordLink } from './types';
	import { COMPUTE_SHADER, createNodeData, createLinkData, type NodeData, type LinkData, type PhysicsParams } from './lib/webgpu-physics';
	import { VERTEX_SHADER, FRAGMENT_SHADER, createCameraMatrix } from './lib/webgpu-renderer';

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
	let nodeBuffer: GPUBuffer | null = null;
	let linkBuffer: GPUBuffer | null = null;
	let paramsBuffer: GPUBuffer | null = null;
	let computePipeline: GPUComputePipeline | null = null;
	let renderPipeline: GPURenderPipeline | null = null;
	let bindGroup: GPUBindGroup | null = null;
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
			console.warn('[Force3DWordGraphTypeGPU] WebGPU is not supported, falling back to Canvas 2D');
			renderState.canvas2dFallback = true;
			fallbackToCanvas2D();
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
				console.warn('Failed to get GPU adapter');
				fallbackToCanvas2D();
				return;
			}

			device = await adapter.requestDevice();
			context = canvas.getContext('webgpu') as GPUCanvasContext;

			if (!context) {
				console.warn('Failed to get WebGPU context');
				fallbackToCanvas2D();
				return;
			}

			const format = navigator.gpu.getPreferredCanvasFormat();
			context.configure({
				device,
				format,
				alphaMode: 'premultiplied'
			});

			// Create compute pipeline
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
			console.log('[Force3DWordGraphTypeGPU] WebGPU initialized successfully, starting animation');
			console.log('[Force3DWordGraphTypeGPU] Current nodes/links:', {
				nodesLength: nodes.length,
				linksLength: links.length
			});
			
			renderState.webgpuInitialized = true;
			renderState.canvas2dFallback = false;
			
			// Start animation
			animate();
		} catch (error) {
			console.error('[Force3DWordGraphTypeGPU] WebGPU initialization failed:', error);
			renderState.webgpuInitialized = false;
			renderState.canvas2dFallback = true;
			renderState.errors.push(`WebGPU initialization failed: ${error}`);
			fallbackToCanvas2D();
		}
	}

	function initializeBuffers() {
		console.log('[Force3DWordGraphTypeGPU] initializeBuffers called:', {
			hasDevice: !!device,
			nodesLength: nodes.length,
			linksLength: links.length
		});
		
		if (!device || nodes.length === 0 || links.length === 0) {
			console.warn('[Force3DWordGraphTypeGPU] Cannot initialize buffers:', {
				hasDevice: !!device,
				nodesLength: nodes.length,
				linksLength: links.length
			});
			return;
		}

		const nodeData = createNodeData(nodes);
		const linkData = createLinkData(links);

		// Create node buffer
		const nodeBufferSize = nodeData.length * 7 * 4; // 3 pos + 3 vel + 1 scale + 1 fixed
		nodeBuffer = device.createBuffer({
			size: nodeBufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
		});

		// Create link buffer
		const linkBufferSize = linkData.length * 6 * 4; // src + dst + weight + mode + L0 + k
		linkBuffer = device.createBuffer({
			size: linkBufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		});

		// Create params buffer
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

		paramsBuffer = device.createBuffer({
			size: 13 * 4, // 13 floats
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		// Upload initial data
		uploadNodeData(nodeData);
		uploadLinkData(linkData);
		uploadParams(params);

		// Create bind group
		bindGroup = device.createBindGroup({
			layout: computePipeline!.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: nodeBuffer } },
				{ binding: 1, resource: { buffer: linkBuffer } },
				{ binding: 2, resource: { buffer: paramsBuffer } }
			]
		});
	}

	function uploadNodeData(nodeData: NodeData[]) {
		if (!device || !nodeBuffer) return;
		const data = new Float32Array(nodeData.length * 7);
		for (let i = 0; i < nodeData.length; i++) {
			const node = nodeData[i];
			const offset = i * 7;
			data[offset + 0] = node.position[0];
			data[offset + 1] = node.position[1];
			data[offset + 2] = node.position[2];
			data[offset + 3] = node.velocity[0];
			data[offset + 4] = node.velocity[1];
			data[offset + 5] = node.velocity[2];
			data[offset + 6] = node.scale;
		}
		device.queue.writeBuffer(nodeBuffer, 0, data);
	}

	function uploadLinkData(linkData: LinkData[]) {
		if (!device || !linkBuffer) return;
		const data = new Float32Array(linkData.length * 6);
		for (let i = 0; i < linkData.length; i++) {
			const link = linkData[i];
			const offset = i * 6;
			data[offset + 0] = link.src;
			data[offset + 1] = link.dst;
			data[offset + 2] = link.weight;
			data[offset + 3] = link.mode;
			data[offset + 4] = link.L0;
			data[offset + 5] = link.k;
		}
		device.queue.writeBuffer(linkBuffer, 0, data);
	}

	function uploadParams(params: PhysicsParams) {
		if (!device || !paramsBuffer) return;
		const data = new Float32Array([
			params.springK,
			params.repulsionK,
			params.damping,
			params.restLength,
			params.maxSpeed,
			params.shellRadius,
			params.shellK,
			params.shellRadiusOuter,
			params.shellKOuter,
			params.radialOutK,
			params.minSep,
			params.sepK,
			params.delta
		]);
		device.queue.writeBuffer(paramsBuffer, 0, data);
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

		// Always try to render with Canvas 2D fallback if WebGPU is not ready
		if (device && computePipeline && bindGroup && nodeBuffer && nodes.length > 0 && links.length > 0) {
			console.log('[Force3DWordGraphTypeGPU] animate: using WebGPU path');
			// Run compute shader
			const commandEncoder = device.createCommandEncoder();
			const computePass = commandEncoder.beginComputePass();
			computePass.setPipeline(computePipeline);
			computePass.setBindGroup(0, bindGroup);
			computePass.dispatchWorkgroups(Math.ceil(nodes.length / 64));
			computePass.end();

			// Render (simplified - would need proper 3D rendering setup)
			render();

			device.queue.submit([commandEncoder.finish()]);
		} else if (nodes.length > 0 && links.length > 0) {
			// Fallback to Canvas 2D rendering if WebGPU is not ready
			if (lastFrameTime === 0 || now - lastFrameTime > 100) {
				// Only log occasionally to avoid spam
				console.log('[Force3DWordGraphTypeGPU] animate: using Canvas 2D fallback', {
					hasDevice: !!device,
					hasComputePipeline: !!computePipeline,
					hasBindGroup: !!bindGroup,
					hasNodeBuffer: !!nodeBuffer,
					nodesLength: nodes.length,
					linksLength: links.length
				});
			}
			render();
		} else {
			// No data yet
			if (lastFrameTime === 0 || now - lastFrameTime > 1000) {
				console.log('[Force3DWordGraphTypeGPU] animate: waiting for data', {
					nodesLength: nodes.length,
					linksLength: links.length
				});
			}
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	function render() {
		renderState.isRendering = true;
		renderState.renderCount++;
		renderState.lastRenderTime = Date.now();
		
		// Simplified rendering - in a full implementation, this would
		// read node positions from GPU buffer and render spheres/links
		// For now, we'll use Canvas 2D as fallback
		if (!canvas) {
			console.warn('[Force3DWordGraphTypeGPU] render: canvas is null');
			renderState.errors.push('Canvas element is null');
			renderState.isRendering = false;
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.warn('[Force3DWordGraphTypeGPU] render: failed to get 2d context');
			renderState.canvas2dContextObtained = false;
			renderState.errors.push('Failed to get 2D context');
			renderState.isRendering = false;
			return;
		}
		
		renderState.canvas2dContextObtained = true;

		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, width, height);

		if (nodes.length === 0 || links.length === 0) {
			console.log('[Force3DWordGraphTypeGPU] render: skipping (no data)', {
				nodesLength: nodes.length,
				linksLength: links.length
			});
			return;
		}
		
		console.log('[Force3DWordGraphTypeGPU] render: rendering', {
			nodesLength: nodes.length,
			linksLength: links.length,
			nodesWithPosition: nodes.filter(n => n.position).length
		});

		// Project 3D nodes to 2D (simplified)
		const centerX = width / 2;
		const centerY = height / 2;
		const scale = 2.0;

		// Initialize positions if not set
		for (let i = 0; i < nodes.length; i++) {
			if (!nodes[i].position) {
				// Use initial position or random position
				const initial = nodes[i].initial || [
					(Math.random() - 0.5) * 200,
					(Math.random() - 0.5) * 200,
					(Math.random() - 0.5) * 200
				];
				// Note: Direct mutation of props is not recommended in Svelte 5,
				// but we need to set position for rendering
				// In a production app, we should use a local state copy
				(nodes[i] as any).position = initial;
			}
		}

		// Draw links
		ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
		ctx.lineWidth = 1;
		let linksRendered = 0;
		for (const link of links) {
			const source = nodes[link.source];
			const target = nodes[link.target];
			if (!source || !target || !source.position || !target.position) continue;

			// Simplified 2D projection
			const x1 = centerX + source.position[0] * scale;
			const y1 = centerY + source.position[1] * scale;
			const x2 = centerX + target.position[0] * scale;
			const y2 = centerY + target.position[1] * scale;

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			linksRendered++;
		}
		
		renderState.linksRendered = linksRendered;

		// Draw nodes
		let nodesRendered = 0;
		for (const node of nodes) {
			if (!node.position) continue;
			const x = centerX + node.position[0] * scale;
			const y = centerY + node.position[1] * scale;
			const radius = (node.scale || 1) * 5;

			ctx.fillStyle = node.color || '#3b82f6';
			nodesRendered++;
		}
		
		renderState.nodesRendered = nodesRendered;
		renderState.isRendering = false;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();

			// Draw label
			ctx.fillStyle = '#000';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(node.label, x, y + radius + 15);
		}
	}

	function fallbackToCanvas2D() {
		console.log('Falling back to Canvas 2D rendering');
		// Use Canvas 2D for rendering
		animate();
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
