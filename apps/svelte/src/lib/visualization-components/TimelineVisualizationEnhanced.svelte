<script lang="ts">
	import { browser } from '$app/environment';
	import TimelineChart from './timeline/TimelineChart.svelte';
	import KPICards from './KPICards.svelte';
	import Force3DControls from './Force3DControls.svelte';
	import StructureAnalysisPanel from './StructureAnalysisPanel.svelte';
	import Force3DWordGraph from './Force3DWordGraph.svelte';
	import { convertTimelinePointToDataPoint } from './types';
	import { detectGapAreas, analyzeDensity, detectDuplicates } from './lib/structure-analysis';
	import type {
		TimelinePoint,
		TimelineDataPoint,
		VisualizationMode,
		FilterSettings,
		TimeRange,
		WordAggregate,
		EmotionVector,
		WordNode,
		ForcePreset
	} from './types';

	const {
		participantId = '',
		sessionId = '',
		timelinePoints = [],
		wordAggregates: wordAggregatesProp = [],
		emotionVectors: emotionVectorsProp = [],
		width = 1200,
		height = 600,
		forceMode = undefined as VisualizationMode | undefined,
		hideFilters = false
	}: {
		participantId?: string;
		sessionId?: string;
		timelinePoints?: TimelinePoint[];
		wordAggregates?: WordAggregate[];
		emotionVectors?: EmotionVector[];
		width?: number;
		height?: number;
		forceMode?: VisualizationMode;
		hideFilters?: boolean;
	} = $props();

	// 可視化モード
	let visualizationMode = $state<VisualizationMode>(forceMode || 'timeline');

	// タイムラインデータをTimelineDataPointに変換
	let timelineDataPoints = $derived(
		timelinePoints.map(convertTimelinePointToDataPoint).filter(
			(d): d is TimelineDataPoint => d.timestamp != null && !isNaN(d.timestamp)
		)
	);

	// フィルター設定
	let filters = $state<FilterSettings>({
		emotions: true,
		physiological: true,
		reactionValues: true,
		wordDisplay: true,
		reactionTime: true,
		physiologicalThreshold: true,
		emotionChange: true,
		range: 200,
		timeScale: 1.0,
		verticalScale: 1.0,
		showEmotionDetails: true,
		showWordLabels: true
	});

	// 時間範囲
	let timeRange = $state<TimeRange | null>(null);

	// 3D Force Graph用のパラメータ
	let forcePresets: ForcePreset[] = [
		{
			id: 'balanced',
			label: 'Balanced',
			springK: 1.0,
			repulsionK: 2000,
			restLength: 80,
			damping: 0.95,
			emoWeak: 0.5,
			emoStrong: 1.5,
			emoGain: 1.0
		},
		{
			id: 'tight',
			label: 'Tight',
			springK: 2.0,
			repulsionK: 3000,
			restLength: 60,
			damping: 0.97,
			emoWeak: 0.3,
			emoStrong: 2.0,
			emoGain: 1.2
		},
		{
			id: 'loose',
			label: 'Loose',
			springK: 0.5,
			repulsionK: 1000,
			restLength: 120,
			damping: 0.92,
			emoWeak: 0.7,
			emoStrong: 1.0,
			emoGain: 0.8
		},
		{
			id: 'slow',
			label: 'Slow',
			springK: 0.8,
			repulsionK: 1500,
			restLength: 100,
			damping: 0.98,
			emoWeak: 0.6,
			emoStrong: 1.3,
			emoGain: 0.9
		}
	];

	let forcePresetId = $state('balanced');
	let springK = $state(1.0);
	let repulsionK = $state(2000);
	let restLength = $state(80);
	let minSep = $state(30);
	let sepK = $state(3000);
	let shellRadius = $state(300);
	let shellK = $state(1.0);
	let radialOutK = $state(0);
	let damping = $state(0.95);
	let alpha = $state(1.0);
	let gamma = $state(1.0);
	let lambda = $state(1.0);
	let eta = $state(1.0);

	// 構造分析結果
	let gapAreas = $state<any[]>([]);
	let densityRegions = $state<any[]>([]);
	let duplicates = $state<any[]>([]);
	let overallDensity = $state(0);

	// プリセット変更ハンドラー
	function handlePresetChange(id: string) {
		const preset = forcePresets.find((p) => p.id === id);
		if (preset) {
			forcePresetId = id;
			springK = preset.springK;
			repulsionK = preset.repulsionK;
			restLength = preset.restLength;
			damping = preset.damping;
		}
	}

	// 構造分析の実行
	$effect(() => {
		if (browser && wordAggregatesProp && wordAggregatesProp.length > 0 && emotionVectorsProp && emotionVectorsProp.length > 0) {
			// ノードとリンクを生成（簡易版）
			const nodes: WordNode[] = wordAggregatesProp.map((agg, idx) => ({
				id: String(idx),
				label: agg.word,
				scale: 1.0,
				initial: [
					Math.random() * 500 - 250,
					Math.random() * 500 - 250,
					Math.random() * 500 - 250
				] as [number, number, number]
			}));

			const emotionVectorsMap: Record<string, number[]> = {};
			emotionVectorsProp.forEach((vec) => {
				emotionVectorsMap[vec.word] = [
					vec.joySum || 0,
					vec.sadnessSum || 0,
					vec.angerSum || 0,
					vec.fearSum || 0,
					vec.surpriseSum || 0,
					vec.disgustSum || 0,
					vec.calmSum || 0,
					vec.focusSum || 0,
					vec.excitementSum || 0,
					vec.confusionSum || 0
				];
			});

			// 構造分析を実行
			gapAreas = detectGapAreas(nodes, [], emotionVectorsMap, timelineDataPoints);
			densityRegions = analyzeDensity(nodes);
			duplicates = detectDuplicates(nodes, emotionVectorsMap);
			overallDensity = nodes.length > 0 ? nodes.length / (500 * 500 * 500) : 0;
		}
	});

	function handleTimeRangeChange(range: TimeRange | null) {
		timeRange = range;
	}
