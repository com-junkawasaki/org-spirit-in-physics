<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	onMount(() => {
		goto('/');
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<p>サインアウトしました</p>
		<p class="text-sm text-gray-600 dark:text-gray-400 mt-2">ホームに戻ります...</p>
	</div>
</div>
