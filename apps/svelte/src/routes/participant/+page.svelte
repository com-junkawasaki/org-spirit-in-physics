<script lang="ts">
	import { kawasakiStore } from '$lib/jung-voice-assessment';
	import { onMount } from 'svelte';
	
	let initialized = false;
	
	onMount(() => {
		kawasakiStore.initializeParticipant();
		initialized = true;
	});
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">参加者アプリ</h1>
	{#if initialized}
		<div class="bg-gray-100 dark:bg-gray-800 p-4 rounded">
			<p>ユング音声評価テスト</p>
			<p>実装予定の機能:</p>
			<ul class="list-disc list-inside mt-2">
				<li>Clerk認証統合</li>
				<li>ユング音声評価テスト</li>
				<li>セッション管理</li>
				<li>データ保存</li>
			</ul>
		</div>
	{:else}
		<p>初期化中...</p>
	{/if}
</div>
