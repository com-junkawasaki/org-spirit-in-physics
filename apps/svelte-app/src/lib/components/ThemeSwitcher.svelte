<script lang="ts">
	import { theme } from "$lib/theme.svelte";

	const modes = [
		{ value: 'light', icon: '☀️', label: 'Light' },
		{ value: 'dark', icon: '🌙', label: 'Dark' },
		{ value: 'system', icon: '🌓', label: 'Auto' }
	] as const;
</script>

<div class="theme-switcher">
	{#each modes as { value, icon, label }}
		<button
			class="theme-btn {theme.current === value ? 'active' : ''}"
			onclick={() => theme.set(value)}
			title="{label} Mode"
		>
			<span class="icon">{icon}</span>
		</button>
	{/each}
</div>

<style>
	.theme-switcher {
		display: flex;
		background: rgba(0, 0, 0, 0.05);
		padding: 2px;
		border-radius: 12px;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .theme-switcher {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem 0.6rem;
		border-radius: 10px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
	}

	:global(.dark) .theme-btn {
		color: #aaa;
	}

	.theme-btn.active {
		background: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .theme-btn.active {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.theme-btn:hover:not(.active) {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(.dark) .theme-btn:hover:not(.active) {
		background: rgba(255, 255, 255, 0.03);
	}
</style>
