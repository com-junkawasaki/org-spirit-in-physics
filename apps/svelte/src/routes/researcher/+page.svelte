<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TimelineVisualization from '$lib/visualization-components/TimelineVisualization.svelte';
	import Force3DWordGraph from '$lib/visualization-components/Force3DWordGraph.svelte';
	import DashboardOverview from '$lib/researcher/components/DashboardOverview.svelte';
	import ParticipantTable from '$lib/researcher/components/ParticipantTable.svelte';
	import FilterPanel from '$lib/researcher/components/FilterPanel.svelte';
	import ExportPanel from '$lib/researcher/components/ExportPanel.svelte';
	import {
		fetchParticipants,
		fetchSessions,
		fetchWordAggregates,
		fetchEmotionVectors,
		fetchTimeline
	} from '$lib/researcher/graphql-client';
	import {
		filterParticipants,
		filterSessions,
		filterTimelineData,
		type ParticipantFilter,
		type SessionFilter,
		type DataFilter
	} from '$lib/researcher/filters';
	import type { WordAggregate, EmotionVector } from '$lib/visualization-components/types';
	
	let allParticipants: any[] = [];
	let participants: any[] = [];
	let selectedParticipant: string = '';
	let selectedSession: string = '';
	let allSessions: any[] = [];
	let sessions: any[] = [];
	let allTimelineData: any[] = [];
	let timelineData: any[] = [];
	let wordAggregates: WordAggregate[] = [];
	let emotionVectors: EmotionVector[] = [];
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	// URLパラメータからタブを取得
	let activeTab = $derived(($page.url.searchParams.get('tab') || 'overview') as 'overview' | 'participants' | 'analysis');
	
	// 統計情報
	let totalSessionsCount = $state(0);
	let totalResponsesCount = $state(0);
	
	// 参加者ごとのセッション情報を保持
	let participantSessionsMap = $state<Map<string, any[]>>(new Map());
	
	let participantFilter: ParticipantFilter = {};
	let sessionFilter: SessionFilter = {};
	let dataFilter: DataFilter = {};
	
	function navigateToTab(tab: 'overview' | 'participants' | 'analysis') {
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}
	
	onMount(async () => {
		try {
			allParticipants = await fetchParticipants();
			await loadAllSessions();
			applyFilters();
			if (participants.length > 0) {
				selectedParticipant = participants[0].id;
				await loadSessions();
			}
			loading = false;
		} catch (err) {
			error = 'データの読み込みに失敗しました';
			loading = false;
		}
	});
	
	async function loadAllSessions() {
		try {
			// すべての参加者のセッションを取得
			const sessionPromises = allParticipants.map((p) => fetchSessions(p.id));
			const sessionArrays = await Promise.all(sessionPromises);
			allSessions = sessionArrays.flat();
			
			// 参加者ごとのセッション情報をMapに格納
			const newMap = new Map<string, any[]>();
			allParticipants.forEach((participant, index) => {
				newMap.set(participant.id, sessionArrays[index] || []);
			});
			participantSessionsMap = newMap;
			
			// 総セッション数を計算
			totalSessionsCount = allSessions.length;
			
			// 総応答数を計算（各セッションのイベント数を合計）
			totalResponsesCount = allSessions.reduce((sum, session) => {
				const responseCount = session.events?.filter((e: any) => e.type === 'word_response' || e.type === 'response').length || 0;
				return sum + responseCount;
			}, 0);
		} catch (err) {
			console.error('Error loading all sessions:', err);
		}
	}
	
	async function loadSessions() {
		if (!selectedParticipant) return;
		allSessions = await fetchSessions(selectedParticipant);
		applyFilters();
		if (sessions.length > 0) {
			selectedSession = sessions[0].id;
			await loadData();
		}
	}
	
	async function loadData() {
		if (!selectedParticipant || !selectedSession) return;
		
		try {
			wordAggregates = await fetchWordAggregates(selectedParticipant, selectedSession);
			emotionVectors = await fetchEmotionVectors(selectedParticipant, selectedSession);
			allTimelineData = await fetchTimeline(selectedParticipant, selectedSession);
			applyFilters();
		} catch (err) {
			console.error('Error loading data:', err);
		}
	}
	
	function applyFilters() {
		participants = filterParticipants(allParticipants, participantFilter);
		sessions = filterSessions(allSessions, sessionFilter);
		timelineData = filterTimelineData(allTimelineData, dataFilter);
	}
	
	function handleParticipantFilterChange(filter: ParticipantFilter) {
		participantFilter = filter;
		applyFilters();
		if (participants.length > 0 && !participants.find((p) => p.id === selectedParticipant)) {
			selectedParticipant = participants[0].id;
			loadSessions();
		}
	}
	
	function handleSessionFilterChange(filter: SessionFilter) {
		sessionFilter = filter;
		applyFilters();
		if (sessions.length > 0 && !sessions.find((s) => s.id === selectedSession)) {
			selectedSession = sessions[0].id;
			loadData();
		}
	}
	
	function handleDataFilterChange(filter: DataFilter) {
		dataFilter = filter;
		applyFilters();
	}
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">研究者ダッシュボード</h1>
	
	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else if error}
		<div class="bg-red-100 dark:bg-red-900 p-4 rounded text-red-800 dark:text-red-200">
			{error}
		</div>
	{:else}
		<div class="space-y-8">
			<!-- Tabs -->
			<div class="border-b border-gray-200 dark:border-gray-700">
				<nav class="flex space-x-8">
					<a
						href="/researcher?tab=overview"
						class="px-4 py-2 border-b-2 {activeTab === 'overview' ? 'border-blue-500' : 'border-transparent'}"
						onclick={(e) => {
							e.preventDefault();
							navigateToTab('overview');
						}}
					>
						概要
					</a>
					<a
						href="/researcher?tab=participants"
						class="px-4 py-2 border-b-2 {activeTab === 'participants' ? 'border-blue-500' : 'border-transparent'}"
						onclick={(e) => {
							e.preventDefault();
							navigateToTab('participants');
						}}
					>
						参加者
					</a>
					<a
						href="/researcher?tab=analysis"
						class="px-4 py-2 border-b-2 {activeTab === 'analysis' ? 'border-blue-500' : 'border-transparent'}"
						onclick={(e) => {
							e.preventDefault();
							navigateToTab('analysis');
						}}
					>
						分析
					</a>
				</nav>
			</div>
			
			<!-- Overview Tab -->
			{#if activeTab === 'overview'}
				<DashboardOverview
					{participants}
					totalSessions={totalSessionsCount}
					totalResponses={totalResponsesCount}
				/>
			{/if}
			
			<!-- Participants Tab -->
			{#if activeTab === 'participants'}
				<div class="space-y-4">
					<ParticipantTable
						{participants}
						participantSessions={participantSessionsMap}
						onSelectParticipant={(id) => {
							selectedParticipant = id;
							loadSessions();
							navigateToTab('analysis');
						}}
					/>
				</div>
			{/if}
			
			<!-- Analysis Tab -->
			{#if activeTab === 'analysis'}
				<div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
					<div class="lg:col-span-3 space-y-4">
						<!-- Participant Selection -->
						<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
							<label class="block mb-2 font-semibold">参加者を選択</label>
							<select
								bind:value={selectedParticipant}
								onchange={loadSessions}
								class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
							>
								<option value="">選択してください</option>
								{#each participants as participant}
									<option value={participant.id}>
										{participant.id} {participant.age ? `(${participant.age}歳)` : ''}
									</option>
								{/each}
							</select>
						</div>
						
						<!-- Session Selection -->
						{#if sessions.length > 0}
							<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
								<label class="block mb-2 font-semibold">セッションを選択</label>
								<select
									bind:value={selectedSession}
									onchange={loadData}
									class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
								>
									<option value="">選択してください</option>
									{#each sessions as session}
										<option value={session.id}>
											セッション {session.sessionIndex || session.id}
										</option>
									{/each}
								</select>
								<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
									<p>選択中の参加者のセッション数: {sessions.length}</p>
								</div>
							</div>
						{/if}
						
						<!-- Statistics Cards -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
								<h3 class="text-lg font-semibold mb-2">セッション回数</h3>
								<p class="text-3xl font-bold">
									{#if selectedParticipant}
										{sessions.length}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
											(選択中の参加者)
										</span>
									{:else}
										{totalSessionsCount}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
											(全体)
										</span>
									{/if}
								</p>
							</div>
							<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
								<h3 class="text-lg font-semibold mb-2">反応回数</h3>
								<p class="text-3xl font-bold">
									{#if selectedSession && wordAggregates.length > 0}
										{wordAggregates.reduce((sum, w) => sum + w.count, 0)}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
											(選択中のセッション)
										</span>
									{:else if selectedParticipant}
										{sessions.reduce((sum, s) => {
											const responseCount = s.events?.filter((e: any) => e.type === 'word_response' || e.type === 'response').length || 0;
											return sum + responseCount;
										}, 0)}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
											(選択中の参加者)
										</span>
									{:else}
										{totalResponsesCount}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
											(全体)
										</span>
									{/if}
								</p>
							</div>
						</div>
						
						<!-- Visualizations -->
						{#if selectedParticipant && selectedSession}
							<div class="space-y-4">
								<!-- Timeline Visualization -->
								<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
									<h2 class="text-2xl font-bold mb-4">タイムライン可視化</h2>
									<div class="w-full" style="min-height: 400px;">
										<TimelineVisualization
											timelinePoints={timelineData}
											participantId={selectedParticipant}
											sessionId={selectedSession}
											width={800}
											height={400}
										/>
									</div>
								</div>
								
								<!-- 3D Force Graph Visualization -->
								<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
									<h2 class="text-2xl font-bold mb-4">3D Force Graph - 単語構造分析</h2>
									<div class="w-full" style="min-height: 600px;">
										{#if wordAggregates.length > 0 && emotionVectors.length > 0}
											<Force3DWordGraph {wordAggregates} {emotionVectors} />
										{:else}
											<div class="flex items-center justify-center p-8 text-gray-500">
												<p>データを読み込み中...</p>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<div class="bg-gray-100 dark:bg-gray-800 p-8 rounded text-center">
								<p class="text-gray-600 dark:text-gray-400">
									参加者とセッションを選択して分析を開始してください
								</p>
							</div>
						{/if}
					</div>
					
					<div class="lg:col-span-1 space-y-4">
						<FilterPanel
							{participantFilter}
							{sessionFilter}
							{dataFilter}
							onParticipantFilterChange={handleParticipantFilterChange}
							onSessionFilterChange={handleSessionFilterChange}
							onDataFilterChange={handleDataFilterChange}
						/>
						<ExportPanel
							{participants}
							{sessions}
							{timelineData}
							{wordAggregates}
							{emotionVectors}
						/>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
