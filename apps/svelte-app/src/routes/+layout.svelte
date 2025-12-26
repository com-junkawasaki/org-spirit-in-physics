<script>
	let { children } = $props();
</script>

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}
</style>
