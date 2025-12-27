<script lang="ts">
	import { ClerkProvider } from "svelte-clerk";
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
	import "../app.css";

	let { children } = $props();
</script>

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	<main>
		{@render children()}
	</main>
</ClerkProvider>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}
</style>
