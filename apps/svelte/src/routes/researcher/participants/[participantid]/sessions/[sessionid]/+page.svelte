<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Breadcrumb from '$lib/researcher/components/Breadcrumb.svelte';
	import TimelineVisualizationEnhanced from '$lib/visualization-components/TimelineVisualizationEnhanced.svelte';
	import KPICards from '$lib/visualization-components/KPICards.svelte';
	import { convertTimelinePointToDataPoint } from '$lib/visualization-components/types';
	import {
		fetchParticipants,
		fetchSessions,
		fetchWordAggregates,
		fetchEmotionVectors,
		fetchTimeline
	} from '$lib/researcher/graphql-client';
	import type { WordAggregate, EmotionVector } from '$lib/visualization-components/types';
	
	let participantId = $derived($page.params.participantid);
	let sessionId = $derived($page.params.sessionid);
	let participant = $state<any>(null);
	let session = $state<any>(null);
	let timelineData = $state<any[]>([]);
	let wordAggregates = $state<WordAggregate[]>([]);
	let emotionVectors = $state<EmotionVector[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	// デバッグ状態
	type DebugStatus = 'idle' | 'loading' | 'success' | 'error';
	interface DebugState {
		status: DebugStatus;
		message?: string;
		count?: number;
		error?: string;
		requestTime?: number;
		responseData?: any[];
		details?: Record<string, any>;
		lastUpdated?: Date;
	}
	
	let debugState = $state<{
		participant: DebugState;
		session: DebugState;
		wordAggregates: DebugState;
		emotionVectors: DebugState;
		timeline: DebugState;
		force3dRender: {
			webgpuSupported: boolean;
			webgpuInitialized: boolean;
			canvas2dFallback: boolean;
			canvas2dContextObtained: boolean;
			renderCount: number;
			lastRenderTime: number | null;
			errors: string[];
			nodesRendered: number;
			linksRendered: number;
			isRendering: boolean;
		};
		timelineRender: {
			canvasContextObtained: boolean;
			pointsRendered: number;
			lastRenderTime: number | null;
			errors: string[];
		};
	}>({
		participant: { status: 'idle' },
		session: { status: 'idle' },
		wordAggregates: { status: 'idle' },
		emotionVectors: { status: 'idle' },
		timeline: { status: 'idle' },
		force3dRender: {
			webgpuSupported: false,
			webgpuInitialized: false,
			canvas2dFallback: false,
			canvas2dContextObtained: false,
			renderCount: 0,
			lastRenderTime: null,
			errors: [],
			nodesRendered: 0,
			linksRendered: 0,
			isRendering: false
		},
		timelineRender: {
			canvasContextObtained: false,
			pointsRendered: 0,
			lastRenderTime: null,
			errors: []
		}
	});
	
	// 展開状態
	let expandedSections = $state<Set<string>>(new Set());
	
	function toggleSection(section: string) {
		const newSet = new Set(expandedSections);
		if (newSet.has(section)) {
			newSet.delete(section);
		} else {
			newSet.add(section);
		}
		expandedSections = newSet;
	}
	
	onMount(async () => {
		// SSR回避: ブラウザでのみ実行
		if (!browser) return;
		
		if (!participantId || !sessionId) {
			error = '参加者IDまたはセッションIDが指定されていません';
			loading = false;
			return;
		}
		
		try {
			// 参加者情報を取得
			debugState.participant = { status: 'loading', message: '参加者情報を読み込み中...', lastUpdated: new Date() };
			const allParticipants = await fetchParticipants();
			participant = allParticipants.find((p) => p.id === participantId);
			
			if (!participant) {
				error = `参加者ID ${participantId} が見つかりません`;
				debugState.participant = {
					status: 'error',
					message: '参加者が見つかりません',
					error: `Participant ID: ${participantId}`
				};
				loading = false;
				return;
			}
			
			debugState.participant = {
				status: 'success',
				message: '参加者情報の読み込み完了',
				lastUpdated: new Date()
			};
			
			// セッション情報を取得
			debugState.session = { status: 'loading', message: 'セッション情報を読み込み中...', lastUpdated: new Date() };
			const sessions = await fetchSessions(participantId);
			session = sessions.find((s) => s.id === sessionId);
			
			if (!session) {
				error = `セッションID ${sessionId} が見つかりません`;
				debugState.session = {
					status: 'error',
					message: 'セッションが見つかりません',
					error: `Session ID: ${sessionId}`
				};
				loading = false;
				return;
			}
			
			debugState.session = {
				status: 'success',
				message: 'セッション情報の読み込み完了',
				lastUpdated: new Date()
			};
			
			// データを読み込み
			await loadData();
			
			loading = false;
		} catch (err: any) {
			error = 'データの読み込みに失敗しました';
			debugState.participant = {
				status: 'error',
				message: 'データの読み込みに失敗',
				error: err?.message || String(err)
			};
			console.error('Error loading data:', err);
			loading = false;
		}
	});
	
	async function loadData() {
		if (!participantId || !sessionId) {
			return;
		}
		
		try {
			// Word Aggregates
			const waStartTime = Date.now();
			debugState.wordAggregates = { 
				status: 'loading', 
				message: '単語集計データを読み込み中...',
				requestParams: { participantId, sessionId },
				lastUpdated: new Date()
			};
			wordAggregates = await fetchWordAggregates(participantId, sessionId);
			const waRequestTime = Date.now() - waStartTime;
			debugState.wordAggregates = {
				status: wordAggregates.length > 0 ? 'success' : 'error',
				message: wordAggregates.length > 0 
					? `単語集計データの読み込み完了 (${wordAggregates.length}件)`
					: '単語集計データが取得できませんでした',
				count: wordAggregates.length,
				requestTime: waRequestTime,
				responseData: wordAggregates,
				lastUpdated: new Date()
			};
			
			// Emotion Vectors
			const evStartTime = Date.now();
			debugState.emotionVectors = { 
				status: 'loading', 
				message: '感情ベクトルデータを読み込み中...',
				requestParams: { participantId, sessionId },
				lastUpdated: new Date()
			};
			emotionVectors = await fetchEmotionVectors(participantId, sessionId);
			const evRequestTime = Date.now() - evStartTime;
			debugState.emotionVectors = {
				status: emotionVectors.length > 0 ? 'success' : 'error',
				message: emotionVectors.length > 0
					? `感情ベクトルデータの読み込み完了 (${emotionVectors.length}件)`
					: '感情ベクトルデータが取得できませんでした',
				count: emotionVectors.length,
				requestTime: evRequestTime,
				responseData: emotionVectors,
				lastUpdated: new Date()
			};
			
			// Timeline
			const tlStartTime = Date.now();
			debugState.timeline = { 
				status: 'loading', 
				message: 'タイムラインデータを読み込み中...',
				requestParams: { participantId, sessionId },
				lastUpdated: new Date()
			};
			timelineData = await fetchTimeline(participantId, sessionId);
			const tlRequestTime = Date.now() - tlStartTime;
			debugState.timeline = {
				status: timelineData.length > 0 ? 'success' : 'error',
				message: timelineData.length > 0
					? `タイムラインデータの読み込み完了 (${timelineData.length}件)`
					: 'タイムラインデータが取得できませんでした',
				count: timelineData.length,
				requestTime: tlRequestTime,
				responseData: timelineData,
				lastUpdated: new Date()
			};
		} catch (err: any) {
			debugState.wordAggregates = {
				status: 'error',
				message: 'データの読み込みに失敗',
				error: err?.message || String(err)
			};
			debugState.emotionVectors = {
				status: 'error',
				message: 'データの読み込みに失敗',
				error: err?.message || String(err)
			};
			debugState.timeline = {
				status: 'error',
				message: 'データの読み込みに失敗',
				error: err?.message || String(err)
			};
			console.error('Error loading data:', err);
		}
	}
</script>

<div class="container mx-auto p-8">
	<Breadcrumb items={[
		{ label: '研究者', href: '/researcher' },
		{ label: participant?.id || participantId || '参加者', href: participantId ? `/researcher/participants/${participantId}` : undefined },
		{ label: session?.sessionIndex ? `セッション ${session.sessionIndex}` : sessionId || 'セッション' }
	]} />
	
	<h1 class="text-4xl font-bold mb-8">分析詳細</h1>
	
	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else if error}
		<div class="bg-red-100 dark:bg-red-900 p-4 rounded text-red-800 dark:text-red-200">
			{error}
		</div>
	{:else if participant && session}
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
			<div class="lg:col-span-3 space-y-4">
				<!-- Session Info -->
				<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
					<h2 class="text-2xl font-bold mb-4">セッション情報</h2>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<span class="text-sm font-semibold text-gray-600 dark:text-gray-400">セッション番号</span>
							<p class="text-lg">{session.sessionIndex ?? '-'}</p>
						</div>
						<div>
							<span class="text-sm font-semibold text-gray-600 dark:text-gray-400">開始時刻</span>
							<p class="text-lg">
								{#if session.startTs}
									{new Date(session.startTs).toLocaleString()}
								{:else}
									-
								{/if}
							</p>
						</div>
						<div>
							<span class="text-sm font-semibold text-gray-600 dark:text-gray-400">終了時刻</span>
							<p class="text-lg">
								{#if session.endTs}
									{new Date(session.endTs).toLocaleString()}
								{:else}
									-
								{/if}
							</p>
						</div>
					</div>
				</div>
				
				<!-- Visualizations -->
				{#if timelineData.length > 0 || wordAggregates.length > 0}
					<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
						<h2 class="text-2xl font-bold mb-4">可視化分析</h2>
						<div class="w-full" style="min-height: 600px;">
							<TimelineVisualizationEnhanced
								timelinePoints={timelineData}
								participantId={participantId}
								sessionId={sessionId}
								wordAggregates={wordAggregates}
								emotionVectors={emotionVectors}
								width={1200}
								height={600}
								onForce3DRenderStateChange={(state) => {
									debugState.force3dRender = { ...state };
								}}
								onTimelineRenderStateChange={(state) => {
									debugState.timelineRender = { ...state };
								}}
							/>
						</div>
					</div>
					
					<!-- KPI Cards -->
					{#if timelineData.length > 0}
						<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
							<h2 class="text-2xl font-bold mb-4">KPI サマリー</h2>
							<KPICards data={timelineData.map(convertTimelinePointToDataPoint)} />
						</div>
					{/if}
				{:else}
					<div class="bg-gray-100 dark:bg-gray-800 p-8 rounded text-center">
						<p class="text-gray-600 dark:text-gray-400">
							データがありません
						</p>
					</div>
				{/if}
			</div>
			
			<div class="lg:col-span-1 space-y-4">
				<!-- Debug Panel -->
				<div class="bg-white dark:bg-gray-800 p-4 rounded shadow border-2 border-blue-500">
					<h2 class="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">デバッグパネル</h2>
					<div class="space-y-3 text-sm">
						<!-- Participant Status -->
						<div class="border-b pb-2">
							<div class="flex items-center justify-between mb-1">
								<span class="font-semibold">参加者</span>
								<span class="px-2 py-1 rounded text-xs {
									debugState.participant.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
									debugState.participant.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
									debugState.participant.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
									'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
								}">
									{debugState.participant.status === 'success' ? '✓' :
									 debugState.participant.status === 'error' ? '✗' :
									 debugState.participant.status === 'loading' ? '...' : '○'}
								</span>
							</div>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{debugState.participant.message || '待機中'}
							</div>
						</div>
						
						<!-- Session Status -->
						<div class="border-b pb-2">
							<div class="flex items-center justify-between mb-1">
								<span class="font-semibold">セッション</span>
								<span class="px-2 py-1 rounded text-xs {
									debugState.session.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
									debugState.session.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
									debugState.session.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
									'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
								}">
									{debugState.session.status === 'success' ? '✓' :
									 debugState.session.status === 'error' ? '✗' :
									 debugState.session.status === 'loading' ? '...' : '○'}
								</span>
							</div>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{debugState.session.message || '待機中'}
							</div>
						</div>
						
						<!-- Word Aggregates Status -->
						<div class="border-b pb-2">
							<button type="button" class="flex items-center justify-between mb-1 cursor-pointer w-full text-left" onclick={() => toggleSection('wordAggregates')} onkeydown={(e) => e.key === 'Enter' && toggleSection('wordAggregates')} role="button" tabindex="0">
								<span class="font-semibold">単語集計</span>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 rounded text-xs {
										debugState.wordAggregates.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
										debugState.wordAggregates.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
										debugState.wordAggregates.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
										'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
									}">
										{debugState.wordAggregates.status === 'success' ? '✓' :
										 debugState.wordAggregates.status === 'error' ? '✗' :
										 debugState.wordAggregates.status === 'loading' ? '...' : '○'}
									</span>
									<span class="text-xs">{expandedSections.has('wordAggregates') ? '▼' : '▶'}</span>
								</div>
							</button>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{debugState.wordAggregates.message || '待機中'}
							</div>
							{#if debugState.wordAggregates.count !== undefined}
								<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
									数: {debugState.wordAggregates.count}
								</div>
							{/if}
							{#if expandedSections.has('wordAggregates') && debugState.wordAggregates.responseData}
								<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 text-xs">
									<pre class="p-1 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">{JSON.stringify(debugState.wordAggregates.responseData, null, 2)}</pre>
								</div>
							{/if}
						</div>
						
						<!-- Emotion Vectors Status -->
						<div class="border-b pb-2">
							<button type="button" class="flex items-center justify-between mb-1 cursor-pointer w-full text-left" onclick={() => toggleSection('emotionVectors')} onkeydown={(e) => e.key === 'Enter' && toggleSection('emotionVectors')} role="button" tabindex="0">
								<span class="font-semibold">感情ベクトル</span>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 rounded text-xs {
										debugState.emotionVectors.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
										debugState.emotionVectors.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
										debugState.emotionVectors.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
										'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
									}">
										{debugState.emotionVectors.status === 'success' ? '✓' :
										 debugState.emotionVectors.status === 'error' ? '✗' :
										 debugState.emotionVectors.status === 'loading' ? '...' : '○'}
									</span>
									<span class="text-xs">{expandedSections.has('emotionVectors') ? '▼' : '▶'}</span>
								</div>
							</button>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{debugState.emotionVectors.message || '待機中'}
							</div>
							{#if debugState.emotionVectors.count !== undefined}
								<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
									数: {debugState.emotionVectors.count}
								</div>
							{/if}
							{#if expandedSections.has('emotionVectors') && debugState.emotionVectors.responseData}
								<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 text-xs">
									<pre class="p-1 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">{JSON.stringify(debugState.emotionVectors.responseData, null, 2)}</pre>
								</div>
							{/if}
						</div>
						
						<!-- Timeline Status -->
						<div>
							<button type="button" class="flex items-center justify-between mb-1 cursor-pointer w-full text-left" onclick={() => toggleSection('timeline')} onkeydown={(e) => e.key === 'Enter' && toggleSection('timeline')} role="button" tabindex="0">
								<span class="font-semibold">タイムライン</span>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 rounded text-xs {
										debugState.timeline.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
										debugState.timeline.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
										debugState.timeline.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
										'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
									}">
										{debugState.timeline.status === 'success' ? '✓' :
										 debugState.timeline.status === 'error' ? '✗' :
										 debugState.timeline.status === 'loading' ? '...' : '○'}
									</span>
									<span class="text-xs">{expandedSections.has('timeline') ? '▼' : '▶'}</span>
								</div>
							</button>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{debugState.timeline.message || '待機中'}
							</div>
							{#if debugState.timeline.count !== undefined}
								<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
									数: {debugState.timeline.count}
								</div>
							{/if}
							{#if expandedSections.has('timeline') && debugState.timeline.responseData}
								<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 text-xs">
									<pre class="p-1 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">{JSON.stringify(debugState.timeline.responseData, null, 2)}</pre>
								</div>
							{/if}
						</div>
						
						<!-- 3D Force Graph Rendering Status -->
						<div class="border-b pb-2">
							<button type="button" class="flex items-center justify-between mb-1 cursor-pointer w-full text-left" onclick={() => toggleSection('force3dRender')} onkeydown={(e) => e.key === 'Enter' && toggleSection('force3dRender')} role="button" tabindex="0">
								<span class="font-semibold">3D Force Graph レンダリング</span>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 rounded text-xs {
										debugState.force3dRender.canvas2dContextObtained && debugState.force3dRender.renderCount > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
										debugState.force3dRender.errors.length > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
										'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
									}">
										{debugState.force3dRender.canvas2dContextObtained && debugState.force3dRender.renderCount > 0 ? '✓' :
										 debugState.force3dRender.errors.length > 0 ? '✗' : '○'}
									</span>
									<span class="text-xs">{expandedSections.has('force3dRender') ? '▼' : '▶'}</span>
								</div>
							</button>
							<div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
								<div>WebGPU対応: {debugState.force3dRender.webgpuSupported ? '✓' : '✗'}</div>
								<div>WebGPU初期化: {debugState.force3dRender.webgpuInitialized ? '✓' : '✗'}</div>
								<div>Canvas 2D フォールバック: {debugState.force3dRender.canvas2dFallback ? '✓' : '✗'}</div>
								<div>Canvas 2D コンテキスト取得: {debugState.force3dRender.canvas2dContextObtained ? '✓' : '✗'}</div>
								<div>レンダリング回数: {debugState.force3dRender.renderCount}</div>
								<div>レンダリング中: {debugState.force3dRender.isRendering ? 'はい' : 'いいえ'}</div>
								<div>ノード描画数: {debugState.force3dRender.nodesRendered}</div>
								<div>リンク描画数: {debugState.force3dRender.linksRendered}</div>
								{#if debugState.force3dRender.errors.length > 0}
									<div class="text-red-600 dark:text-red-400">
										エラー: {debugState.force3dRender.errors.slice(-3).join(', ')}
									</div>
								{/if}
							</div>
						</div>
						
						<!-- Timeline Rendering Status -->
						<div>
							<button type="button" class="flex items-center justify-between mb-1 cursor-pointer w-full text-left" onclick={() => toggleSection('timelineRender')} onkeydown={(e) => e.key === 'Enter' && toggleSection('timelineRender')} role="button" tabindex="0">
								<span class="font-semibold">Timeline レンダリング</span>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 rounded text-xs {
										debugState.timelineRender.canvasContextObtained && debugState.timelineRender.pointsRendered > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
										debugState.timelineRender.errors.length > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
										'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
									}">
										{debugState.timelineRender.canvasContextObtained && debugState.timelineRender.pointsRendered > 0 ? '✓' :
										 debugState.timelineRender.errors.length > 0 ? '✗' : '○'}
									</span>
									<span class="text-xs">{expandedSections.has('timelineRender') ? '▼' : '▶'}</span>
								</div>
							</button>
							<div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
								<div>Canvas コンテキスト取得: {debugState.timelineRender.canvasContextObtained ? '✓' : '✗'}</div>
								<div>ポイント描画数: {debugState.timelineRender.pointsRendered}</div>
								{#if debugState.timelineRender.errors.length > 0}
									<div class="text-red-600 dark:text-red-400">
										エラー: {debugState.timelineRender.errors.slice(-3).join(', ')}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

