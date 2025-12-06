<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
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
	
	let allParticipants = $state<any[]>([]);
	let participants = $state<any[]>([]);
	let allSessions = $state<any[]>([]);
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
			// browser check for SSR compatibility
			if (browser) {
				const urlParams = new URLSearchParams($page.url.search);
				const tab = urlParams.get('tab');
				const participantId = urlParams.get('participantId');
				const sessionId = urlParams.get('sessionId');
			
				if (tab === 'analysis' && participantId) {
					// 分析ページにリダイレクト
					if (sessionId) {
						// セッションIDが指定されている場合はそのセッションにリダイレクト
						goto(`/researcher/participants/${participantId}/sessions/${sessionId}`, { replaceState: true });
						return;
					} else {
						// セッションIDが指定されていない場合は、その参加者の最初のセッションを探す
						const participantSessions = participantSessionsMap.get(participantId) || [];
						if (participantSessions.length > 0) {
							const firstSession = participantSessions[0];
							goto(`/researcher/participants/${participantId}/sessions/${firstSession.id}`, { replaceState: true });
							return;
						} else {
							// セッションがない場合はセッション一覧ページにリダイレクト
							goto(`/researcher/participants/${participantId}`, { replaceState: true });
							return;
						}
					}
				} else if (participantId && !tab) {
					// セッション一覧ページにリダイレクト
					goto(`/researcher/participants/${participantId}`, { replaceState: true });
					return;
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
