<script lang="ts">
	import JungVoiceTest from '$lib/jung-voice-assessment/JungVoiceTest.svelte';

	function handleTestComplete(results: any) {
		console.log('Test completed:', results);
		// Handle test completion
	}
</script>

<div class="container mx-auto p-8">
	<h1 class="text-4xl font-bold mb-8">参加者アプリ - ユング音声評価テスト</h1>
	
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
		<JungVoiceTest numberOfWords={10} onTestComplete={handleTestComplete} />
	</div>
</div>
