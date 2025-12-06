<script lang="ts">
	import { onMount } from 'svelte';
	import JungVoiceTest from '$lib/jung-voice-assessment/JungVoiceTest.svelte';
	import { kawasakiStore } from '$lib/jung-voice-assessment';
	
	let initialized = false;
	
	onMount(() => {
		kawasakiStore.initializeParticipant();
		initialized = true;
	});

	function handleTestComplete(results: any) {
		console.log('Test completed:', results);
		// Handle test completion
	}
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">参加者アプリ - ユング音声評価テスト</h1>
	
	{#if initialized}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
			<JungVoiceTest numberOfWords={10} onTestComplete={handleTestComplete} />
		</div>
	{:else}
		<div class="flex items-center justify-center p-8">
			<p>初期化中...</p>
		</div>
	{/if}
</div>
