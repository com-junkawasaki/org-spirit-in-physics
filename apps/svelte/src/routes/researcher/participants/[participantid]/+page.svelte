<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Breadcrumb from '$lib/researcher/components/Breadcrumb.svelte';
	import {
		fetchParticipants,
		fetchSessions
	} from '$lib/researcher/graphql-client';
	
	let participantId = $derived($page.params.participantid);
	let participant: any = null;
	let sessions: any[] = [];
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	// デバッグ状態
	type DebugStatus = 'idle' | 'loading' | 'success' | 'error';
	interface DebugState {
		status: DebugStatus;
		message?: string;
		count?: number;
		error?: string;
		lastUpdated?: Date;
	}
	
	let debugState = $state<{
		participant: DebugState;
		sessions: DebugState;
	}>({
		participant: { status: 'idle' },
		sessions: { status: 'idle' }
	});
	
	onMount(async () => {
		if (!participantId) {
			error = '参加者IDが指定されていません';
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
			
			// セッション一覧を取得
			debugState.sessions = { status: 'loading', message: 'セッションを読み込み中...', lastUpdated: new Date() };
			sessions = await fetchSessions(participantId);
			debugState.sessions = {
				status: 'success',
				message: 'セッションの読み込み完了',
				count: sessions.length,
				lastUpdated: new Date()
			};
			
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
	
	function getResponseCount(session: any): number {
		const events = session.events || [];
		return events.filter((e: any) => e.type === 'speech_detected').length || 0;
	}
</script>

<div class="container mx-auto p-8">
	<Breadcrumb items={[
		{ label: '研究者', href: '/researcher' },
		{ label: participant?.id || participantId || '参加者' }
	]} />
	
	<h1 class="text-4xl font-bold mb-8">セッション一覧</h1>
	
	{#if loading}
		<div class="flex items-center justify-center p-8">
			<p>読み込み中...</p>
		</div>
	{:else if error}
		<div class="bg-red-100 dark:bg-red-900 p-4 rounded text-red-800 dark:text-red-200">
			{error}
		</div>
	{:else if participant}
		<div class="space-y-8">
			<!-- Participant Info -->
			<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
				<h2 class="text-2xl font-bold mb-4">参加者情報</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label class="text-sm font-semibold text-gray-600 dark:text-gray-400">ID</label>
						<p class="text-lg">{participant.id}</p>
					</div>
					{#if participant.age}
						<div>
							<label class="text-sm font-semibold text-gray-600 dark:text-gray-400">年齢</label>
							<p class="text-lg">{participant.age}歳</p>
						</div>
					{/if}
					{#if participant.gender}
						<div>
							<label class="text-sm font-semibold text-gray-600 dark:text-gray-400">性別</label>
							<p class="text-lg">{participant.gender}</p>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Sessions Table -->
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
				<h2 class="text-2xl font-bold mb-4 p-6 pb-0">セッション一覧 ({sessions.length}件)</h2>
				<table class="w-full">
					<thead class="bg-gray-100 dark:bg-gray-700">
						<tr>
							<th class="px-4 py-2 text-left">セッション番号</th>
							<th class="px-4 py-2 text-left">開始時刻</th>
							<th class="px-4 py-2 text-left">終了時刻</th>
							<th class="px-4 py-2 text-left">反応回数</th>
							<th class="px-4 py-2 text-left">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each sessions as session}
							<tr class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
								<td class="px-4 py-2">{session.sessionIndex ?? '-'}</td>
								<td class="px-4 py-2">
									{#if session.startTs}
										{new Date(session.startTs).toLocaleString()}
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-2">
									{#if session.endTs}
										{new Date(session.endTs).toLocaleString()}
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-2">{getResponseCount(session)}</td>
								<td class="px-4 py-2">
									<a
										href="/researcher/participants/{participantId}/sessions/{session.id}"
										class="text-blue-600 dark:text-blue-400 hover:underline"
									>
										分析を表示
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="px-4 py-8 text-center text-gray-500">
									セッションが見つかりません
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
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
						{#if debugState.participant.error}
							<div class="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
								{debugState.participant.error}
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

