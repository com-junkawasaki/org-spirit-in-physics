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
		background: transparent;
		padding: 2px;
		border-radius: 12px;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: 8px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
		opacity: 0.5;
	}

	.theme-btn:hover {
		opacity: 0.8;
		background: rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .theme-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.theme-btn.active {
		opacity: 1;
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .theme-btn.active {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
	}
</style>
