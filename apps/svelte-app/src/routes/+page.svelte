<script lang="ts">
	import { participantClient } from "$lib/connect";
	import type { Participant } from "@/generated/proto/participant/v1/participant_pb";
	import { onMount } from "svelte";

	let participants = $state<Participant[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await participantClient.getParticipants({});
			participants = response.participants;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	});
</script>

<div class="container">
	<h1>Spirit in Physics (Svelte 5 + CSR)</h1>

	{#if loading}
		<p>Loading participants...</p>
	{:else if error}
		<p class="error">Error: {error}</p>
	{:else}
		<ul>
			{#each participants as p}
				<li>{p.name} (Age: {p.age})</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.container {
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}
	.error {
		color: red;
	}
</style>
