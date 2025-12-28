<script lang="ts">
	import { theme } from "$lib/theme.svelte";
</script>

<div class="flex items-center gap-1 p-1 rounded-lg border bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm dark:border-gray-700">
	<button
		class="px-2 py-1 rounded-md text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {theme.current === 'light' ? 'bg-gray-200 dark:bg-gray-600 font-bold' : ''}"
		onclick={() => theme.set('light')}
		title="Light Mode"
	>
		Sun
	</button>
	<button
		class="px-2 py-1 rounded-md text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {theme.current === 'dark' ? 'bg-gray-200 dark:bg-gray-600 font-bold' : ''}"
		onclick={() => theme.set('dark')}
		title="Dark Mode"
	>
		Moon
	</button>
	<button
		class="px-2 py-1 rounded-md text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {theme.current === 'system' ? 'bg-gray-200 dark:bg-gray-600 font-bold' : ''}"
		onclick={() => theme.set('system')}
		title="System Theme"
	>
		Auto
	</button>
</div>

