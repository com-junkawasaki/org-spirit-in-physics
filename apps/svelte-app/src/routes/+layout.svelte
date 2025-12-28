<script lang="ts">
	import { ClerkProvider } from "svelte-clerk";
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from "$lib/env";
	import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
	import "../app.css";

	let { children } = $props();
</script>

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	<div class="fixed bottom-4 left-4 z-50">
		<ThemeSwitcher />
	</div>
	<main class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
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
