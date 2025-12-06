<script lang="ts">
	const {
		participants = [],
		totalSessions = 0,
		totalResponses = 0
	}: {
		participants?: any[];
		totalSessions?: number;
		totalResponses?: number;
	} = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
	<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
		<h3 class="text-lg font-semibold mb-2">参加者数</h3>
		<p class="text-3xl font-bold">{participants.length}</p>
	</div>
	<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
		<h3 class="text-lg font-semibold mb-2">総セッション数</h3>
		<p class="text-3xl font-bold">{totalSessions}</p>
	</div>
	<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
		<h3 class="text-lg font-semibold mb-2">総応答数</h3>
		<p class="text-3xl font-bold">{totalResponses}</p>
	</div>
</div>
