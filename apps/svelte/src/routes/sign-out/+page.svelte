<script lang="ts">
	import { signOut } from '@clerk/sveltekit/client';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	onMount(() => {
		signOut(() => {
			goto('/');
		});
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p>サインアウト中...</p>
</div>
