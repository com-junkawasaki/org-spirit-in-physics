<script lang="ts">
	const {
		items = []
	}: {
		items: Array<{ label: string; href?: string }>;
	} = $props();
</script>

<nav class="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
	{#each items as item, index}
		{#if item.href && index < items.length - 1}
			<a href={item.href} class="text-blue-600 dark:text-blue-400 hover:underline">
				{item.label}
			</a>
			<span class="text-gray-400 dark:text-gray-500">/</span>
		{:else}
			<span class="text-gray-600 dark:text-gray-300 font-semibold">{item.label}</span>
		{/if}
	{/each}
</nav>

