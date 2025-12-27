<script lang="ts">
	import { ClerkProvider } from "svelte-clerk";
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import "../app.css";

	let { children } = $props();

	onMount(() => {
		// #region agent log
		fetch('http://127.0.0.1:7247/ingest/dd38c440-a27e-40c0-b740-1186fa2e0e03', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				location: 'routes/+layout.svelte',
				message: 'Frontend Layout Mounted',
				hypothesisId: 'C',
				data: { 
					url: window.location.href,
					pathname: window.location.pathname,
					pageUrl: page.url.toString()
				},
				timestamp: Date.now(),
				sessionId: 'debug-session-routing'
			})
		}).catch(() => {});
		// #endregion
	});
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
