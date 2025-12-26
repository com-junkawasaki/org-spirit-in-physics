<script lang="ts">
	import { participantClient } from "$lib/connect";
	import type { Participant } from "@/generated/proto/participant/v1/participant_pb";
	import { onMount } from "svelte";
	import { SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";

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

<svelte:head>
	<title>Spirit in Physics</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Spirit in Physics (Svelte 5 + CSR)</h1>
		<div class="auth">
			<SignedOut>
				<SignInButton mode="modal" class="btn">Sign in</SignInButton>
			</SignedOut>
			<SignedIn>
				<UserButton />
			</SignedIn>
		</div>
	</header>

	{#if loading}
		<p>Loading participants...</p>
	{:else if error}
		<p class="error">Error: {error}</p>
	{:else}
		<ul>
			{#each participants as p}
				<li>{p.id} (Public: {p.isPublic})</li>
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
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	.error {
		color: red;
	}
	.btn {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
