<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DashboardOverview from '$lib/researcher/components/DashboardOverview.svelte';
	import ParticipantTable from '$lib/researcher/components/ParticipantTable.svelte';
	import Breadcrumb from '$lib/researcher/components/Breadcrumb.svelte';
	import {
		fetchParticipants,
		fetchSessions
	} from '$lib/researcher/graphql-client';
	import {
		filterParticipants,
		type ParticipantFilter
	} from '$lib/researcher/filters';
	
	let allParticipants: any[] = [];
	let participants: any[] = [];
	let allSessions: any[] = [];
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	// 統計情報
	let totalSessionsCount = $state(0);
	let totalResponsesCount = $state(0);
	
	// 参加者ごとのセッション情報を保持
	let participantSessionsMap = $state<Map<string, any[]>>(new Map());
	
	let participantFilter: ParticipantFilter = {};
	
	// デバッグ状態
	type DebugStatus = 'idle' | 'loading' | 'success' | 'error';
	interface DebugState {
		status: DebugStatus;
		message?: string;
		count?: number;
		error?: string;
		requestTime?: number;
		responseSample?: any[];
		details?: Record<string, any>;
		lastUpdated?: Date;
	}
	
	let debugState = $state<{
		participants: DebugState;
		sessions: DebugState;
	}>({
		participants: { status: 'idle' },
		sessions: { status: 'idle' }
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
		try {
			console.log('onMount: Starting initialization');
			const startTime = Date.now();
			debugState.participants = { status: 'loading', message: '参加者を読み込み中...', lastUpdated: new Date() };
			allParticipants = await fetchParticipants();
			const requestTime = Date.now() - startTime;
			debugState.participants = {
				status: 'success',
				message: '参加者の読み込み完了',
				count: allParticipants.length,
				requestTime,
				responseSample: allParticipants.slice(0, 3),
				details: {
					ids: allParticipants.map(p => p.id),
					ages: allParticipants.map(p => p.age).filter(a => a != null),
					genders: [...new Set(allParticipants.map(p => p.gender).filter(g => g != null))]
				},
				lastUpdated: new Date()
			};
			console.log('onMount: Participants loaded', allParticipants.length);
			await loadAllSessions();
			applyFilters();
			
			// 既存のURLパラメータベースのリンクをリダイレクト
			const urlParams = new URLSearchParams(window.location.search);
			const tab = urlParams.get('tab');
			const participantId = urlParams.get('participantId');
			
			if (tab === 'analysis' && participantId) {
				// 分析ページにリダイレクト
				goto(`/researcher/participants/${participantId}/sessions/${participantId}`, { replaceState: true });
				return;
			} else if (participantId && !tab) {
				// セッション一覧ページにリダイレクト
				goto(`/researcher/participants/${participantId}`, { replaceState: true });
				return;
			}
			
			loading = false;
		} catch (err: any) {
			error = 'データの読み込みに失敗しました';
			debugState.participants = {
				status: 'error',
				message: '参加者の読み込みに失敗',
				error: err?.message || String(err)
			};
			console.error('Initialization error:', err);
			loading = false;
		}
	});
	
	async function loadAllSessions() {
		try {
			const startTime = Date.now();
			debugState.sessions = { 
				status: 'loading', 
				message: '全セッションを読み込み中...',
				lastUpdated: new Date()
			};
			
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
			
			// 総応答数を計算
			totalResponsesCount = allSessions.reduce((sum, session) => {
				const events = session.events || [];
				const responseCount = events.filter((e: any) => e.type === 'speech_detected').length || 0;
				return sum + responseCount;
			}, 0);
			
			const requestTime = Date.now() - startTime;
			debugState.sessions = {
				status: 'success',
				message: 'セッションの読み込み完了',
				count: allSessions.length,
				requestTime,
				lastUpdated: new Date()
			};
			
			console.log('Total sessions count:', totalSessionsCount);
			console.log('Total responses count:', totalResponsesCount);
		} catch (err: any) {
			debugState.sessions = {
				status: 'error',
				message: 'セッションの読み込みに失敗',
				error: err?.message || String(err)
			};
			console.error('Error loading all sessions:', err);
		}
	}
	
	function applyFilters() {
		participants = filterParticipants(allParticipants, participantFilter);
	}
	
	function handleParticipantFilterChange(filter: ParticipantFilter) {
		participantFilter = filter;
		applyFilters();
	}
