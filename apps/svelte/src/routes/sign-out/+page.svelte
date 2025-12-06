<script lang="ts">
	import { useClerk } from 'svelte-clerk';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	const { signOut } = useClerk();
	
	onMount(async () => {
		await signOut();
		goto('/');
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p>サインアウト中...</p>
</div>