</script>

<div class="timeline-visualization-enhanced">
	{#if !hideFilters}
		<!-- タブ切り替え -->
		<div class="mb-4 border-b border-gray-200 dark:border-gray-700">
			<nav class="flex space-x-8">
				<button
					type="button"
					onclick={() => (visualizationMode = 'timeline')}
					class="px-4 py-2 border-b-2 {
						visualizationMode === 'timeline'
							? 'border-blue-500 text-blue-600 dark:text-blue-400'
							: 'border-transparent text-gray-500 dark:text-gray-400'
					}"
				>
					タイムライン
				</button>
				<button
					type="button"
					onclick={() => (visualizationMode = 'kpi')}
					class="px-4 py-2 border-b-2 {
						visualizationMode === 'kpi'
							? 'border-blue-500 text-blue-600 dark:text-blue-400'
							: 'border-transparent text-gray-500 dark:text-gray-400'
					}"
				>
					KPI
				</button>
				<button
					type="button"
					onclick={() => (visualizationMode = 'force-3d-typegpu')}
					class="px-4 py-2 border-b-2 {
						visualizationMode === 'force-3d-typegpu'
							? 'border-blue-500 text-blue-600 dark:text-blue-400'
							: 'border-transparent text-gray-500 dark:text-gray-400'
					}"
				>
					3D Force Graph
				</button>
			</nav>
		</div>
	{/if}

	<!-- タイムラインモード -->
	{#if visualizationMode === 'timeline'}
		<div class="space-y-4">
			<TimelineChart
				data={timelineDataPoints}
				{filters}
				{width}
				height={height - 100}
				{timeRange}
				onTimeRangeChange={handleTimeRangeChange}
			/>
		</div>
	{/if}

	<!-- KPIモード -->
	{#if visualizationMode === 'kpi'}
		<div class="space-y-4">
			<KPICards data={timelineDataPoints} />
		</div>
	{/if}

	<!-- 3D Force Graphモード -->
	{#if visualizationMode === 'force-3d-typegpu'}
		<div class="space-y-4">
			{#if wordAggregatesProp && wordAggregatesProp.length > 0 && emotionVectorsProp && emotionVectorsProp.length > 0}
				<!-- 3D Force Graph Controls -->
				<Force3DControls
					{forcePresets}
					{forcePresetId}
					onPresetChange={handlePresetChange}
					{springK}
					onSpringKChange={(v) => (springK = v)}
					{repulsionK}
					onRepulsionKChange={(v) => (repulsionK = v)}
					{restLength}
					onRestLengthChange={(v) => (restLength = v)}
					{minSep}
					onMinSepChange={(v) => (minSep = v)}
					{sepK}
					onSepKChange={(v) => (sepK = v)}
					{shellRadius}
					onShellRadiusChange={(v) => (shellRadius = v)}
					{shellK}
					onShellKChange={(v) => (shellK = v)}
					{radialOutK}
					onRadialOutKChange={(v) => (radialOutK = v)}
					{damping}
					onDampingChange={(v) => (damping = v)}
					{alpha}
					onAlphaChange={(v) => (alpha = v)}
					{gamma}
					onGammaChange={(v) => (gamma = v)}
					{lambda}
					onLambdaChange={(v) => (lambda = v)}
					{eta}
					onEtaChange={(v) => (eta = v)}
				/>

				<!-- 3D Force Graph -->
				<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
					<Force3DWordGraph
						wordAggregates={wordAggregatesProp}
						emotionVectors={emotionVectorsProp}
					/>
				</div>

				<!-- Structure Analysis Panel -->
				<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
					<h3 class="text-xl font-bold mb-4">構造分析</h3>
					<StructureAnalysisPanel
						{gapAreas}
						{densityRegions}
						{duplicates}
						{overallDensity}
					/>
				</div>
			{:else}
				<div class="bg-gray-100 dark:bg-gray-800 p-8 rounded text-center">
					<p class="text-gray-600 dark:text-gray-400">
						単語集計データと感情ベクトルデータが必要です
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.timeline-visualization-enhanced {
		width: 100%;
	}
</style>

