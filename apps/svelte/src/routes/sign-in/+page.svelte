<script lang="ts">
	import SignIn from '@clerk/sveltekit/client/SignIn.svelte';
</script>

<div class="flex min-h-screen items-center justify-center">
	<SignIn redirectUrl="/" />
</div>