</script>

<div class="container mx-auto p-8">
	<Breadcrumb items={[
		{ label: '研究者', href: '/researcher' }
	]} />
	
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
			<!-- Overview -->
			<DashboardOverview
				{participants}
				totalSessions={totalSessionsCount}
				totalResponses={totalResponsesCount}
			/>
			
			<!-- Participants Table -->
			<div class="space-y-4">
				<ParticipantTable
					{participants}
					participantSessions={participantSessionsMap}
					onSelectParticipant={(id) => {
						goto(`/researcher/participants/${id}`);
					}}
				/>
			</div>
			
			<!-- Debug Panel -->
			<div class="bg-white dark:bg-gray-800 p-4 rounded shadow border-2 border-blue-500">
				<h2 class="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">デバッグパネル</h2>
				<div class="space-y-3 text-sm">
					<!-- Participants Status -->
					<div class="border-b pb-2">
						<div class="flex items-center justify-between mb-1">
							<span class="font-semibold">参加者</span>
							<span class="px-2 py-1 rounded text-xs {
								debugState.participants.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
								debugState.participants.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
								debugState.participants.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
								'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
							}">
								{debugState.participants.status === 'success' ? '✓' :
								 debugState.participants.status === 'error' ? '✗' :
								 debugState.participants.status === 'loading' ? '...' : '○'}
							</span>
						</div>
						<div class="text-xs text-gray-600 dark:text-gray-400">
							{debugState.participants.message || '待機中'}
						</div>
						{#if debugState.participants.count !== undefined}
							<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
								数: {debugState.participants.count}
							</div>
						{/if}
						{#if debugState.participants.error}
							<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
								{debugState.participants.error}
							</div>
						{/if}
					</div>
					
					<!-- Sessions Status -->
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="font-semibold">セッション</span>
							<span class="px-2 py-1 rounded text-xs {
								debugState.sessions.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
								debugState.sessions.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
								debugState.sessions.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
								'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
							}">
								{debugState.sessions.status === 'success' ? '✓' :
								 debugState.sessions.status === 'error' ? '✗' :
								 debugState.sessions.status === 'loading' ? '...' : '○'}
							</span>
						</div>
						<div class="text-xs text-gray-600 dark:text-gray-400">
							{debugState.sessions.message || '待機中'}
						</div>
						{#if debugState.sessions.count !== undefined}
							<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
								数: {debugState.sessions.count}
							</div>
						{/if}
						{#if debugState.sessions.error}
							<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
								{debugState.sessions.error}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
					<div class="lg:col-span-3 space-y-4">
						<!-- Participant Selection -->
						<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
							<label class="block mb-2 font-semibold">参加者を選択</label>
							<select
								bind:value={selectedParticipant}
								onchange={() => {
									if (selectedParticipant) {
										navigateToTab('analysis', selectedParticipant);
									} else {
										navigateToTab('analysis');
									}
								}}
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
											const events = s.events || [];
											const responseCount = events.filter((e) => e.type === 'speech_detected').length || 0;
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
								<!-- Enhanced Timeline Visualization with multiple modes -->
								<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
									<h2 class="text-2xl font-bold mb-4">可視化分析</h2>
									<div class="w-full" style="min-height: 600px;">
										<TimelineVisualizationEnhanced
										timelinePoints={timelineData}
										participantId={selectedParticipant}
										sessionId={selectedSession}
											wordAggregates={wordAggregates}
											emotionVectors={emotionVectors}
											width={1200}
											height={600}
									/>
									</div>
								</div>
								
								<!-- KPI Cards (separate section) -->
								{#if timelineData.length > 0}
								<div class="bg-white dark:bg-gray-800 p-4 rounded shadow">
										<h2 class="text-2xl font-bold mb-4">KPI サマリー</h2>
										<KPICards data={timelineData.map(convertTimelinePointToDataPoint)} />
								</div>
								{/if}
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
						<!-- Debug Panel -->
						<div class="bg-white dark:bg-gray-800 p-4 rounded shadow border-2 border-blue-500">
							<h2 class="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">デバッグパネル</h2>
							<div class="space-y-3 text-sm">
								<!-- Participants Status -->
								<div class="border-b pb-2">
									<div class="flex items-center justify-between mb-1">
										<span class="font-semibold">参加者</span>
										<span class="px-2 py-1 rounded text-xs {
											debugState.participants.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
											debugState.participants.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
											debugState.participants.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
											'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
										}">
											{debugState.participants.status === 'success' ? '✓' :
											 debugState.participants.status === 'error' ? '✗' :
											 debugState.participants.status === 'loading' ? '...' : '○'}
										</span>
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400">
										{debugState.participants.message || '待機中'}
									</div>
									{#if debugState.participants.count !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
											数: {debugState.participants.count}
										</div>
									{/if}
									{#if debugState.participants.error}
										<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
											{debugState.participants.error}
										</div>
									{/if}
								</div>
								
								<!-- Sessions Status -->
								<div class="border-b pb-2">
									<div class="flex items-center justify-between mb-1">
										<span class="font-semibold">セッション</span>
										<span class="px-2 py-1 rounded text-xs {
											debugState.sessions.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
											debugState.sessions.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
											debugState.sessions.status === 'loading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
											'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
										}">
											{debugState.sessions.status === 'success' ? '✓' :
											 debugState.sessions.status === 'error' ? '✗' :
											 debugState.sessions.status === 'loading' ? '...' : '○'}
										</span>
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400">
										{debugState.sessions.message || '待機中'}
									</div>
									{#if debugState.sessions.count !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
											数: {debugState.sessions.count}
										</div>
									{/if}
									{#if debugState.sessions.error}
										<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
											{debugState.sessions.error}
										</div>
									{/if}
								</div>
								
								<!-- Word Aggregates Status -->
								<div class="border-b pb-2">
									<div class="flex items-center justify-between mb-1 cursor-pointer" onclick={() => toggleSection('wordAggregates')}>
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
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400">
										{debugState.wordAggregates.message || '待機中'}
									</div>
									{#if debugState.wordAggregates.count !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
											数: {debugState.wordAggregates.count}
										</div>
									{/if}
									{#if debugState.wordAggregates.requestTime !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500">
											リクエスト時間: {debugState.wordAggregates.requestTime}ms
										</div>
									{/if}
									{#if expandedSections.has('wordAggregates')}
										<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 space-y-1 text-xs">
											{#if debugState.wordAggregates.requestParams}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>リクエストパラメータ:</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.wordAggregates.requestParams, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.wordAggregates.responseSample && debugState.wordAggregates.responseSample.length > 0}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>サンプルデータ (最初の3件):</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.wordAggregates.responseSample, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.wordAggregates.details}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>詳細情報:</strong>
													<ul class="mt-1 list-disc list-inside space-y-0.5">
														{#if debugState.wordAggregates.details.words}
															<li>単語: {debugState.wordAggregates.details.words.join(', ')}</li>
														{/if}
														{#if debugState.wordAggregates.details.totalCount !== undefined}
															<li>総カウント: {debugState.wordAggregates.details.totalCount}</li>
														{/if}
														{#if debugState.wordAggregates.details.avgCount !== undefined}
															<li>平均カウント: {debugState.wordAggregates.details.avgCount.toFixed(2)}</li>
														{/if}
													</ul>
												</div>
											{/if}
											{#if debugState.wordAggregates.lastUpdated}
												<div class="text-gray-500 dark:text-gray-500">
													最終更新: {debugState.wordAggregates.lastUpdated.toLocaleTimeString()}
												</div>
											{/if}
										</div>
									{/if}
									{#if debugState.wordAggregates.error}
										<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
											{debugState.wordAggregates.error}
										</div>
									{/if}
								</div>
								
								<!-- Emotion Vectors Status -->
								<div class="border-b pb-2">
									<div class="flex items-center justify-between mb-1 cursor-pointer" onclick={() => toggleSection('emotionVectors')}>
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
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400">
										{debugState.emotionVectors.message || '待機中'}
									</div>
									{#if debugState.emotionVectors.count !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
											数: {debugState.emotionVectors.count}
										</div>
									{/if}
									{#if debugState.emotionVectors.requestTime !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500">
											リクエスト時間: {debugState.emotionVectors.requestTime}ms
										</div>
									{/if}
									{#if expandedSections.has('emotionVectors')}
										<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 space-y-1 text-xs">
											{#if debugState.emotionVectors.requestParams}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>リクエストパラメータ:</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.emotionVectors.requestParams, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.emotionVectors.responseSample && debugState.emotionVectors.responseSample.length > 0}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>サンプルデータ (最初の3件):</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.emotionVectors.responseSample, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.emotionVectors.details}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>詳細情報:</strong>
													<ul class="mt-1 list-disc list-inside space-y-0.5">
														{#if debugState.emotionVectors.details.words}
															<li>単語: {debugState.emotionVectors.details.words.join(', ')}</li>
														{/if}
														{#if debugState.emotionVectors.details.totalEmotionEntries !== undefined}
															<li>総感情エントリ数: {debugState.emotionVectors.details.totalEmotionEntries}</li>
														{/if}
														{#if debugState.emotionVectors.details.wordsWithEmotions !== undefined}
															<li>感情データありの単語数: {debugState.emotionVectors.details.wordsWithEmotions}</li>
														{/if}
													</ul>
												</div>
											{/if}
											{#if debugState.emotionVectors.lastUpdated}
												<div class="text-gray-500 dark:text-gray-500">
													最終更新: {debugState.emotionVectors.lastUpdated.toLocaleTimeString()}
												</div>
											{/if}
										</div>
									{/if}
									{#if debugState.emotionVectors.error}
										<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
											{debugState.emotionVectors.error}
										</div>
									{/if}
								</div>
								
								<!-- Timeline Status -->
								<div>
									<div class="flex items-center justify-between mb-1 cursor-pointer" onclick={() => toggleSection('timeline')}>
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
									</div>
									<div class="text-xs text-gray-600 dark:text-gray-400">
										{debugState.timeline.message || '待機中'}
									</div>
									{#if debugState.timeline.count !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
											数: {debugState.timeline.count}
										</div>
									{/if}
									{#if debugState.timeline.requestTime !== undefined}
										<div class="text-xs text-gray-500 dark:text-gray-500">
											リクエスト時間: {debugState.timeline.requestTime}ms
										</div>
									{/if}
									{#if expandedSections.has('timeline')}
										<div class="mt-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600 space-y-1 text-xs">
											{#if debugState.timeline.requestParams}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>リクエストパラメータ:</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.timeline.requestParams, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.timeline.responseSample && debugState.timeline.responseSample.length > 0}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>サンプルデータ (最初の3件):</strong>
													<pre class="mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">{JSON.stringify(debugState.timeline.responseSample, null, 2)}</pre>
												</div>
											{/if}
											{#if debugState.timeline.details}
												<div class="text-gray-600 dark:text-gray-400">
													<strong>詳細情報:</strong>
													<ul class="mt-1 list-disc list-inside space-y-0.5">
														{#if debugState.timeline.details.uniqueWords && debugState.timeline.details.uniqueWords.length > 0}
															<li>ユニークな単語: {debugState.timeline.details.uniqueWords.join(', ')}</li>
														{/if}
														{#if debugState.timeline.details.eventTypes && debugState.timeline.details.eventTypes.length > 0}
															<li>イベントタイプ: {debugState.timeline.details.eventTypes.join(', ')}</li>
														{/if}
														{#if debugState.timeline.details.timeRange}
															<li>時間範囲: {new Date(debugState.timeline.details.timeRange.first).toLocaleString()} ～ {new Date(debugState.timeline.details.timeRange.last).toLocaleString()}</li>
														{/if}
														{#if debugState.timeline.details.pointsWithEmotions !== undefined}
															<li>感情データありのポイント: {debugState.timeline.details.pointsWithEmotions}</li>
														{/if}
														{#if debugState.timeline.details.pointsWithReactionValue !== undefined}
															<li>反応値ありのポイント: {debugState.timeline.details.pointsWithReactionValue}</li>
														{/if}
													</ul>
												</div>
											{/if}
											{#if debugState.timeline.lastUpdated}
												<div class="text-gray-500 dark:text-gray-500">
													最終更新: {debugState.timeline.lastUpdated.toLocaleTimeString()}
												</div>
											{/if}
										</div>
									{/if}
									{#if debugState.timeline.error}
										<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
											{debugState.timeline.error}
										</div>
									{/if}
								</div>
								
								<!-- Data Consistency Check -->
								<div class="mt-4 pt-4 border-t">
									<div class="text-xs font-semibold mb-2 cursor-pointer" onclick={() => toggleSection('consistency')}>
										データ整合性チェック {expandedSections.has('consistency') ? '▼' : '▶'}
									</div>
									{#if expandedSections.has('consistency')}
										<div class="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-2">
											{#if wordAggregates.length > 0 && emotionVectors.length > 0}
												{@const matchedWords = wordAggregates.filter(w => emotionVectors.some(v => v.word === w.word))}
												{@const unmatchedAggregates = wordAggregates.filter(w => !emotionVectors.some(v => v.word === w.word))}
												{@const unmatchedVectors = emotionVectors.filter(v => !wordAggregates.some(w => w.word === v.word))}
												<div class="text-green-600 dark:text-green-400">
													✓ マッチした単語: {matchedWords.length} / {wordAggregates.length}
												</div>
												{#if unmatchedAggregates.length > 0}
													<div class="text-yellow-600 dark:text-yellow-400">
														⚠ 単語集計のみ: {unmatchedAggregates.map(w => w.word).join(', ')}
													</div>
												{/if}
												{#if unmatchedVectors.length > 0}
													<div class="text-yellow-600 dark:text-yellow-400">
														⚠ 感情ベクトルのみ: {unmatchedVectors.map(v => v.word).join(', ')}
													</div>
												{/if}
											{:else}
												<div class="text-gray-500">データが不足しています</div>
											{/if}
											{#if allTimelineData.length > 0}
												{@const timelineWords = [...new Set(allTimelineData.map(t => t.word))]}
												{@const aggregateWords = wordAggregates.map(w => w.word)}
												{@const commonWords = timelineWords.filter(w => aggregateWords.includes(w))}
												<div class="mt-2">
													<div>タイムラインの単語: {timelineWords.length}件</div>
													<div>単語集計の単語: {aggregateWords.length}件</div>
													<div>共通単語: {commonWords.length}件</div>
													{#if commonWords.length < Math.min(timelineWords.length, aggregateWords.length)}
														<div class="text-yellow-600 dark:text-yellow-400 mt-1">
															⚠ タイムラインと単語集計で単語が一致していません
														</div>
													{/if}
												</div>
											{/if}
										</div>
									{/if}
								</div>
								
								<!-- Current Selection Info -->
								<div class="mt-4 pt-4 border-t">
									<div class="text-xs font-semibold mb-2">現在の選択</div>
									<div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
										<div>参加者: {selectedParticipant || '未選択'}</div>
										<div>セッション: {selectedSession || '未選択'}</div>
									</div>
								</div>
							</div>
						</div>
						
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
