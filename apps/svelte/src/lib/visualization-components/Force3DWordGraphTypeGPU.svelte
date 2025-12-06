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
	let cameraUniformBuffer: any = null; // TypeGPU uniform buffer for camera
	let lightUniformBuffer: any = null; // TypeGPU uniform buffer for light
	let vertexBuffer: any = null; // TypeGPU vertex buffer for nodes
	let indexBuffer: any = null; // TypeGPU index buffer for nodes
	let linkVertexBuffer: any = null; // TypeGPU vertex buffer for links (edges)
	let linkIndexBuffer: any = null; // TypeGPU index buffer for links (edges)
	let renderBindGroup: any = null; // TypeGPU bind group for rendering
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

			// Define render pipeline data schemas using TypeGPU
			const CameraSchema = d.struct({
				view: d.mat4x4f,
				proj: d.mat4x4f
			});

			const LightSchema = d.struct({
				direction: d.vec3f,
				color: d.vec3f
			});

			const VertexSchema = d.struct({
				position: d.vec3f,
				color: d.vec3f,
				normal: d.vec3f
			});

			// Create uniform buffers for camera and light using TypeGPU
			const initialCamera = {
				view: new Float32Array(16).fill(0),
				proj: new Float32Array(16).fill(0)
			};
			cameraUniformBuffer = root.createUniform(CameraSchema, initialCamera);

			const initialLight = {
				direction: [0, -1, 0] as [number, number, number],
				color: [1, 1, 1] as [number, number, number]
			};
			lightUniformBuffer = root.createUniform(LightSchema, initialLight);

			// Create bind group layout for rendering
			// Note: We use WebGPU API directly to match existing WGSL shader bindings
			// TypeGPU buffers are used for data management, but bind groups use WebGPU API
			// This ensures compatibility with existing shader code that uses @binding(0) and @binding(1)
			const renderBindGroupLayout = device.createBindGroupLayout({
				entries: [
					{
						binding: 0,
						visibility: GPUShaderStage.VERTEX,
						buffer: { type: 'uniform' }
					},
					{
						binding: 1,
						visibility: GPUShaderStage.FRAGMENT,
						buffer: { type: 'uniform' }
					}
				]
			});

			// Create bind group for rendering using WebGPU API
			// TypeGPU buffers provide the underlying GPUBuffer via .buffer property
			renderBindGroup = device.createBindGroup({
				layout: renderBindGroupLayout,
				entries: [
					{ binding: 0, resource: { buffer: cameraUniformBuffer.buffer } },
					{ binding: 1, resource: { buffer: lightUniformBuffer.buffer } }
				]
			});

			// Create render pipeline using existing WGSL code
			// Note: TypeGPU's withVertex/withFragment requires 'use gpu' functions,
			// but we can use the existing WGSL code with WebGPU API directly
			const vertexShaderModule = device.createShaderModule({
				code: VERTEX_SHADER
			});

			const fragmentShaderModule = device.createShaderModule({
				code: FRAGMENT_SHADER
			});

			// Create pipeline layout that matches our bind group layout
			const pipelineLayout = device.createPipelineLayout({
				bindGroupLayouts: [renderBindGroupLayout]
			});

			// Create render pipeline with explicit layout
			renderPipeline = device.createRenderPipeline({
				layout: pipelineLayout,
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

		// Initialize vertex and index buffers (will be updated during rendering)
		// Vertex buffer will be created dynamically based on node positions
		vertexBufferDirty = true;
		updateVertexBuffers();
		updateLinkBuffers();
	}

	function updateLinkBuffers(nodePositions?: Float32Array) {
		if (!root || !device || links.length === 0) return;

		// Define vertex schema for links (cylinders)
		const LinkVertexSchema = d.struct({
			position: d.vec3f,
			color: d.vec3f,
			normal: d.vec3f
		});

		const vertexData: any[] = [];
		const indexData: number[] = [];
		let vertexIndex = 0;

		// Generate cylinder vertices for each link
		// Each link is represented as a cylinder with 8 sides
		const cylinderSides = 8;
		const cylinderRadius = 0.5;

		for (const link of links) {
			const sourceNode = nodes[link.source];
			const targetNode = nodes[link.target];
			
			if (!sourceNode || !targetNode) continue;

			// Get node positions from compute shader results or initial positions
			let sourcePos: [number, number, number];
			let targetPos: [number, number, number];
			
			if (nodePositions && link.source < nodes.length && link.target < nodes.length) {
				// Use positions from compute shader
				const sourceIdx = link.source * 3;
				const targetIdx = link.target * 3;
				sourcePos = [
					nodePositions[sourceIdx] || 0,
					nodePositions[sourceIdx + 1] || 0,
					nodePositions[sourceIdx + 2] || 0
				];
				targetPos = [
					nodePositions[targetIdx] || 0,
					nodePositions[targetIdx + 1] || 0,
					nodePositions[targetIdx + 2] || 0
				];
			} else {
				// Fallback to initial positions
				sourcePos = sourceNode.initial || [0, 0, 0];
				targetPos = targetNode.initial || [0, 0, 0];
			}

			const direction = [
				targetPos[0] - sourcePos[0],
				targetPos[1] - sourcePos[1],
				targetPos[2] - sourcePos[2]
			];
			const length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
			if (length < 0.001) continue;

			const dir = [direction[0] / length, direction[1] / length, direction[2] / length] as [number, number, number];
			
			// Find perpendicular vector for cylinder cross-section
			const perp = Math.abs(dir[0]) < 0.9 
				? [1, 0, 0] as [number, number, number]
				: [0, 1, 0] as [number, number, number];
			const cross1 = [
				dir[1] * perp[2] - dir[2] * perp[1],
				dir[2] * perp[0] - dir[0] * perp[2],
				dir[0] * perp[1] - dir[1] * perp[0]
			];
			const crossLen = Math.sqrt(cross1[0] ** 2 + cross1[1] ** 2 + cross1[2] ** 2);
			const u = [cross1[0] / crossLen, cross1[1] / crossLen, cross1[2] / crossLen] as [number, number, number];
			
			const v = [
				dir[1] * u[2] - dir[2] * u[1],
				dir[2] * u[0] - dir[0] * u[2],
				dir[0] * u[1] - dir[1] * u[0]
			] as [number, number, number];

			// Generate cylinder vertices
			const linkColor = link.color ? parseColor(link.color) : [0.3, 0.3, 0.8];
			
			for (let i = 0; i <= cylinderSides; i++) {
				const angle = (i / cylinderSides) * Math.PI * 2;
				const cosAngle = Math.cos(angle);
				const sinAngle = Math.sin(angle);
				
				const offset = [
					u[0] * cosAngle + v[0] * sinAngle,
					u[1] * cosAngle + v[1] * sinAngle,
					u[2] * cosAngle + v[2] * sinAngle
				];
				
				const normal = [offset[0], offset[1], offset[2]] as [number, number, number];
				
				// Start cap
				vertexData.push({
					position: [
						sourcePos[0] + offset[0] * cylinderRadius,
						sourcePos[1] + offset[1] * cylinderRadius,
						sourcePos[2] + offset[2] * cylinderRadius
					] as [number, number, number],
					color: linkColor,
					normal
				});
				
				// End cap
				vertexData.push({
					position: [
						targetPos[0] + offset[0] * cylinderRadius,
						targetPos[1] + offset[1] * cylinderRadius,
						targetPos[2] + offset[2] * cylinderRadius
					] as [number, number, number],
					color: linkColor,
					normal
				});
			}

			// Generate indices for cylinder
			for (let i = 0; i < cylinderSides; i++) {
				const base = vertexIndex + i * 2;
				// First triangle
				indexData.push(base);
				indexData.push(base + 1);
				indexData.push(base + 2);
				// Second triangle
				indexData.push(base + 1);
				indexData.push(base + 3);
				indexData.push(base + 2);
			}

			vertexIndex += (cylinderSides + 1) * 2;
		}

		// Create or update link vertex buffer using TypeGPU
		if (vertexData.length > 0) {
			const LinkVertexArraySchema = d.arrayOf(LinkVertexSchema, vertexData.length);
			if (!linkVertexBuffer) {
				linkVertexBuffer = root.createBuffer(LinkVertexArraySchema).$usage('vertex');
				linkVertexBuffer.compileWriter();
			}
			linkVertexBuffer.write(vertexData);
		}

		// Create or update link index buffer using TypeGPU
		if (indexData.length > 0) {
			const LinkIndexArraySchema = d.arrayOf(d.u16, indexData.length);
			if (!linkIndexBuffer) {
				linkIndexBuffer = root.createBuffer(LinkIndexArraySchema).$usage('index');
				linkIndexBuffer.compileWriter();
			}
			linkIndexBuffer.write(indexData);
		}
	}

	// Generate icosphere mesh (more detailed sphere)
	function generateIcosphere(subdivisions: number = 2): { vertices: Array<[number, number, number]>, indices: number[] } {
		// Initial icosahedron vertices
		const t = (1.0 + Math.sqrt(5.0)) / 2.0;
		const vertices: Array<[number, number, number]> = [
			[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
			[0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
			[t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
		];

		// Normalize vertices to unit sphere
		const normalizedVertices = vertices.map(v => {
			const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
			return [v[0] / len, v[1] / len, v[2] / len] as [number, number, number];
		});

		// Initial icosahedron faces
		const faces: [number, number, number][] = [
			[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
			[1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
			[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
			[4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
		];

		// Subdivide faces
		let currentVertices = normalizedVertices;
		let currentFaces = faces;
		const vertexMap = new Map<string, number>();

		function getMidpoint(v1: [number, number, number], v2: [number, number, number]): [number, number, number] {
			const mid = [
				(v1[0] + v2[0]) / 2,
				(v1[1] + v2[1]) / 2,
				(v1[2] + v2[2]) / 2
			] as [number, number, number];
			const len = Math.sqrt(mid[0] ** 2 + mid[1] ** 2 + mid[2] ** 2);
			return [mid[0] / len, mid[1] / len, mid[2] / len] as [number, number, number];
		}

		function getVertexIndex(v: [number, number, number]): number {
			const key = `${v[0].toFixed(6)},${v[1].toFixed(6)},${v[2].toFixed(6)}`;
			if (!vertexMap.has(key)) {
				vertexMap.set(key, currentVertices.length);
				currentVertices.push(v);
			}
			return vertexMap.get(key)!;
		}

		for (let sub = 0; sub < subdivisions; sub++) {
			const newFaces: [number, number, number][] = [];
			vertexMap.clear();

			for (const face of currentFaces) {
				const v1 = currentVertices[face[0]];
				const v2 = currentVertices[face[1]];
				const v3 = currentVertices[face[2]];

				const m12 = getVertexIndex(getMidpoint(v1, v2));
				const m23 = getVertexIndex(getMidpoint(v2, v3));
				const m31 = getVertexIndex(getMidpoint(v3, v1));

				newFaces.push([face[0], m12, m31]);
				newFaces.push([face[1], m23, m12]);
				newFaces.push([face[2], m31, m23]);
				newFaces.push([m12, m23, m31]);
			}

			currentFaces = newFaces;
		}

		return {
			vertices: currentVertices,
			indices: currentFaces.flat()
		};
	}

	// Track last update to optimize buffer updates
	let lastNodePositions: Float32Array | null = null;
	let lastNodeCount = 0;
	let vertexBufferDirty = true;

	function updateVertexBuffers() {
		if (!root || !device || nodes.length === 0) return;

		// Check if we need to update vertex buffers
		const nodeCountChanged = nodes.length !== lastNodeCount;
		if (!nodeCountChanged && !vertexBufferDirty) {
			return; // Skip update if nothing changed
		}

		// Define vertex schema
		const VertexSchema = d.struct({
			position: d.vec3f,
			color: d.vec3f,
			normal: d.vec3f
		});

		// Generate icosphere template (reuse for all nodes)
		const icosphere = generateIcosphere(2); // 2 subdivisions = ~80 vertices per sphere
		const sphereVertexCount = icosphere.vertices.length;
		const sphereIndexCount = icosphere.indices.length;

		const vertexData: any[] = [];
		const indexData: number[] = [];
		let vertexIndex = 0;

		// Generate vertex data for each node
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const radius = Math.max(1, Math.min(10, 2 + node.scale));
			const baseColor = node.color ? parseColor(node.color) : [0.5, 0.5, 0.5];
			
			// Use icosphere template and scale by radius
			for (const vertex of icosphere.vertices) {
				vertexData.push({
					position: [
						vertex[0] * radius,
						vertex[1] * radius,
						vertex[2] * radius
					] as [number, number, number],
					color: baseColor,
					normal: vertex // Normal is the same as vertex position (normalized)
				});
			}

			// Add indices offset by current vertex index
			for (const index of icosphere.indices) {
				indexData.push(vertexIndex + index);
			}

			vertexIndex += sphereVertexCount;
		}

		// Create or update vertex buffer using TypeGPU
		if (vertexData.length > 0) {
			const VertexArraySchema = d.arrayOf(VertexSchema, vertexData.length);
			if (!vertexBuffer || nodeCountChanged) {
				vertexBuffer = root.createBuffer(VertexArraySchema).$usage('vertex');
				vertexBuffer.compileWriter();
			}
			vertexBuffer.write(vertexData);
		}

		// Create or update index buffer using TypeGPU
		if (indexData.length > 0) {
			const IndexArraySchema = d.arrayOf(d.u16, indexData.length);
			if (!indexBuffer || nodeCountChanged) {
				indexBuffer = root.createBuffer(IndexArraySchema).$usage('index');
				indexBuffer.compileWriter();
			}
			indexBuffer.write(indexData);
		}

		lastNodeCount = nodes.length;
		vertexBufferDirty = false;
	}

	function parseColor(color: string): [number, number, number] {
		// Simple color parser (handles hex colors like #RRGGBB)
		if (color.startsWith('#')) {
			const r = parseInt(color.slice(1, 3), 16) / 255;
			const g = parseInt(color.slice(3, 5), 16) / 255;
			const b = parseInt(color.slice(5, 7), 16) / 255;
			return [r, g, b];
		}
		return [0.5, 0.5, 0.5]; // Default gray
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
		
		// Mark vertex buffer as dirty when node data changes
		// This will trigger vertex buffer update in next render cycle
		vertexBufferDirty = true;
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

	function updateCameraUniforms() {
		if (!cameraUniformBuffer || !context) return;
		
		const aspect = width / height;
		const fov = 45;
		const { view, proj } = createCameraMatrix(
			localCameraPosition,
			cameraTarget,
			fov,
			aspect
		);
		
		cameraUniformBuffer.write({
			view,
			proj
		});
	}

	function updateLightUniforms() {
		if (!lightUniformBuffer) return;
		
		// Default light direction and color
		lightUniformBuffer.write({
			direction: [0, -1, 0] as [number, number, number],
			color: [1, 1, 1] as [number, number, number]
		});
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

			// Update camera and light uniforms (only when camera changes)
			updateCameraUniforms();
			updateLightUniforms();

			// Update vertex buffers only when node positions change significantly
			// Performance optimization: Only update buffers when necessary
			// - When node count changes
			// - When vertex buffer is marked as dirty
			// - Periodically (every N frames) to sync with compute shader results
			const shouldUpdateBuffers = vertexBufferDirty || nodes.length !== lastNodeCount;
			const updateInterval = 10; // Update every 10 frames
			const shouldPeriodicUpdate = renderState.renderCount % updateInterval === 0;
			
			if (shouldUpdateBuffers) {
				updateVertexBuffers();
				updateLinkBuffers();
			} else if (shouldPeriodicUpdate && nodeBuffer) {
				// Periodically update link buffers with latest node positions
				// Note: Reading from GPU is async, so we'll update based on last known positions
				// For full sync, we'd need to read from nodeBuffer asynchronously
				updateLinkBuffers();
			}

			// Render using WebGPU render pipeline
			renderState.isRendering = true;
			renderState.renderCount++;
			renderState.lastRenderTime = Date.now();
			
			// Create render pass
			const renderPass = commandEncoder.beginRenderPass({
				colorAttachments: [{
					view: context.getCurrentTexture().createView(),
					loadOp: 'clear',
					clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
					storeOp: 'store'
				}]
			});

			// Set render pipeline and bind groups
			if (renderPipeline && renderBindGroup) {
				renderPass.setPipeline(renderPipeline);
				// Use WebGPU bind group directly (created with WebGPU API)
				renderPass.setBindGroup(0, renderBindGroup);
				
				// Render links (edges) first (so they appear behind nodes)
				if (linkVertexBuffer && linkIndexBuffer) {
					renderPass.setVertexBuffer(0, linkVertexBuffer.buffer);
					renderPass.setIndexBuffer(linkIndexBuffer.buffer, 'uint16');
					const linkIndexCount = linkIndexBuffer.buffer.size / 2; // uint16 = 2 bytes
					renderPass.drawIndexed(linkIndexCount);
					renderState.linksRendered = links.length;
				}
				
				// Render nodes (spheres)
				if (vertexBuffer && indexBuffer) {
					renderPass.setVertexBuffer(0, vertexBuffer.buffer);
					renderPass.setIndexBuffer(indexBuffer.buffer, 'uint16');
					const indexCount = indexBuffer.buffer.size / 2; // uint16 = 2 bytes
					renderPass.drawIndexed(indexCount);
					renderState.nodesRendered = nodes.length;
				}
			}

			renderPass.end();
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
