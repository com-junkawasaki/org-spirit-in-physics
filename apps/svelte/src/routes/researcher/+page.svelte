<script lang="ts">
	import { onMount } from 'svelte';
	import TimelineVisualization from '$lib/visualization-components/TimelineVisualization.svelte';
	import Force3DWordGraph from '$lib/visualization-components/Force3DWordGraph.svelte';
	import DashboardOverview from '$lib/researcher/components/DashboardOverview.svelte';
	import ParticipantTable from '$lib/researcher/components/ParticipantTable.svelte';
	import {
		fetchParticipants,
		fetchSessions,
		fetchWordAggregates,
		fetchEmotionVectors,
		fetchTimeline
	} from '$lib/researcher/graphql-client';
	import type { WordAggregate, EmotionVector } from '$lib/visualization-components/types';
	
	let participants: any[] = [];
	let selectedParticipant: string = '';
	let selectedSession: string = '';
	let sessions: any[] = [];
	let timelineData: any[] = [];
	let wordAggregates: WordAggregate[] = [];
	let emotionVectors: EmotionVector[] = [];
	let loading = true;
	let error: string | null = null;
	let activeTab: 'overview' | 'participants' | 'analysis' = 'overview';
	
	onMount(async () => {
		try {
			participants = await fetchParticipants();
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
	
	async function loadSessions() {
		if (!selectedParticipant) return;
		sessions = await fetchSessions(selectedParticipant);
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
			timelineData = await fetchTimeline(selectedParticipant, selectedSession);
		} catch (err) {
			console.error('Error loading data:', err);
		}
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
					<button
						class="px-4 py-2 border-b-2 {activeTab === 'overview' ? 'border-primary' : 'border-transparent'}"
						onclick={() => (activeTab = 'overview')}
					>
						概要
					</button>
					<button
						class="px-4 py-2 border-b-2 {activeTab === 'participants' ? 'border-primary' : 'border-transparent'}"
						onclick={() => (activeTab = 'participants')}
					>
						参加者
					</button>
					<button
						class="px-4 py-2 border-b-2 {activeTab === 'analysis' ? 'border-primary' : 'border-transparent'}"
						onclick={() => (activeTab = 'analysis')}
					>
						分析
					</button>
				</nav>
			</div>
			
			<!-- Overview Tab -->
			{#if activeTab === 'overview'}
				<DashboardOverview
					{participants}
					totalSessions={sessions.length}
					totalResponses={wordAggregates.reduce((sum, w) => sum + w.count, 0)}
				/>
			{/if}
			
			<!-- Participants Tab -->
			{#if activeTab === 'participants'}
				<div class="space-y-4">
					<ParticipantTable
						{participants}
						onSelectParticipant={(id) => {
							selectedParticipant = id;
							loadSessions();
							activeTab = 'analysis';
						}}
					/>
				</div>
			{/if}
			
			<!-- Analysis Tab -->
			{#if activeTab === 'analysis'}
				<div class="space-y-4">
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
						</div>
					{/if}
					
					<!-- Visualizations -->
					{#if selectedParticipant && selectedSession}
						<div class="space-y-4">
							<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
								<h2 class="text-2xl font-bold mb-4">タイムライン可視化</h2>
								<TimelineVisualization
									timelinePoints={timelineData}
									participantId={selectedParticipant}
									sessionId={selectedSession}
								/>
							</div>
							
							<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
								<h2 class="text-2xl font-bold mb-4">3D Force Graph</h2>
								<Force3DWordGraph {wordAggregates} {emotionVectors} />
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
			{/if}
		</div>
	{/if}
</div>
