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
	
	// デバッグ状態
	type DebugStatus = 'idle' | 'loading' | 'success' | 'error';
	interface DebugState {
		status: DebugStatus;
		message?: string;
		count?: number;
		error?: string;
		// 詳細情報
		requestTime?: number; // リクエスト時間（ms）
		responseSize?: number; // レスポンスサイズ（bytes）
		requestParams?: Record<string, any>; // リクエストパラメータ
		responseSample?: any[]; // レスポンスのサンプル（最初の3件）
		details?: Record<string, any>; // その他の詳細情報
		lastUpdated?: Date; // 最終更新時刻
	}
	
	let debugState = $state<{
		participants: DebugState;
		sessions: DebugState;
		wordAggregates: DebugState;
		emotionVectors: DebugState;
		timeline: DebugState;
	}>({
		participants: { status: 'idle' },
		sessions: { status: 'idle' },
		wordAggregates: { status: 'idle' },
		emotionVectors: { status: 'idle' },
		timeline: { status: 'idle' }
	});
	
	// 展開状態
	let expandedSections = $state<Set<string>>(new Set());
	
	function toggleSection(section: string) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
		} else {
			expandedSections.add(section);
		}
		expandedSections = expandedSections; // トリガー
	}
	
	function navigateToTab(tab: 'overview' | 'participants' | 'analysis', participantId?: string) {
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		if (participantId) {
			url.searchParams.set('participantId', participantId);
		} else {
			url.searchParams.delete('participantId');
		}
		console.log('navigateToTab: Navigating to', url.toString(), { tab, participantId });
		goto(url.toString(), { replaceState: true, noScroll: true });
		// $effectがURLの変更を検知して、selectedParticipantとloadSessionsを処理する
	}
	
	// URLパラメータの変更を監視（参加者が読み込まれた後）
	$effect(() => {
		// $page.url.searchを追跡して、searchParamsの変更も検知する
		const search = $page.url.search;
		const currentUrl = $page.url;
		
		if (allParticipants.length === 0) {
			console.log('$effect: Waiting for participants to load');
			return; // 参加者が読み込まれるまで待つ
		}
		
		const participantIdFromUrl = currentUrl.searchParams.get('participantId');
		const tabFromUrl = currentUrl.searchParams.get('tab');
		
		console.log('$effect: URL changed', { search, tabFromUrl, participantIdFromUrl, selectedParticipant, allParticipantsLength: allParticipants.length });
		
		// analysisタブでparticipantIdがURLにある場合のみ処理
		if (tabFromUrl === 'analysis' && participantIdFromUrl) {
			if (participantIdFromUrl !== selectedParticipant) {
				const participant = allParticipants.find((p) => p.id === participantIdFromUrl);
				console.log('$effect: Found participant', participant);
				if (participant) {
					console.log('$effect: Setting selectedParticipant and loading sessions');
					selectedParticipant = participantIdFromUrl;
					loadSessions();
				} else {
					console.warn('$effect: Participant not found', participantIdFromUrl);
				}
			} else {
				console.log('$effect: Participant already selected', participantIdFromUrl);
				// 既に選択されているが、セッションが読み込まれていない場合
				if (sessions.length === 0 && selectedParticipant === participantIdFromUrl) {
					console.log('$effect: Participant selected but no sessions, loading...');
					loadSessions();
				}
			}
		} else if (tabFromUrl === 'analysis' && !participantIdFromUrl && selectedParticipant) {
			// URLからparticipantIdが削除された場合、選択をクリア
			console.log('$effect: Clearing selection');
			selectedParticipant = '';
			sessions = [];
			selectedSession = '';
			wordAggregates = [];
			emotionVectors = [];
			allTimelineData = [];
			timelineData = [];
		}
	});
	
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
			
			// URLパラメータからparticipantIdを取得（analysisタブの場合のみ）
			const tabFromUrl = $page.url.searchParams.get('tab');
			const participantIdFromUrl = $page.url.searchParams.get('participantId');
			
			console.log('onMount: URL params', { tabFromUrl, participantIdFromUrl });
			
			if (tabFromUrl === 'analysis' && participantIdFromUrl) {
				const participant = allParticipants.find((p) => p.id === participantIdFromUrl);
				console.log('onMount: Found participant in URL', participant);
				if (participant) {
					selectedParticipant = participantIdFromUrl;
					console.log('onMount: Loading sessions for participant', participantIdFromUrl);
					await loadSessions();
				} else {
					console.warn('onMount: Participant not found in allParticipants', participantIdFromUrl);
					debugState.participants = {
						status: 'error',
						message: '参加者が見つかりません',
						error: `Participant ID: ${participantIdFromUrl}`
					};
				}
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
			
			// デバッグ: イベントタイプを確認
			const allEventTypes = new Set<string>();
			allSessions.forEach((session) => {
				session.events?.forEach((e: any) => {
					if (e.type) allEventTypes.add(e.type);
				});
			});
			console.log('All event types found:', Array.from(allEventTypes).sort());
			
			// 総応答数を計算
			// speech_detectedイベントを反応としてカウント（word_displayedの後にspeech_detectedがある場合）
			totalResponsesCount = allSessions.reduce((sum, session) => {
				const events = session.events || [];
				// speech_detectedイベントを反応としてカウント
				const responseCount = events.filter((e: any) => e.type === 'speech_detected').length || 0;
				return sum + responseCount;
			}, 0);
			
			console.log('Total responses count:', totalResponsesCount);
		} catch (err) {
			console.error('Error loading all sessions:', err);
		}
	}
	
	async function loadSessions() {
		if (!selectedParticipant) {
			console.log('loadSessions: No participant selected');
			debugState.sessions = { status: 'idle', message: '参加者が選択されていません' };
			return;
		}
		try {
			console.log('loadSessions: Fetching sessions for participant', selectedParticipant);
			const startTime = Date.now();
			debugState.sessions = { 
				status: 'loading', 
				message: `参加者 ${selectedParticipant} のセッションを読み込み中...`,
				requestParams: { participantId: selectedParticipant },
				lastUpdated: new Date()
			};
			allSessions = await fetchSessions(selectedParticipant);
			const requestTime = Date.now() - startTime;
			console.log('loadSessions: Sessions fetched', allSessions.length, allSessions);
			applyFilters();
			console.log('loadSessions: Filters applied', { sessionsLength: sessions.length, allSessionsLength: allSessions.length });
			if (sessions.length > 0) {
				selectedSession = sessions[0].id;
				debugState.sessions = {
					status: 'success',
					message: 'セッションの読み込み完了',
					count: sessions.length,
					requestTime,
					responseSample: sessions.slice(0, 3).map(s => ({
						id: s.id,
						sessionIndex: s.sessionIndex,
						startTs: s.startTs,
						endTs: s.endTs,
						eventsCount: s.events?.length || 0
					})),
					details: {
						allSessionsCount: allSessions.length,
						filteredSessionsCount: sessions.length,
						sessionIds: sessions.map(s => s.id),
						eventTypes: [...new Set(allSessions.flatMap(s => s.events?.map((e: any) => e.type) || []).filter(Boolean))]
					},
					lastUpdated: new Date()
				};
				console.log('loadSessions: Selected session', selectedSession, 'Loading data...');
				await loadData();
			} else {
				console.log('loadSessions: No sessions found after filtering');
				debugState.sessions = {
					status: 'error',
					message: 'セッションが見つかりません',
					error: `フィルタ後のセッション数: 0 (全セッション数: ${allSessions.length})`
				};
				selectedSession = '';
				wordAggregates = [];
				emotionVectors = [];
				allTimelineData = [];
				timelineData = [];
			}
		} catch (err: any) {
			debugState.sessions = {
				status: 'error',
				message: 'セッションの読み込みに失敗',
				error: err?.message || String(err)
			};
			console.error('Error loading sessions:', err);
		}
	}
	
	async function loadData() {
		if (!selectedParticipant || !selectedSession) {
			console.log('loadData: Missing participant or session', { selectedParticipant, selectedSession });
			debugState.wordAggregates = { status: 'idle', message: '参加者またはセッションが選択されていません' };
			debugState.emotionVectors = { status: 'idle', message: '参加者またはセッションが選択されていません' };
			debugState.timeline = { status: 'idle', message: '参加者またはセッションが選択されていません' };
			return;
		}
		
		console.log('loadData: Starting to load data', { selectedParticipant, selectedSession });
		
		try {
			// Word Aggregates
			console.log('loadData: Fetching wordAggregates...', { selectedParticipant, selectedSession });
			const waStartTime = Date.now();
			debugState.wordAggregates = { 
				status: 'loading', 
				message: '単語集計データを読み込み中...',
				requestParams: { participantId: selectedParticipant, sessionId: selectedSession },
				lastUpdated: new Date()
			};
			wordAggregates = await fetchWordAggregates(selectedParticipant, selectedSession);
			const waRequestTime = Date.now() - waStartTime;
			console.log('loadData: wordAggregates fetched', {
				count: wordAggregates.length,
				words: wordAggregates.map(w => w.word),
				sample: wordAggregates.slice(0, 3)
			});
			debugState.wordAggregates = {
				status: wordAggregates.length > 0 ? 'success' : 'error',
				message: wordAggregates.length > 0 
					? `単語集計データの読み込み完了 (${wordAggregates.length}件)`
					: '単語集計データが取得できませんでした',
				count: wordAggregates.length,
				requestTime: waRequestTime,
				responseSample: wordAggregates.slice(0, 3).map(w => ({
					word: w.word,
					count: w.count,
					avgReactionValue: w.avgReactionValue,
					avgReactionTime: w.avgReactionTime
				})),
				details: {
					words: wordAggregates.map(w => w.word),
					totalCount: wordAggregates.reduce((sum, w) => sum + (w.count || 0), 0),
					avgCount: wordAggregates.length > 0 ? wordAggregates.reduce((sum, w) => sum + (w.count || 0), 0) / wordAggregates.length : 0
				},
				error: wordAggregates.length === 0 ? 'データが空です' : undefined,
				lastUpdated: new Date()
			};
			
			// Emotion Vectors
			console.log('loadData: Fetching emotionVectors...', { selectedParticipant, selectedSession });
			const evStartTime = Date.now();
			debugState.emotionVectors = { 
				status: 'loading', 
				message: '感情ベクトルデータを読み込み中...',
				requestParams: { participantId: selectedParticipant, sessionId: selectedSession },
				lastUpdated: new Date()
			};
			emotionVectors = await fetchEmotionVectors(selectedParticipant, selectedSession);
			const evRequestTime = Date.now() - evStartTime;
			console.log('loadData: emotionVectors fetched', {
				count: emotionVectors.length,
				words: emotionVectors.map(v => v.word),
				sample: emotionVectors.slice(0, 3)
			});
			debugState.emotionVectors = {
				status: emotionVectors.length > 0 ? 'success' : 'error',
				message: emotionVectors.length > 0
					? `感情ベクトルデータの読み込み完了 (${emotionVectors.length}件)`
					: '感情ベクトルデータが取得できませんでした',
				count: emotionVectors.length,
				requestTime: evRequestTime,
				responseSample: emotionVectors.slice(0, 3).map(v => ({
					word: v.word,
					emotionEntryCount: v.emotionEntryCount,
					hasJoy: (v.joySum || 0) > 0,
					hasSadness: (v.sadnessSum || 0) > 0
				})),
				details: {
					words: emotionVectors.map(v => v.word),
					totalEmotionEntries: emotionVectors.reduce((sum, v) => sum + (v.emotionEntryCount || 0), 0),
					wordsWithEmotions: emotionVectors.filter(v => (v.emotionEntryCount || 0) > 0).length
				},
				error: emotionVectors.length === 0 ? 'データが空です' : undefined,
				lastUpdated: new Date()
			};
			
			// Timeline
			console.log('loadData: Fetching timeline...', { selectedParticipant, selectedSession });
			const tlStartTime = Date.now();
			debugState.timeline = { 
				status: 'loading', 
				message: 'タイムラインデータを読み込み中...',
				requestParams: { participantId: selectedParticipant, sessionId: selectedSession },
				lastUpdated: new Date()
			};
			allTimelineData = await fetchTimeline(selectedParticipant, selectedSession);
			const tlRequestTime = Date.now() - tlStartTime;
			console.log('loadData: timeline fetched', {
				count: allTimelineData.length,
				timeRange: allTimelineData.length > 0 ? {
					first: allTimelineData[0]?.time,
					last: allTimelineData[allTimelineData.length - 1]?.time
				} : null,
				uniqueWords: [...new Set(allTimelineData.map(t => t.word))],
				sample: allTimelineData.slice(0, 3)
			});
			const uniqueWords = [...new Set(allTimelineData.map(t => t.word))];
			const eventTypes = [...new Set(allTimelineData.map(t => t.eventType).filter(Boolean))];
			debugState.timeline = {
				status: allTimelineData.length > 0 ? 'success' : 'error',
				message: allTimelineData.length > 0
					? `タイムラインデータの読み込み完了 (${allTimelineData.length}件)`
					: 'タイムラインデータが取得できませんでした',
				count: allTimelineData.length,
				requestTime: tlRequestTime,
				responseSample: allTimelineData.slice(0, 3).map(t => ({
					time: t.time,
					word: t.word,
					eventType: t.eventType,
					hasResponse: t.hasResponse,
					emotionsCount: t.emotions?.length || 0
				})),
				details: {
					uniqueWords,
					eventTypes,
					timeRange: allTimelineData.length > 0 ? {
						first: allTimelineData[0]?.time,
						last: allTimelineData[allTimelineData.length - 1]?.time
					} : null,
					pointsWithEmotions: allTimelineData.filter(t => t.emotions && t.emotions.length > 0).length,
					pointsWithReactionValue: allTimelineData.filter(t => t.reactionValue != null).length
				},
				error: allTimelineData.length === 0 ? 'データが空です' : undefined,
				lastUpdated: new Date()
			};
			
			applyFilters();
			console.log('loadData: Filters applied', {
				timelineDataLength: timelineData.length,
				allTimelineDataLength: allTimelineData.length,
				filteredOut: allTimelineData.length - timelineData.length
			});
			
			// フィルタ後の結果も更新
			if (timelineData.length !== allTimelineData.length) {
				debugState.timeline = {
					...debugState.timeline,
					message: `タイムラインデータの読み込み完了 (全${allTimelineData.length}件、フィルタ後${timelineData.length}件)`,
					count: timelineData.length
				};
			}
			
			// データの整合性チェック
			console.log('loadData: Data consistency check:', {
				wordAggregatesCount: wordAggregates.length,
				emotionVectorsCount: emotionVectors.length,
				timelineCount: allTimelineData.length,
				matchedWords: wordAggregates.filter(w => emotionVectors.some(v => v.word === w.word)).length,
				timelineWords: [...new Set(allTimelineData.map(t => t.word))],
				aggregateWords: wordAggregates.map(w => w.word)
			});
		} catch (err: any) {
			debugState.wordAggregates = {
				status: 'error',
				message: '単語集計データの読み込みに失敗',
				error: err?.message || String(err)
			};
			debugState.emotionVectors = {
				status: 'error',
				message: '感情ベクトルデータの読み込みに失敗',
				error: err?.message || String(err)
			};
			debugState.timeline = {
				status: 'error',
				message: 'タイムラインデータの読み込みに失敗',
				error: err?.message || String(err)
			};
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
							navigateToTab('analysis', id);
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
											const responseCount = events.filter((e: any) => e.type === 'speech_detected').length || 0;
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
